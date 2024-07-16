#!/usr/bin/env node

import fs from 'fs';
import Path from 'path';
import util from 'util';
import asyncpool from 'tiny-async-pool';
import { upload, VALID_EXTENSIONS } from './make-image';
import { getCliVersion, initCliApp, setupCliApp } from './init-cli-app';
import { Config } from './config';
import {
    ExportBoundingBoxesFileV1,
    ExportInputBoundingBox,
    ExportUploaderInfoFileCategory,
    ExportUploaderInfoFileLabel,
    parseBoundingBoxLabels,
    parseUploaderInfo
} from '../shared/bounding-box-file-types';
import { FSHelpers } from './fs-helpers';
import {
    checkDatasetMatchesFormat,
    DatasetConverterHelperCli,
    deriveDatasetFormat,
    getAllFilesInFolder
} from './dataset-converter-cli';
import {
    FormatMetadata,
    getMetadataForFormat,
    listAllAnnotationFormats,
    SupportedLabelType
} from '../shared/uploader/annotations-parsing-shared/label-file-types';

type UploaderFileType = {
    path: string,
    name: string | undefined;
    category: ExportUploaderInfoFileCategory,
    label: { type: 'infer'} | ExportUploaderInfoFileLabel,
    metadata: { [k: string]: string } | undefined,
    boundingBoxes: ExportInputBoundingBox[] | undefined,
};

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
const infoFileArgvIx = process.argv.indexOf('--info-file');
const infoFileArgv = infoFileArgvIx !== -1 ? process.argv[infoFileArgvIx + 1] : undefined;
const metadataArgvIx = process.argv.indexOf('--metadata');
const metadataArgv = metadataArgvIx !== -1 ? process.argv[metadataArgvIx + 1] : undefined;
const directoryArgvIx = process.argv.indexOf('--directory');
const directoryArgv = directoryArgvIx !== -1 ? process.argv[directoryArgvIx + 1] : undefined;
const annotationFormatArgvIx = process.argv.indexOf('--dataset-format');
const annotationFormatArgv = annotationFormatArgvIx !== -1 ? process.argv[annotationFormatArgvIx + 1] : undefined;

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

const logAllAnnotationFormats = () => {
    [{
        name: 'OBJECT DETECTION',
        key: 'object-detection',
    }, {
        name: 'SINGLE LABEL',
        key: 'single-label',
    }].forEach(type => {
        console.log(`${type.name}:`);
        console.log(listAllAnnotationFormats(type.key as SupportedLabelType)
            .map(format => `    * ${format.name} (--dataset-format ${format.key})`)
            .join('\n'));
        console.log();
    });
};

