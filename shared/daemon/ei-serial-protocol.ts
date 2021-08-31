// tslint:disable: no-console

import TypedEmitter from 'typed-emitter';
import { ISerialConnector } from './iserialconnector';
import { EventEmitter } from './events';

const CON_PREFIX = '\x1b[34m[SER]\x1b[0m';

export enum EiSerialWifiSecurity {
    EI_SECURITY_NONE         = 0x0,      /*!< open access point */
    EI_SECURITY_WEP          = 0x1,      /*!< phrase conforms to WEP */
    EI_SECURITY_WPA          = 0x2,      /*!< phrase conforms to WPA */
    EI_SECURITY_WPA2         = 0x3,      /*!< phrase conforms to WPA2 */
    EI_SECURITY_WPA_WPA2     = 0x4,      /*!< phrase conforms to WPA/WPA2 */
    EI_SECURITY_PAP          = 0x5,      /*!< phrase conforms to PPP authentication context */
    EI_SECURITY_CHAP         = 0x6,      /*!< phrase conforms to PPP authentication context */
    EI_SECURITY_EAP_TLS      = 0x7,      /*!< phrase conforms to EAP-TLS */
    EI_SECURITY_PEAP         = 0x8,      /*!< phrase conforms to PEAP */
    EI_SECURITY_UNKNOWN      = 0xFF,     /*!< unknown/unsupported security in scan results */
}

export interface EiSerialDeviceConfig {
    info: {
        id: string;
        type: string;
        atCommandVersion: {
            major: number;
            minor: number;
            patch: number;
        };
        transferBaudRate: number | undefined;
    };
    sensors: {
        name: string;
        maxSampleLengthS: number;
        frequencies: number[];
    }[];
    snapshot: {
        hasSnapshot: boolean;
        supportsStreaming: boolean;
        colorDepth: 'RGB' | 'Grayscale';
        resolutions: {
            width: number,
            height: number
        }[]
    };
    wifi: {
        present: boolean;
        ssid: string;
        password: string;
        security: EiSerialWifiSecurity;
        connected: boolean;
    };
    sampling: {
        label: string;
        interval: number;
        length: number;
        hmacKey: string;
    };
    upload: {
        apiKey: string;
        host: string;
        path: string;
    };
    management: {
        url: string;
        connected: boolean;
        lastError: string;
    };
}

export interface EiSerialWifiNetwork {
    ssid: string;
    security: EiSerialWifiSecurity;
    securityString: string;
    rssi: number;
    line: string;
}

export type EiStartSamplingResponse = TypedEmitter<{
    samplingStarted: () => void,
    processing: () => void,
    uploading: () => void,
    readingFromDevice: (progressPercentage: number) => void,
    done: (ev: EiSerialDone) => void,
    error: (ex: string) => void
}>;

export type EiSnapshotResponse = TypedEmitter<{
    started: () => void,
    readingFromDevice: (progressPercentage: number) => void,
    done: (data: Buffer) => void,
    error: (ex: string) => void
}>;

export interface EiSerialDoneFs { filename: string; onDeviceFileName: string; file?: Buffer; }
export interface EiSerialDoneBuffer {
    filename: string;
    onDeviceFileName: string;
    file: Buffer;
    label: string;
}

export type EiSerialDone = EiSerialDoneFs | EiSerialDoneBuffer;

export default class EiSerialProtocol {
    private _serial: ISerialConnector;
    private _config: EiSerialDeviceConfig | undefined;

    /**
     *
     * @param serial An instance of the serial connector
     */
    constructor(serial: ISerialConnector) {
        this._serial = serial;
    }

    async onConnected() {
        // tslint:disable-next-line:no-floating-promises
        this._serial.write(Buffer.from('b\r', 'ascii'));

        await this.waitForSerialSequence('onConnected', Buffer.from([ 0x3e, 0x20 ]), 5000);
    }

    async clearConfig() {
        await this.execCommand('AT+CLEARCONFIG', 10000);
    }

