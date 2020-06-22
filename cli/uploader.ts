#!/usr/bin/env node

import fs from 'fs';
import crypto from 'crypto';
import Path from 'path';
import request from 'request';
import inquirer from 'inquirer';
import { Config, EdgeImpulseConfig } from './config';
import checkNewVersions from './check-new-version';
import util from 'util';
import http from 'http';
import https from 'https';
import { WaveFile } from 'wavefile';
import asyncpool from 'tiny-async-pool';
import borc from 'borc';

const keepAliveAgentHttp = new http.Agent({ keepAlive: true });
const keepAliveAgentHttps = new https.Agent({ keepAlive: true });

const version = JSON.parse(fs.readFileSync(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8')).version;
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

// tslint:disable-next-line:no-floating-promises
(async () => {
    if (!silentArgv) {
        console.log('Edge Impulse uploader v' + version);
    }
    if (helpArgv) {
        console.log('Usage:');
        console.log('    edge-impulse-uploader --label glass-breaking --category training path/to/file.wav');
        console.log('');
        console.log('See https://docs.edgeimpulse.com/docs/cli-uploader for all arguments');
        process.exit(1);
    }

    const configFactory = new Config();
    let config: EdgeImpulseConfig | undefined;

    try {
        if (cleanArgv || apiKeyArgv) {
            await configFactory.clean();
        }

        try {
            await checkNewVersions(configFactory);
        }
        catch (ex) {
            /* noop */
        }

        // this verifies host settings and verifies the JWT token
        try {
            config = await configFactory.verifyLogin(devArgv, apiKeyArgv);
        }
        catch (ex) {
            console.log('Stored token seems invalid, clearing cache...');
            await configFactory.clean();
            config = await configFactory.verifyLogin(devArgv, apiKeyArgv);
        }
    }
    catch (ex) {
        if (ex.statusCode) {
            console.error('Failed to authenticate with Edge Impulse', ex.statusCode, ex.response.body);
        }
        else {
            console.error('Failed to authenticate with Edge Impulse', ex.message || ex.toString());
        }
        process.exit(1);
    }

    if (!config) return;

    if (!silentArgv) {
        console.log('Endpoints:');
        console.log('    API:      ', config.endpoints.internal.api);
        console.log('    Ingestion:', config.endpoints.internal.ingestion);
        console.log('');

        console.log('Upload configuration:');
        console.log('    Label:    ', labelArgv || 'Not set, will be infered from file name');
        console.log('    Category: ', categoryArgv || 'training');
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
            '.jpeg'
        ];

        let files = process.argv.slice(argv);

        if (!files[0]) {
            console.log('Requires at least one argument (a ' +
                validExtensions.slice(0, validExtensions.length - 1).join(', ') + ' or ' +
                validExtensions[validExtensions.length - 1] + ' file)');
            process.exit(1);
        }

        if (validExtensions.indexOf(Path.extname(files[0].toLowerCase())) === -1) {
            console.log('Cannot handle this file, only ' + validExtensions.join(', ') + ' supported:', files[0]);
            process.exit(1);
        }

        // Windows doesn't do expansion like Mac and Linux...
        if (Path.basename(files[0], Path.extname(files[0])) === '*') {
            files = (await util.promisify(fs.readdir)(Path.dirname(files[0]))).filter(v => {
                return Path.extname(v) === Path.extname(files[0]);
            }).map(f => Path.join(Path.dirname(files[0]), f));
        }

        let projectId = await configFactory.getUploaderProjectId();

        if (!projectId) {
            if (!silentArgv) {
                console.log('');
            }

            let projectList = (await config.api.projects.listProjects()).body;

            if (!projectList.success) {
                console.error('Failed to retrieve project list...', projectList, projectList.error);
                process.exit(1);
            }

            if (!projectList.projects || projectList.projects.length === 0) {
                console.log('This user has no projects, create one before continuing');
                process.exit(1);
            }
            else if (projectList.projects && projectList.projects.length === 1) {
                projectId = projectList.projects[0].id;
            }
            else {
                let inqRes = await inquirer.prompt([{
                    type: 'list',
                    choices: (projectList.projects || []).map(p => ({ name: p.name, value: p.id })),
                    name: 'project',
                    message: 'To which project do you want to upload the data?',
                    pageSize: 20
                }]);
                projectId = Number(inqRes.project);
            }

            await configFactory.setUploaderProjectId(projectId);
        }
        else {
            if (!silentArgv) {
                console.log('    Project ID: ', projectId);
                console.log('');
            }
        }

        let devKeys = (await config.api.projects.listDevkeys(projectId)).body;

        if (!apiKeyArgv && !devKeys.apiKey) {
            throw new Error('No API key set (via --api-key), and no development API keys configured for ' +
                'this project. Add a development API key from the Edge Impulse dashboard to continue.');
        }

        let fileIx = startIxArgv ? Number(startIxArgv) : 0;
        let success = 0;
        let failed = 0;
        let totalFilesLength = endIxArgv ? Number(endIxArgv) : files.length;

        const processFile = async (name: string) => {
            const buffer = await fs.promises.readFile(name);

            let processed: { encoded: Buffer, contentType: string,
                attachments?: { value: Buffer, options: { contentType: string}}[] };

            try {
                switch (Path.extname(name).toLowerCase()) {
                    case '.wav':
                        processed = makeWav(buffer, hmacKeyArgv || devKeys.hmacKey);
                        break;
                    case '.cbor':
                        processed = makeCbor(buffer);
                        break;
                    case '.json':
                        processed = makeJson(buffer);
                        break;
                    case '.jpg':
                    case '.jpeg':
                        processed = makeImage(buffer, hmacKeyArgv || devKeys.hmacKey, Path.basename(name));
                        break;
                    default:
                        throw new Error('extension not supported (only ' +
                            validExtensions.slice(0, validExtensions.length - 1).join(', ') + ' and ' +
                            validExtensions[validExtensions.length - 1] + ' supported)');
                }
            }
            catch (ex) {
                let ix = ++fileIx;
                let ixS = ix.toString().padStart(totalFilesLength.toString().length, ' ');
                console.error(`[${ixS}/${totalFilesLength}] Failed to process`, name, ex.message || ex.toString());
                failed++;
                return;
            }

            let filename = Path.basename(name).split('.')[0];

            let headers: { [k: string]: string} = {
                'x-api-key': apiKeyArgv || devKeys.apiKey || '',
                'x-file-name': filename,
                'Content-Type': (!processed.attachments ? processed.contentType : 'multipart/form-data'),
                'Connection': 'keep-alive'
            };
            if (labelArgv) {
                headers['x-label'] = labelArgv;
            }

            try {
                let hrstart = Date.now();
                await new Promise((res, rej) => {
                    if (!config) return rej('No config object');

                    let agent = config.endpoints.internal.ingestion.indexOf('https:') === 0 ?
                        keepAliveAgentHttps :
                        keepAliveAgentHttp;

                    // now upload the buffer to Edge Impulse
                    request.post(
                        config.endpoints.internal.ingestion + '/api/' + (categoryArgv || 'training') + '/data', {
                            headers: headers,
                            body: (!processed.attachments ? processed.encoded : undefined),
                            formData: (processed.attachments ? {
                                body: {
                                    value: processed.encoded,
                                    options: {
                                        filename: filename,
                                        contentType: processed.contentType
                                    }
                                },
                                attachments: processed.attachments
                            } : undefined),
                            encoding: null,
                            agent: agent
                        }, (err, response, body) => {
                            if (err) return rej(err);
                            if (response.statusCode !== 200) {
                                return rej(body || response.statusCode.toString());
                            }
                            res(body);
                        });
                });

                let ix = ++fileIx;
                let ixS = ix.toString().padStart(totalFilesLength.toString().length, ' ');
                if (!progressIvArgv) {
                    console.log(`[${ixS}/${totalFilesLength}] Uploading`, name,
                        'OK (' + (Date.now() - hrstart) + ' ms)');
                }
                else if (ix === 1) {
                    console.log(`[${ixS}/${totalFilesLength}] Uploading...`);
                }
                success++;
            }
            catch (ex) {
                let ix = ++fileIx;
                let ixS = ix.toString().padStart(totalFilesLength.toString().length, ' ');
                console.log(`[${ixS}/${totalFilesLength}] Failed to upload`, name,
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
    catch (ex) {
        console.error('Failed to upload files', ex.message || ex.toString());
        console.error(ex);
        process.exit(1);
    }
})();

function makeWav(buffer: Buffer, hmacKey: string | undefined) {
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

    if (buffer.slice(0, 4).toString('ascii') !== 'RIFF') {
        throw new Error('Not a WAV file, first four bytes are not RIFF but ' +
            buffer.slice(0, 4).toString('ascii'));
    }

    const wav = new WaveFile(buffer);
    wav.toBitDepth('16');

    const fmt = (<{
        chunkId: string,
        chunkSize: number,
        audioFormat: number,
        numChannels: number,
        sampleRate: number,
        byteRate: number,
        blockAlign: number,
        bitsPerSample: number,
        cbSize: number,
        validBitsPerSample: number,
        dwChannelMask: number,
    }>wav.fmt);

    let freq = fmt.sampleRate;
    // console.log('Frequency', freq);

    let totalSamples =  (<any>wav.data).samples.length / (fmt.bitsPerSample / 8);

    let dataBuffers: number[] = [];

    for (let sx = 0; sx < totalSamples; sx += fmt.numChannels) {
        try {
            let sum = 0;

            for (let channelIx = 0; channelIx < fmt.numChannels; channelIx++) {
                sum += wav.getSample(sx + channelIx);
            }

            dataBuffers.push(sum / fmt.numChannels);
        }
        catch (ex) {
            console.error('failed to call getSample() on WAV file', sx, ex);
            throw ex;
        }
    }

    // empty signature (all zeros). HS256 gives 32 byte signature, and we encode in hex,
    // so we need 64 characters here
    let emptySignature = Array(64).fill('0').join('');

    let data = {
        protected: {
            ver: "v1",
            alg: "HS256",
            iat: Math.floor(Date.now() / 1000) // epoch time, seconds since 1970
        },
        signature: emptySignature,
        payload: {
            device_type: "EDGE_IMPULSE_UPLOADER",
            interval_ms: 1000 / freq,
            sensors: [{ name: 'audio', units: 'wav' }],
            values: dataBuffers
        }
    };

    let encoded = JSON.stringify(data);

    // now calculate the HMAC and fill in the signature
    let hmac = crypto.createHmac('sha256', hmacKey || '');
    hmac.update(encoded);
    let signature = hmac.digest().toString('hex');

    // update the signature in the message and re-encode
    data.signature = signature;
    encoded = JSON.stringify(data);

    return {
        encoded: Buffer.from(encoded, 'utf-8'),
        contentType: 'application/json'
    };
}

function makeImage(buffer: Buffer, hmacKey: string | undefined, fileName: string) {
    let hmacImage = crypto.createHmac('sha256', hmacKey || '');
    hmacImage.update(buffer);

    let emptySignature = Array(64).fill('0').join('');

    let data = {
        protected: {
            ver: "v1",
            alg: "HS256",
            iat: Math.floor(Date.now() / 1000)
        },
        signature: emptySignature,
        payload: {
            device_type: "EDGE_IMPULSE_UPLOADER",
            interval_ms: 0,
            sensors: [{ name: 'image', units: 'rgba' }],
            values: [`Ref-BINARY-image/jpeg (${buffer.length} bytes) ${hmacImage.digest().toString('hex')}`]
        }
    };

    let encoded = borc.encode(data);
    let hmac = crypto.createHmac('sha256', hmacKey || '');
    hmac.update(encoded);
    let signature = hmac.digest().toString('hex');
    data.signature = signature;

    return {
        encoded: borc.encode(data),
        contentType: 'application/cbor',
        attachments: [
            {
                value: buffer,
                options: {
                    filename: fileName,
                    contentType: 'image/jpeg'
                }
            }
        ]
    };
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
