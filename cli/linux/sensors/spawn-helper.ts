import { spawn } from 'child_process';

export function spawnHelper(command: string, args: string[]) {
    return new Promise<string>((resolve, reject) => {
        const p = spawn(command, args, { env: process.env });

        let allData: Buffer[] = [];

        p.stdout.on('data', (data: Buffer) => {
            allData.push(data);
        });

        p.stderr.on('data', (data: Buffer) => {
            allData.push(data);
        });

        p.on('error', reject);

        p.on('close', (code) => {
            if (code === 0) {
                resolve(Buffer.concat(allData).toString('utf-8'));
            }
            else {
                reject('Error code was not 0: ' + Buffer.concat(allData).toString('utf-8'));
            }
        });
    });
}