import fs from 'fs/promises';
import Path from 'path';
import { tmpdir } from 'os';
import { ICamera } from "./icamera";
import { EventEmitter } from 'tsee';
import { spawnHelper } from "./spawn-helper";
import { FSHelpers } from '../../cli-common/fs-helpers';

const PREFIX = '\x1b[35m[VID]\x1b[0m';

export class VideoRecorder {
    private _camera: ICamera;
    private _verbose: boolean;

    constructor(camera: ICamera, verbose: boolean) {
        this._camera = camera;
        this._verbose = verbose;
    }

    async record(timeMs: number) {
        try {
            await spawnHelper('which', [ 'ffmpeg' ]);
        }
        catch (ex) {
            throw new Error('Missing "ffmpeg" in PATH. Install via `sudo apt install -y ffmpeg`');
        }

        let ee = new EventEmitter<{
            processing: () => void,
            error: (err: string) => void,
            done: (buffer: Buffer) => void
        }>();

        // if we have /dev/shm, use that (RAM backed, instead of SD card backed, better for wear)
        let osTmpDir = tmpdir();
        if (await FSHelpers.exists('/dev/shm')) {
            osTmpDir = '/dev/shm';
        }

        let lastCameraOptions = this._camera.getLastOptions();
        if (!lastCameraOptions) {
            throw new Error('Could not get last camera options');
        }

        let frequency = 1000 / lastCameraOptions.intervalMs;
        let expectedFrames = Math.ceil((timeMs / 1000) * frequency);

        let tempDir = await fs.mkdtemp(Path.join(osTmpDir, 'edge-impulse-cli'));

        void (async () => {
            let fileIx = 0;
            let hasError = false;

            const onSnapshot = async (data: Buffer) => {
                try {
                    let filename = 'image' + (++fileIx).toString().padStart(5, '0') + '.jpg';
                    await fs.writeFile(Path.join(tempDir, filename), data);
                }
                catch (ex) {
                    let ex2 = <Error>ex;
                    await onError(ex2);
                }
            };

            const onError = async (err: Error) => {
                if (this._verbose) {
                    console.log(PREFIX, 'Error', err.message || err.toString());
                }

                this._camera.off('snapshot', onSnapshot);
                ee.emit('error', err.message || err.toString());
                hasError = true;

                await this.rmDir(tempDir);
            };

            this._camera.on('snapshot', onSnapshot);

            // wait for n frames...
            await new Promise<void>((resolve) => {
                let framesLeft = expectedFrames;
                const onSnapshot2 = () => {
                    if (--framesLeft === 0) {
                        this._camera.off('snapshot', onSnapshot2);
                        resolve();
                    }
                    if (this._verbose && (framesLeft % 10 === 0)) {
                        console.log(PREFIX, 'frames left', framesLeft);
                    }
                };
                this._camera.on('snapshot', onSnapshot2);
            });

            this._camera.off('snapshot', onSnapshot);

            if (hasError) return;

            ee.emit('processing');

            let outFile = Path.join(tempDir, 'out.mp4');

            if (this._verbose) {
                console.log(PREFIX, 'Found ' +
                    (await fs.readdir(tempDir)).filter(x => x.endsWith('.jpg')).length +
                    ' files, combining them into a video...');
            }

            try {
                await spawnHelper('ffmpeg', [
                    '-r', '25',         // @todo: don't hardcode FPS
                    '-f', 'image2',
                    '-s', '1280x720',
                    '-i', 'image%05d.jpg',
                    '-vcodec', 'libx264',
                    '-preset', 'ultrafast',
                    '-crf', '25',
                    '-pix_fmt', 'yuv420p',
                    outFile
                ], {
                    ignoreErrors: false,
                    cwd: tempDir
                });
            }
            catch (ex2) {
                let ex = <Error>ex2;
                return onError(ex);
            }

            let outBuffer = await fs.readFile(outFile);

            if (this._verbose) {
                console.log(PREFIX, 'Converted images into video, ' + outBuffer.length + ' bytes');
            }

            ee.emit('done', outBuffer);

            await this.rmDir(tempDir);
        })();

        return ee;
    }

    private async rmDir(folder: string) {
        if (!(await FSHelpers.exists(folder))) return;

        const entries = await fs.readdir(folder, { withFileTypes: true });

        // Skip .nfs files in the EFS storage layer
        const filteredEntries = entries.filter(entry => !entry.name.startsWith('.nfs'));

        await Promise.all(filteredEntries.map(entry => {
            const fullPath = Path.join(folder, entry.name);
            return entry.isDirectory()
                ? FSHelpers.rmDir(fullPath)
                : FSHelpers.safeUnlinkFile(fullPath);
        }));

        try {
            await fs.rmdir(folder);
        }
        catch (ex) {
            // OK not great but OK there are some issues with removing files from EFS
            console.warn('Failed to remove', folder, ex);
        }
    }
}