    async getConfig() {
        let data = await this.execCommand('AT+CONFIG?', 2000);

        let config = <EiSerialDeviceConfig>{ info: { }, wifi: { }, sampling: { }, upload: { }, management: { } };
        config.sensors = [];
        config.info.atCommandVersion = { major: 1, minor: 0, patch: 0 };
        config.wifi.present = true;
        config.snapshot = {
            hasSnapshot: false,
            supportsStreaming: false,
            colorDepth: 'Grayscale', // only 1.4.0 devices are Himax which are all grayscale
            resolutions: []
        };

        let section: 'info' | 'sensors' | 'wifi' | 'sampling' | 'upload' | 'management' | 'snapshot' | undefined;

        for (let line of data.split('\n').map(l => l.trim()).filter(l => !!l)) {
            if (line.indexOf('= Device info =') > -1) {
                section = 'info';
                continue;
            }
            if (line.indexOf('= Sensors =') > -1) {
                section = 'sensors';
                continue;
            }
            if (line.indexOf('= Snapshot =') > -1) {
                section = 'snapshot';
                continue;
            }
            if (line.indexOf('= WIFI =') > -1) {
                section = 'wifi';
                continue;
            }
            if (line.indexOf('= Sampling parameters =') > -1) {
                section = 'sampling';
                continue;
            }
            if (line.indexOf('= Upload settings =') > -1) {
                section = 'upload';
                continue;
            }
            if (line.indexOf('= Remote management =') > -1) {
                section = 'management';
                continue;
            }
            if (!section) {
                continue;
            }

            let [ key, ...valueArr ] = line.split(':').map(v => v.trim());
            let value = valueArr.join(':');
            key = key.toLowerCase();

            if (section === 'info') {
                if (key === 'id') {
                    config.info.id = value; continue;
                }
                if (key === 'type') {
                    config.info.type = value; continue;
                }
                if (key === 'at version') {
                    let [ major, minor, patch ] = value.split('.').map(n => Number(n));

                    config.info.atCommandVersion = { major, minor, patch }; continue;
                }
                if (key === 'data transfer baudrate') {
                    let r = Number(value);
                    if (!isNaN(r)) {
                        if (this._serial.canSwitchBaudRate()) {
                            config.info.transferBaudRate = r;
                        }
                    }
                    continue;
                }
            }
            if (section === 'sensors') {
                // there are two formats here... either the new format:
                // Name: Built-in accelerometer, Max sample length: 300s, Frequencies: [62.50Hz, 100.00Hz]
                // or the old format which only lists the name...

                let newFormat = line.match(/^Name\:\s?([^,]+),\s?Max sample length\:\s?([^,]+)s\s?,\s?Frequencies\:\s?\[(.*)\]\s?$/);
                if (newFormat && newFormat.length === 4) {
                    let [ _, name, maxSampleLengthS, frequencies ] = newFormat;
                    config.sensors.push({
                        name: name,
                        maxSampleLengthS: Number(maxSampleLengthS),
                        frequencies: frequencies.split(',').map(f => f.replace('Hz', '').trim()).map(f => Number(f))
                    });
                }
                else {
                    if (line.trim() === 'Built-in accelerometer') {
                        config.sensors.push({
                            name: line.trim(),
                            maxSampleLengthS: 5 * 60,
                            frequencies: [ 62.5, 100 ]
                        });
                    }
                    else if (line.trim() === 'Built-in microphone') {
                        config.sensors.push({
                            name: line.trim(),
                            maxSampleLengthS: 1 * 60,
                            frequencies: [ 16000 ]
                        });
                    }
                    else {
                        throw new Error('Cannot parse sensor line: ' + line);
                    }
                }
                continue;
            }
            if (section === 'snapshot') {
                if (key === 'has snapshot') {
                    config.snapshot.hasSnapshot = value === '1' ? true : false; continue;
                }
                if (key === 'supports stream') {
                    config.snapshot.supportsStreaming = value === '1' ? true : false; continue;
                }
                if (key === 'color depth') {
                    if (value !== 'Grayscale' && value !== 'RGB') {
                        throw new Error('Invalid value for "Color depth" (Snapshot section): ' + value + ', ' +
                            'should be either "RGB" or "Grayscale"');
                    }
                    config.snapshot.colorDepth = value;
                    continue;
                }
                if (key === 'resolutions') {
                    config.snapshot.resolutions = [];
                    let allR = value.replace('[', '').replace(']', '').split(',').map(x => x.trim());
                    for (let r of allR) {
                        let [ width, height ] = r.split('x').map(n => Number(n));
                        if (!isNaN(width) && !isNaN(height)) {
                            config.snapshot.resolutions.push({
                                width, height
                            });
                        }
                        else {
                            console.warn('Failed to parse snapshot line', value);
                        }
                    }
                    continue;
                }
            }
            if (section === 'wifi') {
                if (key === 'present') {
                    config.wifi.present = value === '1' ? true : false; continue;
                }
                if (key === 'ssid') {
                    config.wifi.ssid = value; continue;
                }
                if (key === 'password') {
                    config.wifi.password = value; continue;
                }
                if (key === 'security') {
                    config.wifi.security = Number(value); continue;
                }
                if (key === 'connected') {
                    config.wifi.connected = value === '1'; continue;
                }
                if (key === 'mac') {
                    continue;
                }
            }
            if (section === 'sampling') {
                if (key === 'label') {
                    config.sampling.label = value; continue;
                }
                if (key === 'interval') {
                    config.sampling.interval = Number(value.replace(' ms.', '')); continue;
                }
                if (key === 'length') {
                    config.sampling.length = Number(value.replace(' ms.', '')); continue;
                }
                if (key === 'hmac key') {
                    config.sampling.hmacKey = value; continue;
                }
            }
            if (section === 'upload') {
                if (key === 'api key') {
                    config.upload.apiKey = value; continue;
                }
                if (key === 'host') {
                    config.upload.host = value; continue;
                }
                if (key === 'path') {
                    config.upload.path = value; continue;
                }
            }
            if (section === 'management') {
                if (key === 'url') {
                    config.management.url = value; continue;
                }
                if (key === 'connected') {
                    config.management.connected = value === '1'; continue;
                }
                if (key === 'last error') {
                    config.management.lastError = value; continue;
                }
            }

            console.warn(CON_PREFIX, 'Unhandled configuration option', section, key, value);
        }

        this._config = config;

        return config;
    }

