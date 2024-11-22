import inquirer from 'inquirer';
import { ICamera } from './icamera';
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

export async function initCamera(cameraType: CameraType,
                                 cameraDeviceName: string | undefined,
                                 dimensions: { width: number, height: number } | undefined,
                                 gstLaunchArgs: string | undefined,
                                 verboseOutput: boolean) {

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
        });
    }
    else {
        throw new Error('Unsupported camera type "' + cameraType + '"');
    }

    await camera.init();

    let cameraDevice: string | undefined;
    const cameraDevices = await camera.listDevices();
    if (cameraDevices.length === 0) {
        throw new Error('Cannot find any webcams');
    }

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

    //TODO: move this message out of the camera init function
    // console.log(RUNNER_PREFIX, 'Using camera', cameraDevice, 'starting...');

    if (cameraType === CameraType.PropheseeCamera) {
        await camera.start({
            device: cameraDevice,
            intervalMs: 40,
            dimensions: dimensions
        });
    }
    else {
        await camera.start({
            device: cameraDevice,
            intervalMs: 100,
            dimensions: dimensions
        });
    }

    return camera;
}

export async function initMicrophone(audioDeviceName: string | undefined) {
    let audioDevice: string | undefined;

    const audioDevices = await AudioRecorder.ListDevices();

    if (audioDeviceName && audioDevices.find(d => d.id === audioDeviceName)) {
        audioDevice = audioDeviceName;
    }
    else if (audioDevices.length === 1) {
        audioDevice = audioDevices[0].id;
    }
    else if (audioDevices.length === 0) {
        throw Error('Could not find any microphones');
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