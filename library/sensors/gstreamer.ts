import { spawn, exec, ChildProcess } from 'child_process';
import { EventEmitter } from 'tsee';
import fs from 'fs';
import Path from 'path';
import os from 'os';
import { spawnHelper, SpawnHelperType } from './spawn-helper';
import { ICamera, ICameraInferenceDimensions, ICameraStartOptions } from './icamera';
import util from 'util';
import crypto from 'crypto';
import { split as argvSplit } from '../argv-split';
import { FitEnum } from 'sharp';
import { RunnerHelloResponseModelParameters } from '../classifier/linux-impulse-runner';

const PREFIX = '\x1b[34m[GST]\x1b[0m';

type GStreamerCap = {
    type: 'video/x-raw' | 'image/jpeg' | 'nvarguscamerasrc' | 'pylonsrc',
    width: number,
    height: number,
    framerate: number,
};

type GStreamerDevice = {
    name: string,
    rawCaps: string[],
    deviceClass: string,
    inCapMode: boolean,
    id: string,
    caps: GStreamerCap[],
    videoSource: string,
};

export type GStreamerMode = 'default' | 'rpi' | 'microchip';

const CUSTOM_GST_LAUNCH_COMMAND = 'custom-gst-launch-command';
const DEFAULT_GST_VIDEO_SOURCE = 'v4l2src';