// eslint-disable-next-line @typescript-eslint/no-floating-promises
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
            console.log('    Label:      ', 'Will be inferred from folder structure');
            console.log('    Category:   ', 'Will be inferred from folder structure');
        }
        else if (annotationFormatArgv) {
            console.log('    Label:      ', 'Will be taken from any label files in the dataset');
            console.log('    Category:   ', 'Will be inferred from folder structure');
        }
        else if (infoFileArgv) {
            console.log('    Label:      ', 'Will be read from ' + infoFileArgv);
            console.log('    Category:   ', 'Will be read from ' + infoFileArgv);
        }
        else {
            console.log('    Label:      ', labelArgv || 'Not set, will be inferred from file name');
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
    if (infoFileArgv) argv += 2;
    if (metadataArgv) argv += 2;
    if (annotationFormatArgv) argv += 2;

    try {
        let concurrency = concurrencyArgv ? Number(concurrencyArgv) : 20;
        if (isNaN(concurrency)) {
            console.log('--concurrency should have a number, but was ' + concurrency);
            process.exit(1);
        }

        let files: UploaderFileType[];

        if (infoFileArgv) {
            try {
                let infoFile = parseUploaderInfo(<string>await fs.promises.readFile(infoFileArgv, 'utf-8'));
                files = [];
                for (let f of infoFile.files) {
                    if (!Path.isAbsolute(f.path)) {
                        f.path = Path.join(Path.dirname(infoFileArgv), f.path);
                    }

                    files.push({
                        category: f.category,
                        name: f.name,
                        label: f.label,
                        path: f.path,
                        metadata: f.metadata,
                        boundingBoxes: f.boundingBoxes,
                    });
                }
            }
            catch (ex2) {
                console.error('Failed to parse --info-file', ex2);
                process.exit(1);
            }
        }
        else if (directoryArgv) {
            // Check this is actually a directory
            if (!fs.statSync(directoryArgv).isDirectory()) {
                console.log(directoryArgv + ' is not a directory');
                process.exit(1);
            }

            const allFiles = getAllFilesInFolder(directoryArgv);
            if (allFiles.length === 0) {
                console.log(directoryArgv + ' contains no valid files');
                process.exit(1);
            }

            // Find the dataset format, if relevant
            let datasetFormat: FormatMetadata | undefined;

            if (annotationFormatArgv) {
                // User has specified a dataset format; check it is correct
                datasetFormat = getMetadataForFormat(annotationFormatArgv);
                if (!datasetFormat) {
                    console.log(`\nFormat '${annotationFormatArgv}' was not recognised. Supported formats:\n`);
                    logAllAnnotationFormats();
                    process.exit(1);
                }
                const formatMatches = datasetFormat.formatStyle !== 'txt' ?
                    checkDatasetMatchesFormat(allFiles, datasetFormat.key) : true;
                if (!formatMatches) {
                    console.log('\nThis directory does not appear to include any annotation files matching format ' +
                        `'${datasetFormat.key}'. If there are no annotations to convert, do not pass ` +
                        '--dataset-format when uploading your data.');
                    process.exit(1);
                }
            }
            else {
                // Try to work out what format this dataset is in
                const derivedFormat = deriveDatasetFormat(allFiles);
                if (derivedFormat) {
                    datasetFormat = getMetadataForFormat(derivedFormat);
                }
            }

            if (datasetFormat) {
                // Convert the directory into EI dataset
                try {
                    const datasetConverter = new DatasetConverterHelperCli(datasetFormat,
                        { silent: silentArgv, validExtensions: VALID_EXTENSIONS });
                    await datasetConverter.convertDataset(allFiles);

                    const samples = datasetConverter.getSamples();
                    if (!samples) {
                        throw new Error('Could not find any samples in the directory.');
                    }
                    files = [];

                    for (const sample of samples) {
                        const annotations = await datasetConverter.getAnnotationsForSample(sample);
                        files.push({
                            path: Path.join(sample.directory, sample.filename),
                            name: undefined, // infer from filename
                            category: sample.category || 'training',
                            metadata: { },
                            label: annotations.label,
                            boundingBoxes: annotations.boundingBoxes
                        });
                    }
                }
                catch (ex) {
                    console.log(`Could not convert directory: ${ex}`);
                    process.exit(1);
                }
            }
            else {
                // Just upload the directory
                const dir = await fs.promises.realpath(directoryArgv);
                let dirs = await fs.promises.readdir(dir);
                if (!dirs.find(x => x === 'training') || !dirs.find(x => x === 'testing')) {
                    console.log('\nThe format of the dataset in this directory was not recognised. Select a ' +
                        'directory containing both "training" and "testing" folders, or upload data in ' +
                        'another supported format:\n');
                    logAllAnnotationFormats();
                    process.exit(1);
                }

                files = [];

                for (let c of [ 'training', 'testing' ]) {
                    for (let f of await fs.promises.readdir(Path.join(dir, c))) {
                        let fullPath = Path.join(dir, c, f);

                        if (f.startsWith('.')) continue;

                        files.push({
                            category: <ExportUploaderInfoFileCategory>c,
                            name: undefined, // infer from filename
                            label: { type: 'infer' },
                            path: fullPath,
                            metadata: { },
                            boundingBoxes: [],
                        });
                    }
                }
            }
        }
        else {

            let fileArgs = process.argv.slice(argv);

            if (fileArgs.length === 1 && Path.basename(fileArgs[0]) === 'bounding_boxes.labels') {
                console.log(``);
                console.log(`You don't need to upload "bounding_boxes.labels". When uploading an image we check ` +
                            `whether ` +
                            `a labels file is present in the same folder, and automatically attach the bounding ` +
                            `boxes to the image.`);
                console.log(`So you can just do:`);
                console.log(`    edge-impulse-uploader yourimage.jpg`);
                console.log(``);
                process.exit(1);
            }

            // exclude 'bounding_boxes.labels'
            fileArgs = fileArgs.filter(f => Path.basename(f) !== 'bounding_boxes.labels');

            if (!fileArgs[0]) {
                console.log('Requires at least one argument (a ' +
                    VALID_EXTENSIONS.slice(0, VALID_EXTENSIONS.length - 1).join(', ') + ' or ' +
                    VALID_EXTENSIONS[VALID_EXTENSIONS.length - 1] + ' file)');
                process.exit(1);
            }

            let metadata: { [k: string] : string } | undefined;
            if (metadataArgv) {
                try {
                    metadata = <{ [k: string] : string }>JSON.parse(metadataArgv);
                }
                catch (ex) {
                    console.log('--metadata is not valid JSON');
                    process.exit(1);
                }
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
                            name: undefined, // infer from filename
                            category: 'split',
                            label: { type: 'label', label: categoryFolder.replace('.class', '') },
                            metadata: metadata,
                            boundingBoxes: undefined,
                        });
                    }
                }
            }
            else {
                // Check if the user passed a directory
                if (fileArgs.length === 1 && fs.statSync(fileArgs[0]).isDirectory()) {
                    console.log('Cannot handle file, file is a directory. Please use --directory to upload.');
                    process.exit(1);
                }

                // Check extension is valid
                if (VALID_EXTENSIONS.indexOf(Path.extname(fileArgs[0].toLowerCase())) === -1) {
                    console.log('Cannot handle this file, only ' +
                        VALID_EXTENSIONS.join(', ') + ' supported:', fileArgs[0]);
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
                        name: undefined, // infer from filename
                        category: (<ExportUploaderInfoFileCategory | undefined>categoryArgv) || 'training',
                        label: labelArgv ? {
                            type: 'label',
                            label: labelArgv
                        } : { type: 'infer' },
                        metadata: metadata,
                        boundingBoxes: undefined,
                    };
                });
            }
        }

        const { projectId, devKeys } = await setupCliApp(configFactory, config, cliOptions, undefined);

        await configFactory.setUploaderProjectId(projectId);

        if (!silentArgv) {
            const projectInfo = await config.api.projects.getProjectInfo(projectId);
            let studioUrl = config.endpoints.internal.api.replace('/v1', '');
            if (projectInfo.project.whitelabelId) {
                const whitelabelRes = await config.api.whitelabels.getWhitelabelDomain(
                    projectInfo.project.whitelabelId
                );
                if (whitelabelRes.domain) {
                    const protocol = config.endpoints.internal.api.startsWith('https') ? 'https' : 'http';
                    studioUrl = `${protocol}://${whitelabelRes.domain}`;
                }
            }

            console.log(`Uploading to project "${projectInfo.project.owner} / ${projectInfo.project.name}" ` +
                `(${studioUrl}/studio/${projectId})`);
            console.log(``);
        }

        let fileIx = startIxArgv ? Number(startIxArgv) : 0;
        let success = 0;
        let failed = 0;
        let totalFilesLength = endIxArgv ? Number(endIxArgv) : files.length;

        let boundingBoxCache: { [dir: string]: ExportBoundingBoxesFileV1 | undefined } = { };

        let allDirectories = [...new Set(files.map(f => Path.resolve(Path.dirname(f.path))))];
        const loadBoundingBoxCache = async (directory: string) => {
            let labelsFile = Path.join(directory, 'bounding_boxes.labels');

            if (!await FSHelpers.exists(labelsFile)) {
                boundingBoxCache[directory] = undefined;
            }
            else {
                try {
                    boundingBoxCache[directory] = parseBoundingBoxLabels(
                        <string>await fs.promises.readFile(labelsFile, 'utf-8'));
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
            let boundingBoxes = boundingBoxesFile ?
                (boundingBoxesFile.boundingBoxes[Path.basename(file.path)] || undefined) :
                undefined;
            if (!boundingBoxes && file.boundingBoxes) {
                boundingBoxes = file.boundingBoxes;
            }

            try {
                let hrstart = Date.now();

                let filename: string;
                if (file.name) {
                    filename = file.name;
                    let ext = Path.extname(file.path);
                    if (ext) {
                        filename += ext;
                    }
                }
                else {
                    filename = Path.basename(file.path);
                }

                await upload({
                    filename: filename,
                    buffer: await fs.promises.readFile(file.path),
                    apiKey: apiKeyArgv || devKeys.apiKey || '',
                    allowDuplicates: allowDuplicatesArgv,
                    category: file.category,
                    config: config,
                    label: file.label,
                    boundingBoxes: boundingBoxes,
                    metadata: file.metadata,
                    addDateId: false,
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
