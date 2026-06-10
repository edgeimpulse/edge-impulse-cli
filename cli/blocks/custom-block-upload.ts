import crypto from 'node:crypto';
import fs from 'node:fs';
import { request } from 'undici';
import * as models from '../../sdk/studio/sdk/model/models';
import { CLIBlockType } from '../../shared/parameters-json-types';

export function getUploadTypeForBlockType(blockType: CLIBlockType): models.UploadCustomBlockRequestTypeEnum {
    switch (blockType) {
        case 'dsp':
            return 'dsp';
        case 'deploy':
            return 'deploy';
        case 'machine-learning':
            return 'transferLearning';
        case 'transform':
        case 'synthetic-data':
        case 'ai-action':
            return 'transform';
        default:
            throw new Error('Failed to determine uploadType ("' + blockType + '")');
    }
}

export async function calculateFileSha256(filePath: string) {
    return await new Promise<string>((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);

        stream.on('data', chunk => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

export async function uploadFileToSignedUrl(opts: {
    url: string,
    filePath: string,
    fileSize: number,
    fileHash: string,
}) {
    const response = await request(opts.url, {
        method: 'PUT',
        headers: {
            'content-length': String(opts.fileSize),
            'content-type': 'application/octet-stream',
            'x-amz-checksum-sha256': Buffer.from(opts.fileHash, 'hex').toString('base64'),
            'x-amz-meta-filehash': opts.fileHash,
        },
        body: fs.createReadStream(opts.filePath),
        maxRedirections: 0,
    });

    const responseBody = await response.body.text();
    if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(
            `Signed upload failed with status ${response.statusCode}` +
            (responseBody ? `: ${responseBody}` : '.')
        );
    }
}
