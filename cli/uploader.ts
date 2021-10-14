#!/usr/bin/env node

import fs from 'fs';
import Path from 'path';
import util from 'util';
import asyncpool from 'tiny-async-pool';
import { ExportInputBoundingBox, makeCsv, makeImage, makeVideo, makeWav, upload } from './make-image';
import { getCliVersion, initCliApp, setupCliApp } from './init-cli-app';
import { Config } from './config';

type UploaderFileType = {
    path: string,
    category: string,
    label: string | undefined
};

// These types are shared with jobs-container/node/export/shared/jobs/export.ts
interface ExportBoundingBoxesFile {
    version: 1;
    type: 'bounding-box-labels';
    boundingBoxes: { [fileName: string]: ExportInputBoundingBox[] };
}

const versionArgv = process.argv.indexOf('--version') > -1;
const cleanArgv = process.argv.indexOf('--clean') > -1;
const labelArgvIx = process.argv.indexOf('--label');
const categoryArgvIx = process.argv.indexOf('--category');
const labelArgv = labelArgvIx !== -1 ? process.argv[labelArgvIx + 1] : undefined;
const categoryArgv = categoryArgvIx !== -1 ? process.argv[categoryArgvIx + 1] : undefined;
const helpArgv = process.argv.indexOf('--help') > -1;
const dontResignArgv = process.argv.indexOf('--dont-resign') > -1;
const silentArgv = process.argv.indexOf('--silent') > -1;
const devArgv = process.argv.indexOf('--dev') > -1;
const apiKeyArgvIx = process.argv.indexOf('--api-key');
const apiKeyArgv = apiKeyArgvIx !== -1 ? process.argv[apiKeyArgvIx + 1] : undefined;
const hmacKeyArgvIx = process.argv.indexOf('--hmac-key');
const hmacKeyArgv = hmacKeyArgvIx !== -1 ? process.argv[hmacKeyArgvIx + 1] : undefined;
const concurrencyArgvIx = process.argv.indexOf('--concurrency');
const concurrencyArgv = concurrencyArgvIx !== -1 ? process.argv[concurrencyArgvIx + 1] : undefined;
const startIxArgvIx = process.argv.indexOf('--progress-start-ix');
const startIxArgv = startIxArgvIx !== -1 ? process.argv[startIxArgvIx + 1] : undefined;
const endIxArgvIx = process.argv.indexOf('--progress-end-ix');
const endIxArgv = endIxArgvIx !== -1 ? process.argv[endIxArgvIx + 1] : undefined;
const progressIvArgvIx = process.argv.indexOf('--progress-interval');
const progressIvArgv = progressIvArgvIx !== -1 ? process.argv[progressIvArgvIx + 1] : undefined;
const allowDuplicatesArgv = process.argv.indexOf('--allow-duplicates') > -1;
const openmvArgv = process.argv.indexOf('--format-openmv') > -1;

let configFactory: Config;

const cliOptions = {
    appName: 'Edge Impulse uploader',
    apiKeyArgv: apiKeyArgv,
    cleanArgv: cleanArgv,
    devArgv: devArgv,
    hmacKeyArgv: hmacKeyArgv,
    silentArgv: silentArgv,
    connectProjectMsg: 'To which project do you want to upload the data?',
    getProjectFromConfig: async () => {
        let projectId = await configFactory.getUploaderProjectId();
        if (!projectId) {
            return undefined;
        }
        return { projectId: projectId };
    }
};