    async setDeviceID(deviceId: string) {
        let res = await this.execCommand('AT+DEVICEID=' + deviceId);
        // console.log(CON_PREFIX, 'upload res', Buffer.from(res, 'utf8').toString('hex'));
        if (res.indexOf('OK') === -1) {
            throw new Error('Failed to set device ID: ' + res);
        }
    }

    async setUploadSettings(apiKey: string, url: string) {
        let res = await this.execCommand('AT+UPLOADSETTINGS=' + apiKey + ',' + url);
        // console.log(CON_PREFIX, 'upload res', Buffer.from(res, 'utf8').toString('hex'));
        if (res.indexOf('OK') === -1) {
            throw new Error('Failed to set upload settings: ' + res);
        }
    }

    async setUploadHost(host: string) {
        let res = await this.execCommand('AT+UPLOADHOST=' + host);
        // console.log(CON_PREFIX, 'upload res', res);
        if (res.indexOf('OK') === -1) {
            throw new Error('Failed to set upload host: ' + res);
        }
    }

    async setSampleSettings(label: string, interval: number, length: number, hmacKey: string) {
        let res = await this.execCommand(`AT+SAMPLESETTINGS=${label},${interval},${length},${hmacKey}`);
        if (res.indexOf('OK') === -1) {
            throw new Error('Failed to set sample settings: ' + res);
        }

        if (this._config) {
            this._config.sampling.label = label;
            this._config.sampling.interval = interval;
            this._config.sampling.length = length;
            this._config.sampling.hmacKey = hmacKey;
        }
    }

    async setWifi(ssid: string, password: string, security: EiSerialWifiSecurity) {
        let res = await this.execCommand(`AT+WIFI=${ssid},${password},${Number(security)}`, 10000);
        // console.log(CON_PREFIX, 'setWifi reply', res);
        if (res.indexOf('OK') === -1) {
            throw new Error('Failed to set sample settings: ' + res);
        }
    }

    async scanWifi() {
        let ret: EiSerialWifiNetwork[] = [];

        let res = await this.execCommand(`AT+SCANWIFI`, 10000);

        for (let line of res.split('\n').map(l => l.trim()).filter(l => !!l)) {
            // this would be a good candidate for a unit test
            let [ none, ssid, security, rssi ] = line.split(/(?:(?:SSID|Security|RSSI)\:)/)
                .map(l => l.trim()).map(l => l.replace(/[,\:]$/, ''));

            ret.push({
                ssid: ssid,
                security: Number((security.match(/\((\d+)\)/) || [])[1]),
                securityString: security.split(' ')[0],
                rssi: Number(rssi.replace(' dBm', '')),
                line: line
            });
        }

        return ret;
    }

