import crypto from 'crypto';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { EdgeImpulseConfig } from './config';
import http from 'http';
import https from 'https';
import encodeLabel from '../shared/encoding';
import Path from 'path';
import { ExportInputBoundingBox } from '../shared/bounding-box-file-types';

const keepAliveAgentHttp = new http.Agent({ keepAlive: true });
const keepAliveAgentHttps = new https.Agent({ keepAlive: true });

export const EXTENSION_MAPPING: { [k: string]: string } = {
    '.wav': 'audio/wav',
    '.cbor': 'application/cbor',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.csv': 'text/csv',
    '.txt': 'text/plain',
    '.mp4': 'video/mp4',
    '.avi': 'video/avi',
};

export const VALID_EXTENSIONS = Object.keys(EXTENSION_MAPPING);

export async function upload(opts: {
    filename: string,
    buffer: Buffer,
    label: { type: 'unlabeled' } | { type: 'infer'} | { type: 'label', label: string },
    allowDuplicates: boolean,
    apiKey: string,
    config: EdgeImpulseConfig,
    category: string | undefined,
    boundingBoxes: ExportInputBoundingBox[] | undefined,
    metadata: { [k: string]: string } | undefined,
    addDateId: boolean,
}) {
    if (opts.buffer.length > 100 * 1024 * 1024) {
        throw new Error('File too large, max. size is 100MB');
    }

    let ext = Path.extname(opts.filename).toLowerCase();

    let headers: { [k: string]: string} = {
        'x-api-key': opts.apiKey,
        'Connection': 'keep-alive'
    };

    if (opts.label.type === 'label') {
        headers['x-label'] = encodeLabel(opts.label.label);
    }
    else if (opts.label.type === 'unlabeled') {
        headers['x-label'] = encodeLabel('');
        headers['x-no-label'] = '1';
    }

    if (!opts.allowDuplicates) {
        headers['x-disallow-duplicates'] = '1';
    }
    if (opts.boundingBoxes) {
        headers['x-bounding-boxes'] = JSON.stringify(opts.boundingBoxes);
    }
    if (opts.metadata) {
        headers['x-metadata'] = JSON.stringify(opts.metadata);
    }
    if (opts.addDateId) {
        headers['x-add-date-id'] = '1';
    }

    let agent = opts.config.endpoints.internal.ingestion.indexOf('https:') === 0 ?
        keepAliveAgentHttps :
        keepAliveAgentHttp;

    let category = opts.category;

    // if category is split we calculate the md5 hash of the buffer
    // then look at the first char in the string that's not f
    // then split 0..b => training, rest => test for a 80/20 split
    if (category === 'split') {
        let hash = crypto.createHash('md5').update(opts.buffer).digest('hex');
        while (hash.length > 0 && hash[0] === 'f') {
            hash = hash.substr(1);
        }
        if (hash.length === 0) {
            throw new Error('Failed to calculate MD5 hash of buffer');
        }
        let firstHashChar = hash[0];

        if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b' ].indexOf(firstHashChar) > -1) {
            category = 'training';
        }
        else {
            category = 'testing';
        }
    }

    const form = new FormData();
    form.append('data', opts.buffer, {
        filename: opts.filename,
        contentType: EXTENSION_MAPPING[ext] || 'application/octet-stream',
    });

    let res = await fetch(opts.config.endpoints.internal.ingestion + '/api/' + category + '/files', {
        method: 'POST',
        headers: headers,
        body: form,
        agent: agent,
        compress: true,
    });

    let body = await res.text();
    let msg: ({ success: false, error: string } |
        { success: true, files: ({ success: false, error: string } | { success: true })[]}) | undefined;
    try {
        msg = <{ success: false, error: string } |
            { success: true, files: ({ success: false, error: string } | { success: true })[]}>JSON.parse(body);
    }
    catch (ex2) {
        // noop
    }

    if (res.status !== 200) {
        if (msg && msg.success === false) {
            throw new Error(msg.error);
        }
        throw new Error(body || res.status.toString());
    }

    if (!msg) {
        throw new Error('Ingestion returned 200, but body is not a valid response message: ' +
            body);
    }
    if (!msg.success) {
        throw new Error(msg.error);
    }
    for (let f of msg.files) {
        if (!f.success) {
            throw new Error(f.error);
        }
    }
}