// tslint:disable-next-line:no-floating-promises
(async () => {
    if (versionArgv) {
        console.log(getCliVersion());
        process.exit(0);
    }

    if (helpArgv) {
        console.log('Usage:');
        console.log('    edge-impulse-uploader --label glass-breaking --category training path/to/file.wav');
        console.log('');
        console.log('See https://docs.edgeimpulse.com/docs/cli-uploader for all arguments');
        process.exit(1);
    }

    const init = await initCliApp(cliOptions);
    const config = init.config;
    configFactory = init.configFactory;

    if (!config) return;

    if (!silentArgv) {
        console.log('Endpoints:');
        console.log('    API:        ', config.endpoints.internal.api);
        console.log('    Ingestion:  ', config.endpoints.internal.ingestion);
        console.log('');

        console.log('Upload configuration:');
        if (openmvArgv) {
            console.log('    Label:      ', 'Will be infered from folder structure');
            console.log('    Category:   ', 'Will be infered from folder structure');
        }
        else {
            console.log('    Label:      ', labelArgv || 'Not set, will be infered from file name');
            console.log('    Category:   ', categoryArgv || 'training');
        }
    }

    let argv = 2;
    if (cleanArgv) argv++;
    if (labelArgv) argv += 2;
    if (categoryArgv) argv += 2;
    if (apiKeyArgv) argv += 2;
    if (dontResignArgv) argv++;
    if (devArgv) argv++;
    if (concurrencyArgv) argv += 2;
    if (hmacKeyArgv) argv += 2;
    if (silentArgv) argv++;
    if (startIxArgv) argv += 2;
    if (endIxArgv) argv += 2;
    if (progressIvArgv) argv += 2;
    if (allowDuplicatesArgv) argv++;
    if (openmvArgv) argv++;

    try {
        let concurrency = concurrencyArgv ? Number(concurrencyArgv) : 20;
        if (isNaN(concurrency)) {
            console.log('--concurrency should have a number, but was ' + concurrency);
            process.exit(1);
        }

        const validExtensions = [
            '.wav',
            '.cbor',
            '.json',
            '.jpg',
            '.jpeg',
            '.png',
            '.csv',
            '.mp4'
        ];

        let files: UploaderFileType[];

        let fileArgs = process.argv.slice(argv);

        if (fileArgs.length === 1 && Path.basename(fileArgs[0]) === 'bounding_boxes.labels') {
            console.log(``);
            console.log(`You don't need to upload "bounding_boxes.labels". When uploading an image we check whether ` +
                        `a labels file is present in the same folder, and automatically attach the bounding boxes ` +
                        `to the image.`);
            console.log(`So you can just do:`);
            console.log(`    edge-impulse-uploader yourimage.jpg`);
            console.log(``);
            process.exit(1);
        }

        // exclude 'bounding_boxes.labels'
        fileArgs = fileArgs.filter(f => Path.basename(f) !== 'bounding_boxes.labels');

        if (!fileArgs[0]) {
            console.log('Requires at least one argument (a ' +
                validExtensions.slice(0, validExtensions.length - 1).join(', ') + ' or ' +
                validExtensions[validExtensions.length - 1] + ' file)');
            process.exit(1);
        }

        if (openmvArgv) {
            if (categoryArgv || labelArgv) {
                console.log('--format-openmv cannot be used in conjunction with --category or --label');
                process.exit(1);
            }

            if (fileArgs.length > 1) {
                console.log('Requires one argument (the OpenMV dataset directory)');
                process.exit(1);
            }

            if (!fs.statSync(fileArgs[0]).isDirectory()) {
                console.log(fileArgs[0] + ' is not a directory (required for --format-openmv)');
                process.exit(1);
            }

            let categoryFolders = fs.readdirSync(fileArgs[0]).filter(d => d.endsWith('.class'));
            if (categoryFolders.length === 0) {
                console.log(fileArgs[0] + ' does not seem to be an OpenMV dataset directory, no ' +
                    'subdirectories found that end with .class');
                process.exit(1);
            }

            files = [];

            for (let categoryFolder of categoryFolders) {
                for (let f of fs.readdirSync(Path.join(fileArgs[0], categoryFolder))) {
                    files.push({
                        path: Path.join(fileArgs[0], categoryFolder, f),
                        category: 'split',
                        label: categoryFolder.replace('.class', '')
                    });
                }
            }
        }
        else {
            if (validExtensions.indexOf(Path.extname(fileArgs[0].toLowerCase())) === -1) {
                console.log('Cannot handle this file, only ' + validExtensions.join(', ') + ' supported:', fileArgs[0]);
                process.exit(1);
            }

            // Windows doesn't do expansion like Mac and Linux...
            if (Path.basename(fileArgs[0], Path.extname(fileArgs[0])) === '*') {
                fileArgs = (await util.promisify(fs.readdir)(Path.dirname(fileArgs[0]))).filter(v => {
                    return Path.extname(v) === Path.extname(fileArgs[0]);
                }).map(f => Path.join(Path.dirname(fileArgs[0]), f));
            }

            files = fileArgs.map(f => {
                return {
                    path: f,
                    category: categoryArgv || 'training',
                    label: labelArgv || undefined
                };
            });
        }

        const { projectId, devKeys } = await setupCliApp(configFactory, config, cliOptions, undefined);

        await configFactory.setUploaderProjectId(projectId);

        let fileIx = startIxArgv ? Number(startIxArgv) : 0;
        let success = 0;
        let failed = 0;
        let totalFilesLength = endIxArgv ? Number(endIxArgv) : files.length;

        let boundingBoxCache: { [dir: string]: ExportBoundingBoxesFile | undefined } = { };

        let allDirectories = [...new Set(files.map(f => Path.resolve(Path.dirname(f.path))))];
        const loadBoundingBoxCache = async (directory: string) => {
            let labelsFile = Path.join(directory, 'bounding_boxes.labels');

            if (!await exists(labelsFile)) {
                boundingBoxCache[directory] = undefined;
            }
            else {
                try {
                    let data = <ExportBoundingBoxesFile>JSON.parse(<string>await fs.promises.readFile(labelsFile, 'utf-8'));
                    if (data.version !== 1) {
                        throw new Error('Invalid version');
                    }
                    if (data.type !== 'bounding-box-labels') {
                        throw new Error('Invalid type');
                    }
                    if (typeof data.boundingBoxes !== 'object') {
                        throw new Error('boundingBoxes is not an object');
                    }
                    boundingBoxCache[directory] = data;
                }
                catch (ex2) {
                    let ex = <Error>ex2;
                    console.warn('WARN: Invalid labels file for', labelsFile, ex.message || ex.toString());
                    boundingBoxCache[directory] = undefined;
                }
            }
        };
        await asyncpool(10, allDirectories, loadBoundingBoxCache);

        const processFile = async (file: UploaderFileType) => {
            const boundingBoxesFile = boundingBoxCache[Path.resolve(Path.dirname(file.path))];
            const boundingBoxes = boundingBoxesFile ?
                (boundingBoxesFile.boundingBoxes[Path.basename(file.path)] || undefined) :
                undefined;

            const buffer = await fs.promises.readFile(file.path);

            let processed: { encoded: Buffer, contentType: string,
                attachments?: { value: Buffer, options: { contentType: string}}[] };

            try {
                switch (Path.extname(file.path).toLowerCase()) {
                    case '.wav':
                        processed = makeWavInternal(buffer, hmacKeyArgv || devKeys.hmacKey);
                        break;
                    case '.cbor':
                        processed = makeCbor(buffer);
                        break;
                    case '.json':
                        processed = makeJson(buffer);
                        break;
                    case '.jpg':
                    case '.jpeg':
                    case '.png':
                        processed = makeImage(buffer, hmacKeyArgv || devKeys.hmacKey, Path.basename(file.path));
                        break;
                    case '.mp4':
                        processed = makeVideo(buffer, hmacKeyArgv || devKeys.hmacKey, Path.basename(file.path));
                        break;
                    case '.csv':
                        processed = makeCsv(buffer, hmacKeyArgv || devKeys.hmacKey);
                        break;
                    default:
                        throw new Error('extension not supported (only ' +
                            validExtensions.slice(0, validExtensions.length - 1).join(', ') + ' and ' +
                            validExtensions[validExtensions.length - 1] + ' supported)');
                }
            }
            catch (ex2) {
                let ex = <Error>ex2;
                let ix = ++fileIx;
                let ixS = ix.toString().padStart(totalFilesLength.toString().length, ' ');
                console.error(`[${ixS}/${totalFilesLength}] Failed to process`, file.path, ex.message || ex.toString());
                failed++;
                return;
            }

            let filename = Path.basename(file.path).split('.')[0];

            try {
                let hrstart = Date.now();
                await upload({
                    apiKey: apiKeyArgv || devKeys.apiKey || '',
                    filename: filename,
                    processed: processed,
                    allowDuplicates: allowDuplicatesArgv,
                    category: file.category,
                    config: config,
                    dataBuffer: buffer,
                    label: file.label,
                    boundingBoxes: boundingBoxes
                });

                let ix = ++fileIx;
                let ixS = ix.toString().padStart(totalFilesLength.toString().length, ' ');
                if (!progressIvArgv) {
                    console.log(`[${ixS}/${totalFilesLength}] Uploading`, file.path,
                        'OK (' + (Date.now() - hrstart) + ' ms)');
                }
                else if (ix === 1) {
                    console.log(`[${ixS}/${totalFilesLength}] Uploading...`);
                }
                success++;
            }
            catch (ex2) {
                let ex = <Error>ex2;
                let ix = ++fileIx;
                let ixS = ix.toString().padStart(totalFilesLength.toString().length, ' ');
                console.log(`[${ixS}/${totalFilesLength}] Failed to upload`, file.path,
                    ex.message || ex.toString());
                failed++;
            }
        };

        let progressIv: NodeJS.Timeout | undefined;
        if (progressIvArgv) {
            progressIv = setInterval(() => {
                let ixS = fileIx.toString().padStart(totalFilesLength.toString().length, ' ');
                console.log(`[${ixS}/${totalFilesLength}] Uploading...`);
            }, Number(progressIvArgv));
        }

        await asyncpool(concurrency, files, processFile);

        if (progressIv) {
            clearInterval(progressIv);
        }

        if (progressIvArgv) {
            let ixS = fileIx.toString().padStart(totalFilesLength.toString().length, ' ');
            console.log(`[${ixS}/${totalFilesLength}] Uploading...`);
        }
        if (!silentArgv) {
            console.log('');
            console.log('Done. Files uploaded successful: ' + success + '. Files that failed to upload: ' +
                failed + '.');
        }
    }
    catch (ex2) {
        let ex = <Error>ex2;
        console.error('Failed to upload files', ex.message || ex.toString());
        console.error(ex);
        process.exit(1);
    }
})();

function makeWavInternal(buffer: Buffer, hmacKey: string | undefined) {
    if (dontResignArgv) {
        let isJSON = true;
        try {
            JSON.parse(buffer.toString('utf-8'));
        }
        catch (ex) {
            isJSON = false;
        }

        return {
            encoded: buffer,
            contentType: isJSON ? 'application/json' : 'application/cbor'
        };
    }

    return makeWav(buffer, hmacKey);
}

function makeCbor(buffer: Buffer) {
    return {
        encoded: buffer,
        contentType: 'application/cbor',
    };
}

function makeJson(buffer: Buffer) {
    return {
        encoded: buffer,
        contentType: 'application/json'
    };
}

async function exists(path: string) {
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