    async setRemoteManagement(url: string) {
        let res = await this.execCommand(`AT+MGMTSETTINGS=${url}`);
        if (res.indexOf('OK') === -1) {
            throw new Error('Failed to set remote management settings: ' + res);
        }
    }

    startSampling(sensor: string | undefined, length: number): EiStartSamplingResponse {
        let cmd = sensor ? 'AT+SAMPLESTART=' + sensor : 'AT+SAMPLESTART';

        let ee = new EventEmitter() as TypedEmitter<{
            samplingStarted: () => void,
            processing: () => void,
            uploading: () => void,
            readingFromDevice: (progressPercentage: number) => void,
            done: (ev: EiSerialDone) => void,
            error: (ex: string) => void
        }>;

        let allListeners = [
            this.getSerialSequenceCallback('Sampling...', length * 3, b => {
                console.log(CON_PREFIX, 'Sampling started');
                ee.emit('samplingStarted');
            }),
            this.getSerialSequenceCallback('Done sampling', length * 3, b => {
                console.log(CON_PREFIX, 'Sampling done');
            }),
            this.getSerialSequenceCallback('Processing...', length * 3, b => {
                console.log(CON_PREFIX, 'Processing started');
                ee.emit('processing');
            }),
            this.getSerialSequenceCallback('Done processing', length * 3, b => {
                console.log(CON_PREFIX, 'Processing done');
            }),
            this.getSerialSequenceCallback('Uploading...', length * 3, b => {
                console.log(CON_PREFIX, 'Uploading started');
                ee.emit('uploading');
            }),
        ];

        // tslint:disable-next-line: no-floating-promises
        (async () => {
            try {
                let res = await this.execCommand(cmd, length * 10);

                if (res.indexOf('ERR:') > -1) {
                    let errLine = res.split('\n').map(l => l.trim()).find(l => l.indexOf('ERR:') > -1);

                    console.log(CON_PREFIX, 'Sampling failed', errLine || res);
                    throw new Error(errLine || res);
                }

                // console.log('after upload res is', res);

                let fileNameLine = res.split('\n').filter(t => t.indexOf('File name:') > -1)[0];
                if (!fileNameLine) {
                    console.log(CON_PREFIX, 'Could not find file name line in sample response', res);
                    throw new Error('Could not find file name line in sample response ' + res);
                }

                let filename = fileNameLine.split(':').map(s => s.trim())[1];

                // not connected, well, then we'll do it for you
                if (res.indexOf('Not uploading file') > -1) {
                    if (res.indexOf('Used buffer') > -1) {
                        let props = res.match(/from=(\d+).*?to=(\d+).*?/);
                        if (!props) {
                            throw new Error('Device used buffer, but could not parse buffer info ' + res);
                        }

                        if (!this._config) throw new Error('No last known configuration');

                        let [
                            line,
                            from,
                            to,
                        ] = props;

                        let expectedBytes = Math.floor(4 * ((Number(to) - Number(from)) / 3));
                        let bytesReceived = 0;
                        let lastSentDate = Date.now();

                        ee.emit('readingFromDevice', Math.floor((bytesReceived / expectedBytes) * 100));

                        console.log(CON_PREFIX, 'Device not connected to WiFi directly, reading from buffer (bytes ' +
                            from + ' - ' + to + ', expecting to read ~' + expectedBytes + ' bytes...');

                        const onProgressEv = (data: Buffer) => {
                            bytesReceived += data.toString('ascii').length;

                            let pct = Math.floor((bytesReceived / expectedBytes) * 100);
                            // send progress update every 1 second...
                            if (Date.now() - lastSentDate >= 1000) {
                                console.log(CON_PREFIX, 'Reading ' + pct + '% complete...');
                                ee.emit('readingFromDevice', pct);
                                lastSentDate = Date.now();
                            }
                        };

                        this._serial.on('data', onProgressEv);

                        let rfa = await this.execCommandAutoSwitchBaudRate(
                            'AT+READBUFFER=' + from + ',' + to, length * 10, false);

                        this._serial.off('data', onProgressEv);

                        console.log(CON_PREFIX, 'Reading from buffer OK');

                        let rf = Buffer.from(rfa, 'base64');
                        console.log(CON_PREFIX, 'File is', rf.length, 'bytes after decoding');
                        ee.emit('done', {
                            filename: this.basename(filename),
                            onDeviceFileName: filename,
                            file: rf,
                            label: this._config.sampling.label,
                        });
                    }
                    else {
                        if (!this._config) throw new Error('No last known configuration');

                        ee.emit('readingFromDevice', -1);

                        console.log(CON_PREFIX, 'Device not connected to WiFi directly, reading ' + filename + '...');

                        let rfa = await this.execCommandAutoSwitchBaudRate('AT+READFILE=' + filename,
                            length * 10, true);

                        console.log(CON_PREFIX, 'Reading ' + filename + ' OK');

                        let rf: Buffer;

                        if (this._config.info.atCommandVersion.major === 1 &&
                            this._config.info.atCommandVersion.minor < 2) {
                            rf = Buffer.from(rfa, 'hex');
                        }
                        else {
                            rf = Buffer.from(rfa, 'base64');
                        }
                        console.log(CON_PREFIX, 'File is', rf.length, 'bytes after decoding');
                        ee.emit('done', { filename: this.basename(filename), onDeviceFileName: filename, file: rf });
                    }
                }
                else {
                    ee.emit('done', { filename: this.basename(filename), onDeviceFileName: filename });
                }
            }
            catch (ex2) {
                let ex = <Error>ex2;
                ee.emit('error', ex.message || ex.toString());
            }
            finally {
                for (let l of allListeners) {
                    l.cancelListener();
                }
            }
        })();

        return ee;
    }

