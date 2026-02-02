import Path from 'node:path';
import { fetch, FormData } from 'undici';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { Blob } from 'node:buffer';
import { Config, EdgeImpulseConfig } from './config';
import encodeLabel from '../shared/encoding';
import { ExportBoundingBoxesFileV1, ExportInputBoundingBox, ExportStructuredLabelsFileV1,
    ExportUploaderInfoFileCategory, ExportUploaderInfoFileLabel } from '../shared/bounding-box-file-types';

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
    '.parquet': 'application/vnd.apache.parquet',
};

export const VALID_EXTENSIONS = Object.keys(EXTENSION_MAPPING);

export async function upload(opts: {
    projectId: number,
    filename: string,
    buffer: Buffer,
    label: { type: 'infer'} | ExportUploaderInfoFileLabel,
    allowDuplicates: boolean,
    apiKey: string,
    config: EdgeImpulseConfig,
    category: ExportUploaderInfoFileCategory | undefined,
    boundingBoxes: ExportInputBoundingBox[] | undefined,
    metadata: { [k: string]: string } | undefined,
    addDateId: boolean,
    configFactory: Config,
}) {
    let ext = Path.extname(opts.filename).toLowerCase();

    if (ext === '.csv' || ext === '.txt') {
        const project = await opts.config.api.projects.getProjectInfo(opts.projectId);

        if (project.csvImportConfig) {
            if (opts.buffer.length >= 2 * 1024 * 1024 * 1024) {
                throw new Error('File too large, max. size is 2GiB');
            }
        }
        else {
            if (opts.buffer.length >= 100 * 1024 * 1024) {
                const studioUrl = await opts.configFactory.getStudioUrl(project.project.whitelabelId);
                const csvLink = `${studioUrl}/studio/${opts.projectId}/upload/csv`;

                throw new Error(`The max. size for TXT / CSV files is 100MiB unless you have configured ` +
                    `the CSV wizard via ${csvLink}, then the max. size is 2GiB before splitting the CSV file. ` +
                    `Samples after splitting should be <100MiB.`);
            }
        }
    }
    else {
        // all other files
        if (opts.buffer.length >= 100 * 1024 * 1024) {
            throw new Error('File too large, max. size is 100MB');
        }
    }

    let headers: { [k: string]: string} = {
        'x-api-key': opts.apiKey,
        'x-upload-source': 'EDGE_IMPULSE_CLI_UPLOADER',
        'Connection': 'keep-alive'
    };

    if (opts.label.type === 'label') {
        headers['x-label'] = encodeLabel(opts.label.label);
    }
    else if (opts.label.type === 'unlabeled') {
        headers['x-label'] = encodeLabel('');
        headers['x-no-label'] = '1';
    }
    else if (opts.label.type === 'multi-label') {
        // gets set with a separate file, see below
    }

    if (!opts.allowDuplicates) {
        headers['x-disallow-duplicates'] = '1';
    }
    if (opts.metadata) {
        headers['x-metadata'] = JSON.stringify(opts.metadata);
    }
    if (opts.addDateId) {
        headers['x-add-date-id'] = '1';
    }

    headers['x-device-type'] = 'EDGE_IMPULSE_CLI';

    let category = opts.category;

    const form = new FormData();
    form.append('data', new Blob([ opts.buffer ], {
        type: EXTENSION_MAPPING[ext] || 'application/octet-stream',
    }), opts.filename);
    if (opts.label.type === 'multi-label') {
        let labelsFile: ExportStructuredLabelsFileV1 = {
            type: 'structured-labels',
            version: 1,
            structuredLabels: { }
        };
        labelsFile.structuredLabels[opts.filename] = opts.label.labels;
        form.append('data', new Blob([ JSON.stringify(labelsFile) ], {
            type: 'application/json',
        }), 'structured_labels.labels');
    }
    if (opts.boundingBoxes) {
        let bbsFile: ExportBoundingBoxesFileV1 = {
            version: 1,
            type: 'bounding-box-labels',
            boundingBoxes: { },
        };
        bbsFile.boundingBoxes[opts.filename] = opts.boundingBoxes;
        form.append('data', new Blob([ JSON.stringify(bbsFile) ], {
            type: 'application/json',
        }), 'bounding_boxes.labels');
    }

    let res = await fetch(opts.config.endpoints.internal.ingestion + '/api/' + category + '/files', {
        method: 'POST',
        headers: headers,
        body: form,
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
