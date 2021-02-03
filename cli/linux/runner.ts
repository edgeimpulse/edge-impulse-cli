#!/usr/bin/env node

import Path from 'path';
import { LinuxImpulseRunner } from './classifier/linux-impulse-runner';
import { AudioClassifier } from './classifier/audio-classifier';
import { ImageClassifier } from './classifier/image-classifier';
import { Imagesnap } from './imagesnap';
import inquirer from 'inquirer';
import { Config } from '../config';
import { initCliApp, setupCliApp } from '../init-cli-app';
import fs from 'fs';
import os from 'os';
import { RunnerDownloader } from './classifier/runner-downloader';

const RUNNER_PREFIX = '\x1b[33m[RUN]\x1b[0m';
const BUILD_PREFIX = '\x1b[32m[BLD]\x1b[0m';

let audioClassifier: AudioClassifier | undefined;
let imageClassifier: ImageClassifier | undefined;
let configFactory: Config | undefined;

const cleanArgv = process.argv.indexOf('--clean') > -1;
const silentArgv = process.argv.indexOf('--silent') > -1;
const devArgv = process.argv.indexOf('--dev') > -1;
const apiKeyArgvIx = process.argv.indexOf('--api-key');
const apiKeyArgv = apiKeyArgvIx !== -1 ? process.argv[apiKeyArgvIx + 1] : undefined;
const verboseArgv = process.argv.indexOf('--verbose') > -1;
const modelFileIx = process.argv.indexOf('--model-file');
const modelFileArgv = modelFileIx !== -1 ? process.argv[modelFileIx + 1] : undefined;

const cliOptions = {
    appName: 'Edge Impulse Linux runner',
    apiKeyArgv: apiKeyArgv,
    cleanArgv: cleanArgv,
    devArgv: devArgv,
    hmacKeyArgv: undefined,
    silentArgv: silentArgv,
    connectProjectMsg: 'From which project do you want to load the model?',
    getProjectFromConfig: async () => {
        if (!configFactory) return undefined;

        let projectId = await configFactory.getLinuxProjectId();
        if (!projectId) {
            return undefined;
        }
        return { projectId: projectId };
    }
};

let firstExit = true;

const onSignal = async () => {
    if (!firstExit) {
        process.exit(1);
    }
    else {
        console.log(RUNNER_PREFIX, 'Received stop signal, stopping application... ' +
            'Press CTRL+C again to force quit.');
        firstExit = false;
        try {
            if (audioClassifier) {
                await audioClassifier.stop();
            }
            if (imageClassifier) {
                await imageClassifier.stop();
            }
            process.exit(0);
        }
        catch (ex2) {
            let ex = <Error>ex2;
            console.log(RUNNER_PREFIX, 'Failed to stop inferencing', ex.message);
        }
        process.exit(1);
    }
};

process.on('SIGHUP', onSignal);
process.on('SIGINT', onSignal);