    async unlink(file: string) {
        let res = await this.execCommand(`AT+UNLINKFILE=${file}`);
        if (res.trim() !== '') {
            throw new Error('Failed to unlink file: ' + res);
        }
    }

    async takeSnapshot(width: number, height: number): Promise<EiSnapshotResponse> {
        if (!this._config) {
            throw new Error('Config is null');
        }
        let command = 'AT+SNAPSHOT=' + width + ',' + height;
        let timeout = 70000;
        let logProgress = false;
        let totalBytes = width * height * (this._config.snapshot.colorDepth === 'RGB' ? 3 : 1);
        let expectedBytes = Math.floor(4 * ((totalBytes) / 3));

        let ee = new EventEmitter() as TypedEmitter<{
            started: () => void,
            readingFromDevice: (progressPercentage: number) => void,
            done: (data: Buffer) => void,
            error: (ex: string) => void
        }>;

        // tslint:disable-next-line: no-floating-promises
        (async () => {

            let bytesReceived = 0;
            let lastSentDate = Date.now();

            const onProgressEv = (data: Buffer) => {
                bytesReceived += data.toString('ascii').length;

                let pct = Math.floor((bytesReceived / expectedBytes) * 100);
                // send progress update every 1 second...
                if (Date.now() - lastSentDate >= 1000) {
                    console.log(CON_PREFIX, 'Reading ' + pct + '% complete...');
                    ee.emit('readingFromDevice', pct);
                    lastSentDate = Date.now();
                }
            };

            try {
                ee.emit('readingFromDevice', Math.floor((bytesReceived / expectedBytes) * 100));

                this._serial.on('data', onProgressEv);

                let res = await this.execCommandAutoSwitchBaudRate(command, timeout, logProgress, ee);

                this._serial.off('data', onProgressEv);

                if (res.startsWith('ERR:')) {
                    throw new Error('Failed to take snapshot: ' + res);
                }
                let lines = res.split('\n').map(x => x.trim())
                    .filter(x => !!x)
                    .filter(x => x.toLocaleLowerCase() !== 'ok')
                    .filter(x => x.toLocaleLowerCase() !== 'okok');

                let last = lines[lines.length - 1];
                ee.emit('done', Buffer.from(last, 'base64'));
            }
            catch (ex2) {
                let ex = <Error>ex2;
                ee.emit('error', ex.message || ex.toString());
            }
            finally {
                this._serial.off('data', onProgressEv);
            }
        })();

        return ee;
    }

