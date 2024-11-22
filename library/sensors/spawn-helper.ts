import { spawn } from 'child_process';

export type SpawnHelperType = (
    command: string,
    args: string[],
    opts?: { ignoreErrors: boolean, cwd?: string }) => Promise<string>;

export function spawnHelper(command: string, args: string[],
                            opts: { ignoreErrors: boolean, cwd?: string } = { ignoreErrors: false }) {
    return new Promise<string>((resolve, reject) => {
        const p = spawn(command, args, { env: process.env, cwd: opts.cwd });

        let allData: Buffer[] = [];

        p.stdout.on('data', (data: Buffer) => {
            allData.push(data);
        });

        p.stderr.on('data', (data: Buffer) => {
            allData.push(data);
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