// tslint:disable-next-line: no-floating-promises
(async () => {
    try {
        console.log(`This is a development preview that only runs on macOS.`);
        console.log(`Edge Impulse does not offer support on edge-impulse-linux-runner at the moment.`);
        console.log(``);

        let modelFile;

        // no model file passed in? then build / download the latest deployment...
        if (!modelFileArgv) {
            const init = await initCliApp(cliOptions);
            const config = init.config;
            configFactory = init.configFactory;

            const { projectId, devKeys } = await setupCliApp(configFactory, config, cliOptions, undefined);

            await configFactory.setLinuxProjectId(projectId);

            const downloader = new RunnerDownloader(projectId, config);
            downloader.on('build-progress', msg => {
                console.log(BUILD_PREFIX, msg);
            });

            let deployment = await downloader.downloadDeployment();

            let tmpDir = await fs.promises.mkdtemp('ei-' + Date.now());
            tmpDir = Path.join(os.tmpdir(), tmpDir);
            await fs.promises.mkdir(tmpDir, { recursive: true });
            modelFile = Path.join(tmpDir, downloader.getDownloadType());
            await fs.promises.writeFile(modelFile, deployment);
            await fs.promises.chmod(modelFile, 0o755);
        }
        else {
            configFactory = new Config();
            modelFile = modelFileArgv;
        }

        const runner = new LinuxImpulseRunner(modelFile);
        const model = await runner.init();

        // if downloaded? then store...
        if (!modelFileArgv) {
            let folder = Path.join(os.homedir(), '.ei-linux-runner', 'models', model.project.id + '',
                'v' + model.project.deploy_version);
            await fs.promises.mkdir(folder, { recursive: true });
            await fs.promises.rename(modelFile, Path.join(folder, Path.basename(modelFile)));
            console.log(RUNNER_PREFIX, 'Stored model version in', Path.join(folder, Path.basename(modelFile)));
        }

        let param = model.modelParameters;

        if (param.sensorType === 'microphone') {
            console.log(RUNNER_PREFIX, 'Starting the audio classifier for',
                model.project.owner + ' / ' + model.project.name, '(v' + model.project.deploy_version + ')');
            console.log(RUNNER_PREFIX, 'Parameters', 'freq', param.frequency + 'Hz',
                'window length', ((param.input_features_count / param.frequency) * 1000) + 'ms.',
                'classes', param.labels);

            audioClassifier = new AudioClassifier(runner);

            await audioClassifier.start(250);

            audioClassifier.on('result', (result, timeMs) => {
                // print the raw predicted values for this frame
                // (turn into string here so the content does not jump around)
                // tslint:disable-next-line: no-unsafe-any
                let c = <{ [k: string]: string | number }>(<any>result.classification);
                for (let k of Object.keys(c)) {
                    c[k] = (<number>c[k]).toFixed(4);
                }
                console.log('classifyRes', timeMs + 'ms.', c);
            });
        }
        else if (param.sensorType === 'camera') {
            console.log(RUNNER_PREFIX, 'Starting the image classifier for',
                model.project.owner + ' / ' + model.project.name, '(v' + model.project.deploy_version + ')');
            console.log(RUNNER_PREFIX, 'Parameters',
                'image size', param.image_input_width + 'x' + param.image_input_height + ' px (' +
                    param.image_channel_count + ' channels)',
                'classes', param.labels);

            const imagesnap = new Imagesnap();
            await imagesnap.init();

            let device: string | undefined;
            const devices = await imagesnap.listDevices();
            if (devices.length === 0) {
                throw new Error('Cannot find any webcams');
            }

            const storedCamera = await configFactory.getCamera();
            if (storedCamera && devices.indexOf(storedCamera) > -1) {
                device = storedCamera;
            }
            else if (devices.length === 1) {
                device = devices[0];
            }
            else {
                let inqRes = await inquirer.prompt([{
                    type: 'list',
                    choices: (devices || []).map(p => ({ name: p, value: p })),
                    name: 'camera',
                    message: 'Select a camera',
                    pageSize: 20
                }]);
                device = <string>inqRes.camera;
            }
            await configFactory.storeCamera(device);

            console.log(RUNNER_PREFIX, 'Using camera', device, 'starting...');

            await imagesnap.start({
                device: device,
                intervalMs: 200,
            });

            imagesnap.on('error', error => {
                console.log(RUNNER_PREFIX, 'imagesnap error', error);
            });

            console.log(RUNNER_PREFIX, 'Connected to camera');

            imageClassifier = new ImageClassifier(runner, imagesnap);

            await imageClassifier.start();

            imageClassifier.on('result', (result, timeMs) => {
                // print the raw predicted values for this frame
                // (turn into string here so the content does not jump around)
                // tslint:disable-next-line: no-unsafe-any
                let c = <{ [k: string]: string | number }>(<any>result.classification);
                for (let k of Object.keys(c)) {
                    c[k] = (<number>c[k]).toFixed(4);
                }
                console.log('classifyRes', timeMs + 'ms.', c);
            });
        }
        else {
            throw new Error('Invalid sensorType: ' + param.sensorType);
        }
    }
    catch (ex) {
        console.warn(RUNNER_PREFIX, 'Failed to run impulse', ex);
        process.exit(1);
    }
})();

function buildWavFileBuffer(data: Buffer, intervalMs: number) {
    // let's build a WAV file!
    let wavFreq = 1 / intervalMs * 1000;
    let fileSize = 44 + (data.length);
    let dataSize = (data.length);
    let srBpsC8 = (wavFreq * 16 * 1) / 8;

    let headerArr = new Uint8Array(44);
    let h = [
        0x52, 0x49, 0x46, 0x46, // RIFF
        // tslint:disable-next-line: no-bitwise
        fileSize & 0xff, (fileSize >> 8) & 0xff, (fileSize >> 16) & 0xff, (fileSize >> 24) & 0xff,
        0x57, 0x41, 0x56, 0x45, // WAVE
        0x66, 0x6d, 0x74, 0x20, // fmt
        0x10, 0x00, 0x00, 0x00, // length of format data
        0x01, 0x00, // type of format (1=PCM)
        0x01, 0x00, // number of channels
        // tslint:disable-next-line: no-bitwise
        wavFreq & 0xff, (wavFreq >> 8) & 0xff, (wavFreq >> 16) & 0xff, (wavFreq >> 24) & 0xff,
        // tslint:disable-next-line: no-bitwise
        srBpsC8 & 0xff, (srBpsC8 >> 8) & 0xff, (srBpsC8 >> 16) & 0xff, (srBpsC8 >> 24) & 0xff,
        0x02, 0x00, 0x10, 0x00,
        0x64, 0x61, 0x74, 0x61, // data
        // tslint:disable-next-line: no-bitwise
        dataSize & 0xff, (dataSize >> 8) & 0xff, (dataSize >> 16) & 0xff, (dataSize >> 24) & 0xff,
    ];
    for (let hx = 0; hx < 44; hx++) {
        headerArr[hx] = h[hx];
    }

    return Buffer.concat([ Buffer.from(headerArr), data ]);
}