    async stopInference() {
        await this._serial.write(Buffer.from('b\r', 'ascii'));

        await this.waitForSerialSequence('Stop inference', Buffer.from([ 0x3e, 0x20 ]), 5000);
    }

    async startInference(mode: 'normal' | 'debug' | 'continuous') {
        let command = 'AT+RUNIMPULSE';
        if (mode === 'debug') {
            command += 'DEBUG';
        }
        else if (mode === 'continuous') {
            command += 'CONT';
        }

        command += '\r';

        // split it up a bit for pacing
        for (let ix = 0; ix < command.length; ix += 5) {
            // console.log(CON_PREFIX, 'writing', command.substr(ix, 5));
            if (ix !== 0) {
                await this.sleep(20);
            }

            await this._serial.write(Buffer.from(command.substr(ix, 5), 'ascii'));
        }
    }

    async startSnapshotStream() {
        if (!this._config || !this._config.snapshot.supportsStreaming) {
            throw new Error('Device does not support snapshot streaming');
        }

        let smallest = Array.from(this._config.snapshot.resolutions)
            .sort((a, b) => a.width * a.height - b.width * b.height)[0];
        if (!smallest) {
            throw new Error('Could not find resolution');
        }

        let command = 'AT+SNAPSHOTSTREAM=' + smallest.width + ',' + smallest.height;
        let { useMaxBaudRate, updatedCommand } = this.shouldUseMaxBaudrate(command);

        command = updatedCommand + `\r`;

        let onData: (buffer: Buffer) => void | undefined;

        let ret = {
            ee: new EventEmitter() as TypedEmitter<{
                snapshot: (b: Buffer, w: number, h: number) => void,
                error: (err: string) => void
            }>,
            stop: async () => {
                if (onData) {
                    this._serial.off('data', onData);
                }

                // tslint:disable-next-line:no-floating-promises
                await this._serial.write(Buffer.from('b\r', 'ascii'));

                if (useMaxBaudRate) {
                    await this.waitForSerialSequence(
                        command, Buffer.from([ 0x0d, 0x0a, 0x4f, 0x4b ]), 5000, false);

                    await this._serial.setBaudRate(115200);
                }

                await this.waitForSerialSequence(command, Buffer.from([ 0x3e, 0x20 ]), 5000);
            }
        };

        // split it up a bit for pacing
        for (let ix = 0; ix < command.length; ix += 5) {
            // console.log(CON_PREFIX, 'writing', command.substr(ix, 5));
            if (ix !== 0) {
                await this.sleep(20);
            }

            await this._serial.write(Buffer.from(command.substr(ix, 5), 'ascii'));
        }

        if (useMaxBaudRate && this._config.info.transferBaudRate) {
            await this.waitForSerialSequence(command, Buffer.from([ 0x0d, 0x0a, 0x4f, 0x4b ]), 1000, false);

            await this._serial.setBaudRate(this._config.info.transferBaudRate);
        }

        // tslint:disable-next-line: no-floating-promises
        (async () => {
            let currDataLine = '';

            onData = data => {
                currDataLine += data.toString('ascii');

                let endOfLineIx = currDataLine.indexOf('\r');
                if (endOfLineIx > -1) {
                    let line = currDataLine.slice(0, endOfLineIx).trim();

                    if (line.startsWith('ERR:')) {
                        ret.ee.emit('error', line);
                        this._serial.off('data', onData);
                        return;
                    }

                    currDataLine = currDataLine.slice(endOfLineIx + 1);

                    if (line.startsWith('Image resolution:') || line.startsWith('Starting snapshot')) {
                        return;
                    }
                    else if (line.length < 100) {
                        // console.log(CON_PREFIX, 'Invalid snapshot line: ' + line);
                    }
                    else {
                        ret.ee.emit('snapshot', Buffer.from(line, 'base64'), smallest.width, smallest.height);
                    }
                }
            };

            this._serial.on('data', onData);
        })();

        return ret;
    }

    private sleep(ms: number) {
        return new Promise((res) => setTimeout(res, ms));
    }

