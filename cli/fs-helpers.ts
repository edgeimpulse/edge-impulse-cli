import util from 'util';
import fs from 'fs';
import Path from 'path';

export type FileInFolder = {
    filename: string;
    path: string;
};

type FileCallback = (file: FileInFolder) => void;

export class FSHelpers {
    static async exists(path: string) {
        let fx = false;
        try {
            await util.promisify(fs.stat)(path);
            fx = true;
        }
        catch (ex) {
            /* noop */
        }
        return fx;
    }

    static async rmDir(folder: string) {
        if (!(await FSHelpers.exists(folder))) return;

        const readdir = util.promisify(fs.readdir);

        let entries = await readdir(folder, { withFileTypes: true });
        await Promise.all(entries.map(async entry => {
            // skip .nfs files in the EFS storage layer
            if (entry.name.startsWith('.nfs')) return;

            let fullPath = Path.join(folder, entry.name);
            return entry.isDirectory() ? FSHelpers.rmDir(fullPath) : FSHelpers.safeUnlinkFile(fullPath);
        }));

        await util.promisify(fs.rmdir)(folder);
    }

    /**
     * Unlinks a file, but does not throw if unlinking fails.
     * Supports passing an undefined value to reduce caller boilerplate
     * when called with optional arguments.
     * @param path
     */
     static async safeUnlinkFile(path: string) {
        try {
            await util.promisify(fs.unlink)(path);
        }
        catch (ex) {
            /* noop */
        }
    }

    /**
     * Recursively parse all sub-folders in a given folder, calling the given callback for any files
     * @param rootPath Folder to parse
     * @param callback Callback to call for each file
     */
    static readAllFiles(rootPath: string, callback: FileCallback) {
        const parseRecursively = (path: string) => {
            for (const filename of fs.readdirSync(path)) {
                // Ignore any files beginning with . e.g. .DS_Store, as well as any readme files
                if (filename.startsWith('.') || filename.toLowerCase().includes('readme')) {
                    continue;
                }

                const filePath = Path.join(path, filename);

                if (fs.statSync(filePath).isDirectory()) {
                    // Recursively parse any directories
                    parseRecursively(filePath);
                }
                else {
                    // Process a file
                    callback({
                        filename,
                        path,
                    });
                }
            }
        };
        parseRecursively(rootPath);
    }
}
