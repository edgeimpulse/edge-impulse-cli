import util from 'util';
import fs from 'fs';
import { spawnHelper } from '../spawn-helper';

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bytesToSize(bytes: number) {
    const sizes = [ 'Bytes', 'KB', 'MB', 'GB', 'TB' ];
    if (bytes === 0) return '0 Bytes';
    let i = Number(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

export async function pathExists(path: string) {
    let x = false;
    try {
        await util.promisify(fs.stat)(path);
        x = true;
    }
    catch (ex) {
        /* noop */
    }
    return x;
}

/**
 * Spinner on the terminal
 * @returns Interval (just call clearInterval to stop the spinner)
 */
export function spinner() {
    const spinChars = [ '-', '\\', '|', '/' ];
    let spinIx = -1;

    return setInterval(() => {
        spinIx++;
        spinIx = spinIx % (spinChars.length);

        process.stdout.write('\b' + (spinChars[spinIx]));
    }, 250);
}


/**
 * Deep compare two objects (underneaths JSON stringifies them)
 */
export function deepCompare(obj1: { [k: string]: any } | any, obj2: { [k: string]: any } | any) {
    // keys need to be ordered first
    const orderObject = (unordered: { [k: string]: any }) => {
        const ordered = Object.keys(unordered).sort().reduce(
            (curr: { [k: string]: any }, key) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                curr[key] = unordered[key];
                return curr;
            },
            { }
        );
        for (let k of Object.keys(ordered)) {
            if (Array.isArray(ordered[k])) {
                continue;
            }
            if (ordered[k] instanceof Date) {
                continue;
            }
            if (ordered[k] instanceof Object) {
                ordered[k] = orderObject(<{ [k: string]: any }>ordered[k]);
            }
        }
        return ordered;
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let obj1Ordered = obj1 instanceof Object ?
        // eslint-disable-next-line
        orderObject(obj1) :
        obj1;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    let obj2Ordered = obj1 instanceof Object ?
        // eslint-disable-next-line
        orderObject(obj2) :
        obj2;

    return JSON.stringify(obj1Ordered) === JSON.stringify(obj2Ordered);
}

/**
 * Try and guess the git repository URL (by running `git remote -v`). This is used
 * for blocks with a `repositoryUrl` property.
 * @returns a URL or undefined
 */
export async function guessRepoUrl() {
    try {
        let gitOutput = await spawnHelper('git', [ 'remote', '-v' ], {
            cwd: process.cwd(),
            ignoreErrors: false,
        });

        let line = gitOutput.split('\n').find(x => x.startsWith('origin') && x.indexOf('fetch') > -1);
        if (line) {
            let urlPart = line.split(/\s+/)[1];
            if (urlPart.startsWith('git@')) {
                urlPart = urlPart.replace(':', '/');
                urlPart = urlPart.replace('git@', 'https://');
            }
            if (urlPart.endsWith('.git')) {
                urlPart = urlPart.slice(0, urlPart.length - 4);
            }
            return urlPart;
        }

        return undefined;
    }
    catch (ex) {
        return undefined;
    }
}
