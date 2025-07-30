import inquirer from 'inquirer';
import { ICamera, ICameraInferenceDimensions } from './icamera';
import { Prophesee } from './prophesee';
import { GStreamer } from './gstreamer';
import { Imagesnap } from './imagesnap';
import { AudioRecorder } from './recorder';

export enum CameraType {
    PropheseeCamera = 'prophesee',
    ImagesnapCamera = 'imagesnap',
    GStreamerCamera = 'gstreamer',
    UnknownCamera = 'unknown',
}

export async function initCamera(opts: {
    cameraType: CameraType,
    cameraDeviceNameInConfig: string | undefined,
    cameraNameArgv: string | undefined,
    dimensions: { width: number, height: number } | undefined,
    inferenceDimensions: ICameraInferenceDimensions | undefined,
    gstLaunchArgs: string | undefined,
    verboseOutput: boolean
}) {
    const { cameraType, cameraDeviceNameInConfig, dimensions, inferenceDimensions,
        gstLaunchArgs, verboseOutput } = opts;
    let { cameraNameArgv } = opts;

    let camera: ICamera;
    if (cameraType === CameraType.PropheseeCamera) {
        camera = new Prophesee(verboseOutput);
    }
    else if (cameraType === CameraType.ImagesnapCamera) {
        camera = new Imagesnap(verboseOutput);
    }
    else if (cameraType === CameraType.GStreamerCamera) {
        camera = new GStreamer(verboseOutput, {
            customLaunchCommand: gstLaunchArgs,
            scaleAndCropInPipeline: true,
        });
    }
    else {
        throw new Error('Unsupported camera type "' + cameraType + '"');
    }

    await camera.init();

    let cameraDevice: string | undefined;
    const cameraDevices = await camera.listDevices();

    if (cameraNameArgv) {
        // we also want to index by device path (not always available)
        // cannot change the base interface here, because it's part of public API surface
        let cameras: { fullName: string, name: string, path: string | undefined }[] = [];
        for (const device of cameraDevices) {
            const fullName = device;
            let name: string = fullName;
            let path: string | undefined;
            if (device.indexOf('(') > -1 && device.endsWith(')')) {
                // has path
                path = device.slice(device.lastIndexOf('(') + 1, device.length - 1);
                name = device.slice(0, device.lastIndexOf('(')).trim();
            }
            cameras.push({ fullName, name, path });
        }

        // First try to find by fullName, then path, then name
        let found: string | undefined = ([
            cameras.find(d => d.fullName === cameraNameArgv)?.fullName,
            cameras.find(d => d.path === cameraNameArgv)?.fullName,
            cameras.find(d => d.name === cameraNameArgv)?.fullName,
        ]).filter(x => !!x)[0];

        if (found) {
            // We have match, override the argv
            cameraNameArgv = found;
        }
        else {
            throw new Error(`"--camera ${cameraNameArgv}" passed in, but cannot find camera with that name. ` +
                `Available cameras: ${cameraDevices.length > 0 ? cameraDevices.map(c => `"${c}"`).join(', ') : `None`}. ` +
                `Omit --camera to auto-select cameras.`);
        }
    }

    if (cameraDevices.length === 0) {
        throw new Error('Cannot find any webcams');
    }

    const cameraDeviceName = cameraNameArgv || cameraDeviceNameInConfig;

    if (cameraDeviceName && cameraDevices.find(d => d === cameraDeviceName)) {
        cameraDevice = cameraDeviceName;
    }
    else if (cameraDevices.length === 1) {
        cameraDevice = cameraDevices[0];
    }
    else {
        let inqRes = await inquirer.prompt([{
            type: 'list',
            choices: (cameraDevices || []).map(p => ({ name: p, value: p })),
            name: 'camera',
            message: 'Select a camera',
            pageSize: 20
        }]);
        cameraDevice = <string>inqRes.camera;
    }

    // TODO: move this message out of the camera init function
    // console.log(RUNNER_PREFIX, 'Using camera', cameraDevice, 'starting...');

    await camera.start({
        device: cameraDevice,
        intervalMs: 0, // no artificial wait
        dimensions: dimensions,
        inferenceDimensions: inferenceDimensions,
    });

    return camera;
}

export async function initMicrophone(opts: {
    audioDeviceNameInConfig: string | undefined,
    audioNameArgv: string | undefined,
}) {
    const { audioDeviceNameInConfig, audioNameArgv } = opts;

    let audioDevice: string | undefined;

    const audioDevices = await AudioRecorder.ListDevices();

    if (audioNameArgv) {
        if (!audioDevices.find(d => d.id === audioNameArgv)) {
            throw new Error(`"--microphone ${audioNameArgv}" passed in, but cannot find microphones with that name. ` +
                `Available microphones: ${audioDevices.length > 0 ? audioDevices.map(c => `"${c.id}"`).join(', ') : `None`}. ` +
                `Omit --microphone to auto-select microphones.`);
        }
    }

    if (audioDevices.length === 0) {
        throw new Error('Cannot find any microphones, run this command with --disable-microphone to skip selection');
    }

    const audioDeviceName = audioNameArgv || audioDeviceNameInConfig;

    if (audioDeviceName && audioDevices.find(d => d.id === audioDeviceName)) {
        audioDevice = audioDeviceName;
    }
    else if (audioDevices.length === 1) {
        audioDevice = audioDevices[0].id;
    }
    else {
        let inqRes = await inquirer.prompt([{
            type: 'list',
            choices: (audioDevices || []).map(p => ({ name: p.name, value: p.id })),
            name: 'microphone',
            message: 'Select a microphone',
            pageSize: 20
        }]);
        audioDevice = <string>inqRes.microphone;
    }

    return audioDevice;
}