    private async execCommand(command: string, timeout: number = 1000, logProgress: boolean = false) {
        command = command + '\r';

        // split it up a bit for pacing
        for (let ix = 0; ix < command.length; ix += 5) {
            // console.log(CON_PREFIX, 'writing', command.substr(ix, 5));
            if (ix !== 0) {
                await this.sleep(20);
            }

            if (!this._serial.isConnected()) {
                return '';
            }
            await this._serial.write(Buffer.from(command.substr(ix, 5), 'ascii'));
        }

        let data = await this.waitForSerialSequence(command, Buffer.from([ 0x3e, 0x20 ]), timeout, logProgress);
        data = this.parseSerialResponse(data);

        if (data.toString('ascii').trim().indexOf('Not a valid AT command') > -1) {
            throw new Error('Error when communicating with device: ' + data.toString('ascii').trim());
        }

        // console.log(CON_PREFIX, 'response from device', /*data.length, data.toString('hex'),*/
        //     data.toString('ascii').trim());

        return data.toString('ascii').trim();
    }

    /**
     * Wait until a certain sequence is seen on the serial port
     * @param seq Buffer with the exact sequence
     * @param timeout Timeout in milliseconds
     */
    private waitForSerialSequence(originalCommand: string, seq: Buffer, timeout: number,
                                  logProgress: boolean = false): Promise<Buffer> {
        let total = 0;
        let nextReport = 10000;

        return new Promise((res, rej) => {
            let allBuffers: Buffer[] = [];
            // separate buffer for the sequence as its not guaranteed to come in a single frame
            let checkSeqBuffer = Buffer.from([]);

            let to = setTimeout(() => {
                this._serial.off('data', fn);
                rej('Timeout when waiting for ' + seq + ' (timeout: ' + timeout + ') ' + originalCommand);
            }, timeout);

            let fn = (data: Buffer) => {
                if (logProgress) {
                    total += data.length;
                    if (total > nextReport) {
                        console.log(CON_PREFIX, 'Received', total, 'bytes');
                        nextReport += 10000;
                    }
                }

                allBuffers.push(data);

                checkSeqBuffer = Buffer.concat([ checkSeqBuffer, data ]);

                if (checkSeqBuffer.indexOf(seq) !== -1) {
                    clearTimeout(to);
                    this._serial.off('data', fn);
                    res(Buffer.concat(allBuffers));
                }
                // cut the find sequence buffer
                if (checkSeqBuffer.length > seq.length) {
                    checkSeqBuffer = checkSeqBuffer.slice(checkSeqBuffer.length - seq.length);
                }
            };
            this._serial.on('data', fn);
        });
    }

    /**
     * Wait until a certain sequence is seen on the serial port
     * @param seq Buffer with the exact sequence
     * @param timeout Timeout in milliseconds
     */
    private getSerialSequenceCallback(seqStr: string, timeout: number, callback: (buffer: Buffer) => void) {
        let seq = Buffer.from(seqStr, 'ascii');
        let allBuffers: Buffer[] = [];
        let checkSeqBuffer = Buffer.from([]);

        let to = setTimeout(() => {
            this._serial.off('data', fn);
        }, timeout);

        let fn = (data: Buffer) => {
            allBuffers.push(data);

            checkSeqBuffer = Buffer.concat([ checkSeqBuffer, data ]);

            if (checkSeqBuffer.indexOf(seq) !== -1) {
                clearTimeout(to);
                this._serial.off('data', fn);
                callback(Buffer.concat(allBuffers));
            }

            checkSeqBuffer = checkSeqBuffer.slice(checkSeqBuffer.length - seq.length);
        };
        this._serial.on('data', fn);

        return {
            cancelListener: () => this._serial.off('data', fn)
        };
    }

    /**
     * Take the serial response and grab the actual response from the device
     * @param data
     */
    private parseSerialResponse(data: Buffer) {
        // some devices only print \n, not \r\n
        let b = [];
        if (data[0] === 0xa) {
            b.push(0xd);
            b.push(0xa);
        }
        else {
            b.push(data[0]);
        }

        for (let ix = 1; ix < data.length; ix++) {
            if (data[ix] === 0xa && data[ix - 1] !== 0xd) {
                b.push(0xd);
                b.push(0xa);
            }
            else {
                b.push(data[ix]);
            }
        }

        let bdata = Buffer.from(b);

        // skip first and last line
        let first = bdata.indexOf(Buffer.from([ 0x0d, 0x0a ]));
        let last = bdata.lastIndexOf(Buffer.from([ 0x0d, 0x0a ]));

        if (first === last) {
            return bdata.slice(first);
        }
        else {
            return bdata.slice(first, last);
        }
    }

