import { EventEmitter } from 'tsee';
import { RunnerHelloResponseModelParameters } from '../classifier/linux-impulse-runner';

export type ICameraInferenceDimensions = {
    width: number,
    height: number,
    resizeMode: RunnerHelloResponseModelParameters['image_resize_mode'],
};

export type ICameraStartOptions = {
    device: string,
    intervalMs: number,
    dimensions?: { width: number, height: number },
    inferenceDimensions?: ICameraInferenceDimensions,
};

export interface ICamera extends EventEmitter<{
    snapshot: (buffer: Buffer, filename: string) => void,
    error: (message: string) => void
}> {
    init(): Promise<void>;
    listDevices(): Promise<string[]>;
    start(options: ICameraStartOptions): Promise<void>;
    stop(): Promise<void>;
    getLastOptions(): ICameraStartOptions | undefined;
}