export class GStreamer extends EventEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void,
    error: (message: string) => void
}> implements ICamera {
    private _captureProcess?: ChildProcess;
    private _tempDir?: string;
    private _watcher?: fs.FSWatcher;
    private _handledFiles: { [k: string]: true } = { };
    private _verbose: boolean;
    private _lastHash = '';
    private _processing = false;
    private _lastOptions?: ICameraStartOptions;
    private _mode: GStreamerMode = 'default';
    private _modeOverride: GStreamerMode | undefined;
    private _keepAliveTimeout: NodeJS.Timeout | undefined;
    private _isStarted = false;
    private _isRestarting = false;
    private _spawnHelper: SpawnHelperType;
    private _customLaunchCommand: string | undefined;
    private _scaleAndCropInPipeline: boolean;

    constructor(verbose: boolean, options?: {
        spawnHelperOverride?: SpawnHelperType,
        customLaunchCommand?: string,
        modeOverride?: GStreamerMode,
        // Default: false, if set to true then scaling/cropping is done inside the GStreamer pipeline
        // this affects "snapshot" events (which will be scaled to the inference resolution rather
        // than the original resolution, if scaling in the pipeline is supported) but is faster.
        scaleAndCropInPipeline?: boolean,
    }) {
        super();

        this._verbose = verbose;
        this._customLaunchCommand = options?.customLaunchCommand;
        this._spawnHelper = options?.spawnHelperOverride || spawnHelper;
        this._modeOverride = options?.modeOverride;
        this._scaleAndCropInPipeline = typeof options?.scaleAndCropInPipeline === 'boolean' ?
            options.scaleAndCropInPipeline :
            false;
    }

    async init() {
        try {
            await this._spawnHelper('which', [ 'gst-launch-1.0' ]);
        }
        catch (ex) {
            throw new Error('Missing "gst-launch-1.0" in PATH. Install via `sudo apt install -y gstreamer1.0-tools gstreamer1.0-plugins-good gstreamer1.0-plugins-base gstreamer1.0-plugins-base-apps`');
        }
        try {
            await this._spawnHelper('which', [ 'gst-device-monitor-1.0' ]);
        }
        catch (ex) {
            throw new Error('Missing "gst-device-monitor-1.0" in PATH. Install via `sudo apt install -y gstreamer1.0-tools gstreamer1.0-plugins-good gstreamer1.0-plugins-base gstreamer1.0-plugins-base-apps`');
        }

        let osRelease;
        if (await this.exists('/etc/os-release')) {
            console.log(PREFIX, 'checking for /etc/os-release');
            osRelease = await fs.promises.readFile('/etc/os-release', 'utf-8');
        }

        let firmwareModel;
        // using /proc/device-tree as recommended in user space.
        if (await this.exists('/proc/device-tree/model')) {
            firmwareModel = await fs.promises.readFile('/proc/device-tree/model', 'utf-8');
        }

        if (osRelease) {
            if ((osRelease.indexOf('bullseye') > -1)
                || (osRelease.indexOf('bookworm') > -1)) {

                if (osRelease.indexOf('ID=raspbian') > -1) {
                    this._mode = 'rpi';
                }

                if (firmwareModel && firmwareModel.indexOf('Raspberry Pi') > -1) {
                    this._mode = 'rpi';
                }
            }
        }

        if (firmwareModel && firmwareModel.indexOf('Microchip SAMA7G5') > -1) {
            this._mode = 'microchip';
        }

        this._mode = (this._modeOverride) ? this._modeOverride : this._mode;
    }

    async listDevices(): Promise<string[]> {
        if (this._customLaunchCommand) {
            return [ CUSTOM_GST_LAUNCH_COMMAND ];
        }

        let devices = await this.getAllDevices();

        if (this._verbose) {
            console.log(PREFIX, 'Found devices:', JSON.stringify(devices, null, 2));
        }

        return devices.map(d => d.name);
    }

    async start(options: ICameraStartOptions) {
        if (this._captureProcess) {
            throw new Error('Capture was already started');
        }

        this._lastOptions = options;

        this._handledFiles = { };

        let dimensions = options.dimensions || { width: 640, height: 480 };

        // if we have /dev/shm, use that (RAM backed, instead of SD card backed, better for wear)
        let osTmpDir = os.tmpdir();
        if (await this.exists('/dev/shm')) {
            osTmpDir = '/dev/shm';
        }

        this._tempDir = await fs.promises.mkdtemp(Path.join(osTmpDir, 'edge-impulse-cli'));
        const device = (await this.getAllDevices()).find(d => d.name === options.device);
        if (!device) {
            throw new Error('Invalid device ' + options.device);
        }
        if (device.caps.length === 0) {
            throw new Error('Could not find resolution info for this device');
        }

        if (device.name === 'RZG2L_CRU') {
            // run commands to initialize the Coral camera on Renesas
            if (this._verbose) {
                console.log(PREFIX, 'Detected RZ/G2L target, initializing camera...');
            }
            await spawnHelper('media-ctl', [ '-d', '/dev/media0', '-r' ]);
            await spawnHelper('media-ctl', [ '-d', '/dev/media0', '-l', "'rzg2l_csi2 10830400.csi2':1 -> 'CRU output':0 [1]" ]);
            await spawnHelper('media-ctl', [ '-d', '/dev/media0', '-V', "'rzg2l_csi2 10830400.csi2':1 [fmt:UYVY8_2X8/640x480 field:none]" ]);
            await spawnHelper('media-ctl', [ '-d', '/dev/media0', '-V', "'ov5645 0-003c':0 [fmt:UYVY8_2X8/640x480 field:none]" ]);
            if (this._verbose) {
                console.log(PREFIX, 'Detected RZ/G2L target, initializing camera OK');
            }
        }

        const { invokeProcess, command, args } = await this.getGstreamerLaunchCommand(
            device, dimensions, options.inferenceDimensions);

        if (this._verbose) {
            console.log(PREFIX, `Starting ${command} with`, args);
        }

        if (invokeProcess === 'spawn') {
            this._captureProcess = spawn(command, args, { env: process.env, cwd: this._tempDir });
        }
        else if (invokeProcess === 'exec') {
            this._captureProcess = exec(command + ' ' + args.join(' '), { env: process.env, cwd: this._tempDir });
        }
        else {
            throw new Error('Invalid value for invokeProcess');
        }

        if (this._captureProcess && this._captureProcess.stdout && this._captureProcess.stderr &&
            this._verbose) {
            this._captureProcess.stdout.on('data', (d: Buffer) => {
                console.log(PREFIX, d.toString('utf-8'));
            });
            this._captureProcess.stderr.on('data', (d: Buffer) => {
                console.log(PREFIX, d.toString('utf-8'));
            });
        }

        let lastPhoto = 0;
        let nextFrame = Date.now();

        this._watcher = fs.watch(this._tempDir, async (eventType, fileName) => {
            if (eventType !== 'rename') return;
            if (fileName === null) return;
            if (!(fileName.endsWith('.jpeg') || fileName.endsWith('.jpg'))) return;
            if (!this._tempDir) return;
            if (this._handledFiles[fileName]) return;

            // not next frame yet?
            if (this._processing || Date.now() < nextFrame) {
                this._handledFiles[fileName] = true;
                if (await this.exists(Path.join(this._tempDir, fileName))) {
                    await fs.promises.unlink(Path.join(this._tempDir, fileName));
                }
                return;
            }

            nextFrame = Date.now() + options.intervalMs;

            try {
                this._processing = true;
                this._handledFiles[fileName] = true;

                if (lastPhoto !== 0 && this._verbose) {
                    console.log(PREFIX, 'Got snapshot', fileName, 'time since last:',
                        (Date.now() - lastPhoto) + 'ms.', 'size');
                }

                if (this._keepAliveTimeout) {
                    clearTimeout(this._keepAliveTimeout);
                }

                try {
                    let data = await fs.promises.readFile(Path.join(this._tempDir, fileName));

                    // hash not changed? don't emit another event (streamer does this on Rpi)
                    let hash = crypto.createHash('sha256').update(data).digest('hex');
                    if (hash !== this._lastHash) {
                        this.emit('snapshot', data, Path.basename(fileName));
                        lastPhoto = Date.now();

                        // 2 seconds no new data? trigger timeout
                        if (this._keepAliveTimeout) {
                            clearTimeout(this._keepAliveTimeout);
                        }
                        this._keepAliveTimeout = setTimeout(() => {
                            // eslint-disable-next-line @typescript-eslint/no-floating-promises
                            this.timeoutCallback();
                        }, 2000);
                    }
                    else if (this._verbose) {
                        console.log(PREFIX, 'Discarding', fileName, 'hash does not differ');
                    }
                    this._lastHash = hash;
                }
                catch (ex) {
                    console.error('Failed to load file', Path.join(this._tempDir, fileName), ex);
                }

                if (await this.exists(Path.join(this._tempDir, fileName))) {
                    await fs.promises.unlink(Path.join(this._tempDir, fileName));
                }
            }
            finally {
                this._processing = false;
            }
        });

        let p = new Promise<void>((resolve, reject) => {
            if (this._captureProcess) {
                let cp = this._captureProcess;

                let onCaptureProcessCloseCount = 0;

                const onCaptureProcessClose = async (code: number) => {
                    try {
                        if (this._keepAliveTimeout) {
                            clearTimeout(this._keepAliveTimeout);
                        }

                        if (typeof code === 'number') {
                            // if code is 255 and device id is qtiqmmfsrc, it means the camera is not available
                            // try restart on first close only
                            if (code === 255 && device.id.startsWith('qtiqmmfsrc') && onCaptureProcessCloseCount === 0) {
                                // restart cam-server systemctl service
                                console.log(PREFIX, 'Camera is not available, restarting cam-server service...');

                                await spawnHelper('systemctl', [ 'restart', 'cam-server' ]);

                                console.log(PREFIX, 'Camera is not available, restarting cam-server service OK');

                                if (invokeProcess === 'spawn') {
                                    this._captureProcess = spawn(command, args,
                                        { env: process.env, cwd: this._tempDir });
                                }
                                else if (invokeProcess === 'exec') {
                                    this._captureProcess = exec(command + ' ' + args.join(' '), { env: process.env, cwd: this._tempDir });
                                }
                                else {
                                    throw new Error(`invokeProcess is neither "spawn" or "exec" ("${invokeProcess}")`);
                                }

                                this._captureProcess.on('close', onCaptureProcessClose);
                                return;
                            }
                            else {
                                reject('Capture process failed with code ' + code);
                            }
                        }
                        else {
                            reject('Failed to start capture process, but no exit code. ' +
                                'This might be a permissions issue. ' +
                                'Are you running this command from a simulated shell (like in Visual Studio Code)?');
                        }

                        // already started and we're the active process?
                        if (this._isStarted && cp === this._captureProcess && !this._isRestarting) {
                            this.emit('error', 'gstreamer process was killed with code (' + code + ')');
                        }

                        this._captureProcess = undefined;
                    }
                    catch (ex2) {
                        const ex = <Error>ex2;
                        reject(`Failed to start capture process, gstreamer process was killed with code (${code}): ` +
                            (ex.message || ex.toString()));
                    }
                    finally {
                        onCaptureProcessCloseCount++;
                    }
                };

                this._captureProcess.on('close', onCaptureProcessClose);
            }

            void (async () => {
                if (!this._tempDir) {
                    throw new Error('tempDir is undefined');
                }

                const watcher = fs.watch(this._tempDir, () => {
                    this._isStarted = true;
                    resolve();
                    watcher.close();
                });

                setTimeout(async () => {
                    if (this._keepAliveTimeout) {
                        clearTimeout(this._keepAliveTimeout);
                    }

                    return reject('First photo was not created within 20 seconds');
                }, 20000);
            })();
        });

        p.catch(() => this.stop());

        return p;
    }

    async getGstreamerLaunchCommand(device: {
            id: string,
            name: string,
            caps: GStreamerCap[],
            videoSource: string
        },
        dimensions: { width: number, height: number },
        inferenceDims: ICameraInferenceDimensions | undefined,
    ) {

        if (device.id === CUSTOM_GST_LAUNCH_COMMAND) {
            if (!this._customLaunchCommand) {
                throw new Error('_customLaunchCommand is null');
            }
            let customArgs = argvSplit(this._customLaunchCommand);
            customArgs = customArgs.concat([
                `!`,
                `multifilesink`,
                `location=test%05d.jpg`
            ]);

            return {
                invokeProcess: 'spawn',
                command: 'gst-launch-1.0',
                args: customArgs,
            };
        }

        // now we need to determine the resolution... we want something as close as possible to dimensions.widthx480
        let caps = device.caps.filter(c => {
            return c.width >= dimensions.width && c.height >= dimensions.height;
        }).sort((a, b) => {
            let diffA = Math.abs(a.width - dimensions.width) + Math.abs(a.height - dimensions.height);
            let diffB = Math.abs(b.width - dimensions.width) + Math.abs(b.height - dimensions.height);

            return diffA - diffB;
        });

        // if the device supports video/x-raw, only list those types
        const videoCaps = caps.filter(x => x.type === 'video/x-raw');
        if (videoCaps.length > 0) {
            caps = videoCaps;
        }

        // choose the top of the list
        let cap = caps[0];

        if (!cap) {
            cap = {
                type: 'video/x-raw',
                width: dimensions.width,
                height: dimensions.height,
                framerate: 30,
            };
        }

        let videoSource = [ device.videoSource, 'device=' + device.id ];

        if ((this._mode === 'rpi') || (this._mode === 'microchip')) {
            // Rpi camera
            if ((!device.id)
                || (device.name.indexOf('unicam') > -1)
                || (device.name.indexOf('bcm2835-isp') > -1)) {
                videoSource = [ 'libcamerasrc' ];
                const hasPlugin = await this.hasGstPlugin('libcamerasrc');
                if (!hasPlugin) {
                    throw new Error('Missing "libcamerasrc" gstreamer element. Install via `sudo apt install -y gstreamer1.0-libcamera`');
                }
            }
        }

        if (device.id === 'pylonsrc') {
            videoSource = [ 'pylonsrc' ];
        }
        else if (device.id.startsWith('qtiqmmfsrc')) {
            videoSource = device.videoSource.split(' ');
        }

        let cropArgs: string[] = [];
        if (inferenceDims && this._scaleAndCropInPipeline) {
            // fast path for fit-shortest and squash
            if (inferenceDims.width === inferenceDims.height && inferenceDims.resizeMode === 'fit-shortest') {
                const crop = this.determineSquareCrop(cap);
                cropArgs.push(`!`);
                if (crop.type === 'landscape') {
                    cropArgs = cropArgs.concat([
                        `videocrop`, `left=${crop.left}`, `right=${crop.right}`,
                        `!`,
                        `videoscale`, `method=lanczos`,
                        `!`,
                    ]);
                }
                else if (crop.type === 'portrait') {
                    cropArgs = cropArgs.concat([
                        `videocrop`, `top=${crop.top}`, `bottom=${crop.bottom}`,
                        `!`,
                        `videoscale`, `method=lanczos`,
                        `!`,
                    ]);
                }
                cropArgs.push(`video/x-raw,width=${inferenceDims.width},height=${inferenceDims.height}`);
            }
            else if (inferenceDims.resizeMode === 'squash' || inferenceDims.resizeMode === 'none' /* old model */) {
                cropArgs.push(`!`);
                cropArgs.push(`videoscale`, `method=lanczos`);
                cropArgs.push(`!`);
                cropArgs.push(`video/x-raw,width=${inferenceDims.width},height=${inferenceDims.height}`);
            }
        }

        let invokeProcess: 'spawn' | 'exec';
        let args: string[];
        if ((cap.type === 'video/x-raw') || (cap.type === 'pylonsrc')) {

            if (this._mode === 'rpi' && device.name.indexOf('arducam') > -1) {
                videoSource = videoSource.concat([
                    `!`,
                    `video/x-raw,width=${cap.width},height=${cap.height},format=YUY2`
                    ]);
            }
            else {
                videoSource = videoSource.concat([
                    `!`,
                    `video/x-raw,width=${cap.width},height=${cap.height}`
                ]);
            }

            args = videoSource.concat([
                `!`,
                `videoconvert`,
                ...cropArgs,
                `!`,
                `jpegenc`,
                `!`,
                `multifilesink`,
                `location=test%05d.jpg`
            ]);
            invokeProcess = 'spawn';
        }
        else if (cap.type === 'image/jpeg') {
            args = videoSource.concat([
                `!`,
                `image/jpeg,width=${cap.width},height=${cap.height}`,
                `!`,
                `multifilesink`,
                `location=test%05d.jpg`
            ]);
            invokeProcess = 'spawn';
        }
        else if (cap.type === 'nvarguscamerasrc') {
            args = [
                `nvarguscamerasrc ! "video/x-raw(memory:NVMM),width=${cap.width},height=${cap.height}" ! ` +
                    `nvvidconv flip-method=0 ! video/x-raw,width=${cap.width},height=${cap.height} ! nvvidconv ! ` +
                    `jpegenc ! multifilesink location=test%05d.jpg`
            ];
            // no idea why... but if we throw this thru `spawn` this yields an invalid pipeline...
            invokeProcess = 'exec';
        }
        else {
            throw new Error('Invalid cap type ' + cap.type);
        }

        return {
            invokeProcess,
            command: 'gst-launch-1.0',
            args,
        };
    }

    async stop() {
        if (this._keepAliveTimeout) {
            clearTimeout(this._keepAliveTimeout);
        }

        let stopRes = new Promise<void>((resolve) => {
            if (this._captureProcess) {
                this._captureProcess.on('close', code => {
                    if (this._watcher) {
                        this._watcher.on('close', async () => {
                            if (this._tempDir) {
                                const files = await fs.promises.readdir(this._tempDir);
                                const imageFiles = files.filter(file => {
                                    const fileExt = Path.extname(file).toLowerCase();
                                    return (fileExt === 'jpg' || fileExt === 'jpeg');
                                });

                                for (const file of imageFiles) {
                                    await fs.promises.unlink(Path.join(this._tempDir, file));
                                }
                            }
                        });
                        this._watcher.close();
                    }
                    resolve();
                });
                this._captureProcess.kill('SIGINT');
                setTimeout(() => {
                    if (this._captureProcess) {
                        this._captureProcess.kill('SIGHUP');
                    }
                }, 3000);
            }
            else {
                resolve();
            }
        });

        // set isStarted to false
        stopRes
            .then(() => { this._isStarted = false; })
            .catch(() => { this._isStarted = false; });

        return stopRes;
    }

    async getAllDevices(): Promise<{
        id: string,
        name: string,
        caps: GStreamerCap[],
        videoSource: string
    }[]> {
        if (this._customLaunchCommand) {
            let width = 640;
            let height = 480;

            let widthM = CUSTOM_GST_LAUNCH_COMMAND.match(/width=(\d+)/);
            if (widthM && widthM.length >= 1) {
                width = Number(widthM[1]);
            }
            let heightM = CUSTOM_GST_LAUNCH_COMMAND.match(/height=(\d+)/);
            if (heightM && heightM.length >= 1) {
                height = Number(heightM[1]);
            }

            return [{
                id: CUSTOM_GST_LAUNCH_COMMAND,
                name: CUSTOM_GST_LAUNCH_COMMAND,
                caps: [{
                    type: 'video/x-raw',
                    framerate: 60,
                    width: width,
                    height: height,
                }],
                videoSource: DEFAULT_GST_VIDEO_SOURCE,
            }];
        }

        let lines;
        try {
            lines = (await this._spawnHelper('gst-device-monitor-1.0', []))
                .split('\n').filter(x => !!x).map(x => x.trim());
        }
        catch (ex2) {
            const ex = <Error>ex2;
            const message = ex.message || ex.toString();

            if (typeof message === 'string' && ((message.indexOf('Failed to start device monitor') > -1) ||
                                                (message.indexOf('Failed to query video capabilities') > -1))) {
                if (this._verbose) {
                    console.log(PREFIX, 'Failed to start gst-device-monitor-1.0, retrying with only video sources...');
                }
                lines = (await this._spawnHelper('gst-device-monitor-1.0',
                        [ 'Video/Source', 'Source/Video', 'Video/CameraSource' ]))
                    .split('\n').filter(x => !!x).map(x => x.trim());
            }
            else {
                throw ex;
            }
        }

        let devices: GStreamerDevice[] = [];

        let currDevice: GStreamerDevice | undefined;

        for (let l of lines) {
            if (l === 'Device found:') {
                if (currDevice) {
                    devices.push(currDevice);
                }
                currDevice = {
                    name: '',
                    deviceClass: '',
                    rawCaps: [],
                    inCapMode: false,
                    id: '',
                    videoSource: DEFAULT_GST_VIDEO_SOURCE,
                    caps: []
                };
                continue;
            }

            if (!currDevice) continue;

            if (l.startsWith('name  :')) {
                currDevice.name = l.split(':')[1].trim();
                continue;
            }
            if (l.startsWith('class :')) {
                currDevice.deviceClass = l.split(':')[1].trim();
                continue;
            }
            if (l.startsWith('caps  :')) {
                let cap = l.split(':')[1].trim();
                currDevice.rawCaps.push(cap);
                currDevice.inCapMode = true;
                continue;
            }
            if (l.startsWith('properties:')) {
                currDevice.inCapMode = false;
                continue;
            }
            if (currDevice.inCapMode) {
                currDevice.rawCaps.push(l);
            }
            if (l.startsWith('device.path =')) {
                currDevice.id = l.split('=')[1].trim();
            }

            if(l.startsWith('api.v4l2.path =') && currDevice.id === '') {
                currDevice.id = l.split('=')[1].trim();
            }

            if (l.startsWith('gst-launch-1.0 ')) {
                const videoSource = l.split(' ')[1].trim();
                if (videoSource !== '...') {

                    // Can be in the form a.b,
                    // e.g uvch264src.vfsrc
                    currDevice.videoSource = videoSource.split('.')[0].trim();

                    if (currDevice.videoSource === 'pipewiresrc') {
                        currDevice.videoSource = DEFAULT_GST_VIDEO_SOURCE;
                    }
                }
            }
        }

        if (currDevice) {
            devices.push(currDevice);
        }

        for (let d of devices) {
            let c: GStreamerCap[] =
                d.rawCaps.filter(x => x.startsWith('video/x-raw') || x.startsWith('image/jpeg')).map(l => {
                    let width = (l.match(/width=[^\d]+(\d+)/) || [])[1];
                    let height = (l.match(/height=[^\d]+(\d+)/) || [])[1];
                    let framerate = (l.match(/framerate=[^\d]+(\d+)/) || [])[1];

                    // Rpi on bullseye has lines like this..
                    // eslint-disable-next-line @stylistic/max-len
                    // image/jpeg, width=160, height=120, pixel-aspect-ratio=1/1, framerate={ (fraction)30/1, (fraction)24/1, (fraction)20/1, (fraction)15/1, (fraction)10/1, (fraction)15/2, (fraction)5/1 }
                    if (!width) {
                        width = (l.match(/width=(\d+)/) || [])[1];
                    }
                    if (!height) {
                        height = (l.match(/height=(\d+)/) || [])[1];
                    }
                    if (!framerate) {
                        framerate = (l.match(/framerate=(\d+)/) || [])[1];
                    }

                    let r: GStreamerCap = {
                        type: l.startsWith('video/x-raw') ? 'video/x-raw' : 'image/jpeg',
                        width: Number(width || '0'),
                        height: Number(height || '0'),
                        framerate: Number(framerate || '0'),
                    };
                    return r;
                });

            if (this._mode === 'rpi' || this._mode === 'microchip') { // no framerate here...
                c = c.filter(x => x.width && x.height);
            }
            else if (d.name === 'RZG2L_CRU') {
                // so here we always parse 320x240, but 640x480 is also fine
                c = c.filter(x => x.width && x.height).map(x => {
                    if (x.width === 320) {
                        x.width = 640;
                    }
                    if (x.height === 240) {
                        x.height = 480;
                    }
                    return x;
                });
            }
            else {
                c = c.filter(x => x.width && x.height && x.framerate);
            }

            c = c.reduce((curr: GStreamerCap[], o) => {
                // deduplicate caps
                if (!curr.some(obj => obj.framerate === o.framerate &&
                        obj.width === o.width &&
                        obj.height === o.height &&
                        obj.framerate === o.framerate)) {
                    curr.push(o);
                }
                return curr;
            }, []);


            d.caps = c;
        }

        devices = devices.filter(d => {
            return (d.deviceClass === 'Video/Source' ||
                d.deviceClass === 'Source/Video' ||
                d.deviceClass === 'Video/CameraSource') &&
                d.caps.length > 0;
        });

        // NVIDIA has their own plugins, query them too
        devices = devices.concat(await this.listNvarguscamerasrcDevices());
        devices = devices.concat(await this.listPylonsrcDevices());
        // Qualcomm has their own plugin, query its too
        devices = devices.concat(await this.listQtiqmmsrcDevices());

        let mapped = devices.map(d => {
            let name = d.id ?
                d.name + ' (' + d.id + ')' :
                d.name;

            return {
                id: d.id,
                name: name,
                caps: d.caps,
                videoSource: d.videoSource,
            };
        });

        // deduplicate (by id)
        mapped = mapped.reduce((curr: { id: string, name: string, caps: GStreamerCap[], videoSource: string}[], m) => {
            if (curr.find(x => x.id === m.id)) return curr;
            curr.push(m);
            return curr;
        }, []);

        return mapped;
    }

    private async hasGstPlugin(plugin: string): Promise<boolean> {
        let hasPlugin: boolean;
        try {
            hasPlugin = (await this._spawnHelper('gst-inspect-1.0', [])).indexOf(plugin) > -1;
        }
        catch (ex) {
            if (this._verbose) {
                console.log(PREFIX, 'Error invoking gst-inspect-1.0:', ex);
            }
            hasPlugin = false;
        }
        return hasPlugin;
    }

    private async listNvarguscamerasrcDevices(): Promise<GStreamerDevice[]> {

        const hasPlugin: boolean = await this.hasGstPlugin('nvarguscamerasrc');
        if (!hasPlugin) {
            return [];
        }

        let caps: GStreamerCap[] = [];

        let gstLaunchRet;

        // not overridden spawn helper?
        if (this._spawnHelper === spawnHelper) {
            gstLaunchRet = await new Promise<string>((resolve, reject) => {
                let command = 'gst-launch-1.0';
                let args = [ 'nvarguscamerasrc' ];
                let opts = { ignoreErrors: true };

                const p = spawn(command, args, { env: process.env });

                let allData: Buffer[] = [];

                p.stdout.on('data', (data: Buffer) => {
                    allData.push(data);

                    if (data.toString('utf-8').indexOf('No cameras available') > -1) {
                        p.kill('SIGINT');
                        resolve(Buffer.concat(allData).toString('utf-8'));
                    }
                });

                p.stderr.on('data', (data: Buffer) => {
                    allData.push(data);

                    if (data.toString('utf-8').indexOf('No cameras available') > -1) {
                        p.kill('SIGINT');
                        resolve(Buffer.concat(allData).toString('utf-8'));
                    }
                });

                p.on('error', reject);

                p.on('close', (code) => {
                    if (code === 0 || opts.ignoreErrors === true) {
                        resolve(Buffer.concat(allData).toString('utf-8'));
                    }
                    else {
                        reject('Error code was not 0: ' + Buffer.concat(allData).toString('utf-8'));
                    }
                });
            });
        }
        else {
            let command = 'gst-launch-1.0';
            let args = [ 'nvarguscamerasrc' ];
            let opts = { ignoreErrors: true };
            gstLaunchRet = await this._spawnHelper(command, args, opts);
        }

        let lines = gstLaunchRet.split('\n').filter(x => !!x).map(x => x.trim());

        lines = lines.filter(x => x.startsWith('GST_ARGUS:'));

        if (this._verbose) {
            console.log(PREFIX, 'gst-launch-1.0 nvarguscamerasrc options', lines.join('\n'));
        }

        for (let l of lines) {
            let m = l.match(/^GST_ARGUS: (\d+)(?:\s*)x(?:\s*)(\d+).*?=(?:\s*)([\d,\.]+)(?:\s*)fps/);
            if (!m) {
                continue;
            }

            let cap: GStreamerCap = {
                framerate: Number(m[3].replace(',', '.')),
                height: Number(m[2]),
                width: Number(m[1]),
                type: 'nvarguscamerasrc'
            };

            if (!isNaN(cap.width) && !isNaN(cap.height) && !isNaN(cap.framerate)) {
                caps.push(cap);
            }
        }

        if (caps.length > 0) {
            let d: GStreamerDevice = {
                caps: caps,
                deviceClass: '',
                id: 'nvarguscamerasrc',
                inCapMode: false,
                name: 'CSI camera',
                rawCaps: [],
                videoSource: 'nvarguscamerasrc',
            };
            return [ d ];
        }
        else {
            return [];
        }
    }

    private async listPylonsrcDevices(): Promise<GStreamerDevice[]> {

        const hasPlugin: boolean = await this.hasGstPlugin('pylonsrc');
        if (!hasPlugin) {
            return [];
        }

        let caps: GStreamerCap[] = [];

        let gstInspectRet;
        {
            let command = 'gst-inspect-1.0';
            let args = [ 'pylonsrc' ];
            let opts = { ignoreErrors: true };

            // not overridden spawn helper?
            if (this._spawnHelper === spawnHelper) {
                gstInspectRet = await new Promise<string>((resolve, reject) => {
                    const p = spawn(command, args, { env: process.env });

                    let allData: Buffer[] = [];

                    p.stdout.on('data', (data: Buffer) => {
                        allData.push(data);

                        if (data.toString('utf-8').indexOf('No devices found') > -1) {
                            p.kill('SIGINT');
                            resolve(Buffer.concat(allData).toString('utf-8'));
                        }
                    });

                    p.stderr.on('data', (data: Buffer) => {
                        allData.push(data);

                        if (data.toString('utf-8').indexOf('No devices found') > -1) {
                            p.kill('SIGINT');
                            resolve(Buffer.concat(allData).toString('utf-8'));
                        }
                    });

                    p.on('error', reject);

                    p.on('close', (code) => {
                        if (code === 0 || opts.ignoreErrors === true) {
                            resolve(Buffer.concat(allData).toString('utf-8'));
                        }
                        else {
                            reject('Error code was not 0: ' + Buffer.concat(allData).toString('utf-8'));
                        }
                    });
                });
            }
            else {
                gstInspectRet = await this._spawnHelper(command, args, opts);
            }
        }

        let gstInspectLines = gstInspectRet.split('\n');
        let inRoiWidth = false;
        let inRoiHeight = false;
        let currProp: string[] = [];
        let expectedIndent = 0;
        let defaultWidth = 1920;
        let defaultHeight = 1080;
        // find AutoFunctionROIWidth-ROI1 and AutoFunctionROIHeight-ROI1
        for (const line of gstInspectLines) {
            let currIndent = line.split(/\w+/)[0].length;

            if (line.indexOf('AutoFunctionROIWidth-ROI1') > -1) {
                inRoiWidth = true;
                expectedIndent = currIndent;
                currProp = [ line ];
                continue;
            }
            else if (line.indexOf('AutoFunctionROIHeight-ROI1') > -1) {
                inRoiHeight = true;
                expectedIndent = currIndent;
                currProp = [ line ];
                continue;
            }

            if (inRoiWidth) {
                if (currIndent === expectedIndent) {
                    let roiWidth = currProp.join('\n');
                    if (this._verbose) {
                        console.log(PREFIX, 'AutoFunctionROIWidth-ROI1:\n', roiWidth);
                    }
                    let m = roiWidth.match(/Default\: (\d+)/);
                    if (m) {
                        defaultWidth = Number(m[1]);
                    }

                    inRoiWidth = false;
                }
                else {
                    currProp.push(line);
                }
            }

            if (inRoiHeight) {
                if (currIndent === expectedIndent) {
                    let roiHeight = currProp.join('\n');
                    if (this._verbose) {
                        console.log(PREFIX, 'AutoFunctionROIHeight-ROI1:\n', roiHeight);
                    }
                    let m = roiHeight.match(/Default\: (\d+)/);
                    if (m) {
                        defaultHeight = Number(m[1]);
                    }

                    inRoiHeight = false;
                }
                else {
                    currProp.push(line);
                }
            }
        }

        // console.log('gstInspectRes', gstInspectRet);

        let gstLaunchRet;
        {
            let command = 'gst-launch-1.0';
            let args = [ 'pylonsrc' ];
            let opts = { ignoreErrors: true };

            // not overridden spawn helper?
            if (this._spawnHelper === spawnHelper) {
                gstLaunchRet = await new Promise<string>((resolve, reject) => {
                    const p = spawn(command, args, { env: process.env });

                    let allData: Buffer[] = [];

                    p.stdout.on('data', (data: Buffer) => {
                        allData.push(data);

                        if (data.toString('utf-8').indexOf('No devices found') > -1) {
                            p.kill('SIGINT');
                            resolve(Buffer.concat(allData).toString('utf-8'));
                        }
                    });

                    p.stderr.on('data', (data: Buffer) => {
                        allData.push(data);

                        if (data.toString('utf-8').indexOf('No devices found') > -1) {
                            p.kill('SIGINT');
                            resolve(Buffer.concat(allData).toString('utf-8'));
                        }
                    });

                    p.on('error', reject);

                    p.on('close', (code) => {
                        if (code === 0 || opts.ignoreErrors === true) {
                            resolve(Buffer.concat(allData).toString('utf-8'));
                        }
                        else {
                            reject('Error code was not 0: ' + Buffer.concat(allData).toString('utf-8'));
                        }
                    });
                });
            }
            else {
                gstLaunchRet = await this._spawnHelper(command, args, opts);
            }
        }

        let lines = gstLaunchRet.split('\n').filter(x => !!x).map(x => x.trim());

        if (this._verbose) {
            console.log(PREFIX, 'gst-launch-1.0 pylonsrc options', lines.join('\n'));
        }

        for (let l of lines) {
            let m = l.match(/New clock: GstSystemClock/);
            if (!m) {
                continue;
            }

            // fps,height and width won't be used
            let cap: GStreamerCap = {
                framerate: 60,
                height: defaultHeight,
                width: defaultWidth,
                type: 'pylonsrc'
            };

            caps.push(cap);
        }

        if (caps.length > 0) {
            let d: GStreamerDevice = {
                caps: caps,
                deviceClass: '',
                id: 'pylonsrc',
                inCapMode: false,
                name: 'Basler camera',
                rawCaps: [],
                videoSource: 'pylonsrc',
            };
            return [ d ];
        }
        else {
            return [];
        }
    }

    private async listQtiqmmsrcDevices(): Promise<GStreamerDevice[]> {

        const hasPlugin: boolean = await this.hasGstPlugin('qtiqmmfsrc');
        if (!hasPlugin) {
            return [];
        }

        let caps: GStreamerCap[] = [];
        let cap: GStreamerCap = {
            type: 'video/x-raw',
            width: 1280,
            height: 720,
            framerate: 30,
        };
        caps.push(cap);

        let d: GStreamerDevice[] = [
            {
                caps: caps,
                deviceClass: '',
                id: 'qtiqmmfsrc-0',
                inCapMode: false,
                name: 'Camera 0 (High-resolution, fisheye, IMX577)',
                rawCaps: [],
                videoSource: 'qtiqmmfsrc name=camsrc camera=0',
            },
            {
                caps: caps,
                deviceClass: '',
                id: 'qtiqmmfsrc-1',
                inCapMode: false,
                name: 'Camera 1 (Low-resolution, OV9282)',
                rawCaps: [],
                videoSource: 'qtiqmmfsrc name=camsrc camera=1',
            }
        ];

        return d;
    }

    getLastOptions() {
        return this._lastOptions;
    }

    private async exists(path: string) {
        let exists = false;
        try {
            await util.promisify(fs.stat)(path);
            exists = true;
        }
        catch (ex) {
            /* noop */
        }
        return exists;
    }

    private async timeoutCallback() {
        try {
            this._isRestarting = true;

            if (this._verbose) {
                console.log(PREFIX, 'No images received for 2 seconds, restarting...');
            }
            await this.stop();
            if (this._verbose) {
                console.log(PREFIX, 'Stopped');
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
            if (this._lastOptions) {
                if (this._verbose) {
                    console.log(PREFIX, 'Starting gstreamer...');
                }
                await this.start(this._lastOptions);
                if (this._verbose) {
                    console.log(PREFIX, 'Restart completed');
                }
            }
            else {
                this.emit('error', 'gstreamer process went stale');
            }
        }
        catch (ex2) {
            let ex = <Error>ex2;
            this.emit('error', 'gstreamer failed to restart: ' + (ex.message || ex.toString()));
        }
        finally {
            this._isRestarting = false;
        }
    }

    determineSquareCrop({ width, height }: { width: number; height: number }):
        { type: 'landscape', left: number; right: number } |
        { type: 'portrait', top: number; bottom: number } |
        { type: 'none' } {
         // no crop needed
        if (width === height) return { type: 'none' };

        if (width > height) {
            const diff = width - height;
            const left  = Math.floor(diff / 2);
            const right = diff - left;
            return { type: 'landscape', left, right };
        }
        else {
            const diff  = height - width;
            const top    = Math.floor(diff / 2);
            const bottom = diff - top;
            return { type: 'portrait', top, bottom };
        }
    }
}
