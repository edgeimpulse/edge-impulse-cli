import { spawn } from 'child_process';

export function spawnHelper(command: string, args: string[],
                            opts: { ignoreErrors?: boolean, cwd?: string, env?: { [k: string]: string } } =
                                { ignoreErrors: false }) {
    return new Promise<string>((resolve, reject) => {
        let env = Object.assign({ }, process.env);

        if (opts.env) {
            for (let k of Object.keys(opts.env)) {
                env[k] = opts.env[k];
            }
        }

        const p = spawn(command, args, { env: env, cwd: opts.cwd });

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
