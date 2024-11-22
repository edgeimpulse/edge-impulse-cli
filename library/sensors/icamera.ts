import { EventEmitter } from 'tsee';

export type ICameraStartOptions = {
    device: string,
    intervalMs: number,
    dimensions?: { width: number, height: number }
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