    /**
     * Wait for a command to finish and optionally switch to max baud rate for it
     * @param ee
     * @param timeout
     * @param logProgress
     */
    private async execCommandAutoSwitchBaudRate(command: string,
                                                timeout: number,  logProgress: boolean,
                                                ee?: TypedEmitter<{
                                                    started: () => void,
                                                    readingFromDevice: (progressPercentage: number) => void,
                                                    done: (data: Buffer) => void,
                                                    error: (ex: string) => void
                                                }>) {
        if (!this._config) {
            throw new Error('No config');
        }

        let { useMaxBaudRate, updatedCommand } = this.shouldUseMaxBaudrate(command);
        command = updatedCommand;

        let res: string;

        let data;

        if (useMaxBaudRate && this._config.info.transferBaudRate) {
            command = command + '\r';

            // split it up a bit for pacing
            for (let ix = 0; ix < command.length; ix += 5) {
                // console.log(CON_PREFIX, 'writing', command.substr(ix, 5));
                if (ix !== 0) {
                    await this.sleep(20);
                }

                await this._serial.write(Buffer.from(command.substr(ix, 5), 'ascii'));
            }

            await this.waitForSerialSequence(command, Buffer.from([ 0x0d, 0x0a, 0x4f, 0x4b ]), 1000, logProgress);

            if (ee) {
                ee.emit('started');
            }

            await this._serial.setBaudRate(this._config.info.transferBaudRate);

            let data1 = await this.waitForSerialSequence(
                command, Buffer.from([ 0x0d, 0x0a, 0x4f, 0x4b ]), timeout, logProgress);

            data1 = Buffer.from((data1.toString('ascii').split('\n')
                .filter(x => x.trim() !== 'OK' && x.trim() !== 'OKOK').join('\n')), 'ascii');

            await this._serial.setBaudRate(115200);

            let data2 = await this.waitForSerialSequence(command, Buffer.from([ 0x3e, 0x20 ]), timeout, logProgress);

            data = this.parseSerialResponse(Buffer.concat([ data1, data2 ]));

            if (data.toString('ascii').trim().indexOf('Not a valid AT command') > -1) {
                throw new Error('Error when communicating with device: ' + data.toString('ascii').trim());
            }

            res = data1.toString('ascii').trim() + data.toString('ascii').trim();
        }
        else {
            if (ee) {
                ee.emit('started');
            }

            res = await this.execCommand(command, timeout, logProgress);
        }

        return res;
    }

    private shouldUseMaxBaudrate(command: string) {
        if (!this._config) {
            throw new Error('No config');
        }

        let useMaxBaudRate: boolean;
        let hasFasterBaudrate = typeof this._config.info.transferBaudRate === 'number' &&
            this._config.info.transferBaudRate !== 115200;

        let v = this._config.info.atCommandVersion;

        // fast baud rate is also 115200 or empty? then always skip it
        if (!hasFasterBaudrate) {
            useMaxBaudRate = false;
            // 1.6 or higher? add ,n to the command
            if (v.major >= 1 && v.minor >= 6) {
                command += ',n';
            }
        }
        // so... under v1.4 this was not supported, so always false
        else if (v.major === 1 && v.minor < 4) {
            useMaxBaudRate = false;
        }
        // for v1.4 & v1.5 it's only supported for AT+SNAPSHOT and it's *implicit* (so always enabled)
        else if (v.major === 1 && (v.minor === 4 || v.minor === 5)) {
            if (command.startsWith('AT+SNAPSHOT=')) {
                useMaxBaudRate = true;
            }
            else {
                useMaxBaudRate = false;
            }
        }
        // v1.6 and up have an extra parameter ('y'/'n') at the end indicating whether we should switch
        else {
            useMaxBaudRate = true;
            command += ',y';
        }

        return {
            useMaxBaudRate,
            updatedCommand: command
        };
    }

    private basename(path: string) {
        let parts = path.split('/');
        return parts[parts.length - 1];
    }
}
