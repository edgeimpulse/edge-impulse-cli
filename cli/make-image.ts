import crypto from 'crypto';
import borc from 'borc';
import request from 'request';
import { EdgeImpulseConfig } from './config';
import http from 'http';
import https from 'https';
import { WaveFile } from 'wavefile';
import encodeLabel from '../shared/encoding';

const keepAliveAgentHttp = new http.Agent({ keepAlive: true });
const keepAliveAgentHttps = new https.Agent({ keepAlive: true });

// These types are shared with jobs-container/node/export/shared/jobs/export.ts
export interface ExportInputBoundingBox {
    label: string;
    width: number;
    height: number;
    x: number;
    y: number;
}

export function makeImage(buffer: Buffer, hmacKey: string | undefined, fileName: string) {
    let hmacImage = crypto.createHmac('sha256', hmacKey || '');
    hmacImage.update(buffer);

    let emptySignature = Array(64).fill('0').join('');
    let mimeType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    let data = {
        protected: {
            ver: "v1",
            alg: "HS256",
        },
        signature: emptySignature,
        payload: {
            device_type: "EDGE_IMPULSE_UPLOADER",
            interval_ms: 0,
            sensors: [{ name: 'image', units: 'rgba' }],
            values: [`Ref-BINARY-${mimeType} (${buffer.length} bytes) ${hmacImage.digest().toString('hex')}`]
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
                    contentType: mimeType
                }
            }
        ]
    };
}

export function makeVideo(buffer: Buffer, hmacKey: string | undefined, fileName: string) {
    let hmacVideo = crypto.createHmac('sha256', hmacKey || '');
    hmacVideo.update(buffer);

    let emptySignature = Array(64).fill('0').join('');
    let mimeType = 'video/mp4';
    let data = {
        protected: {
            ver: "v1",
            alg: "HS256",
        },
        signature: emptySignature,
        payload: {
            device_type: "EDGE_IMPULSE_UPLOADER",
            interval_ms: 1000 / 25, // this is OK, gets figured out by ingestion
            sensors: [{ name: 'video', units: 'rgba' }],
            values: [`Ref-BINARY-${mimeType} (${buffer.length} bytes) ${hmacVideo.digest().toString('hex')}`]
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
                    contentType: mimeType
                }
            }
        ]
    };
}

export function makeWav(buffer: Buffer, hmacKey: string | undefined) {
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

    // tslint:disable-next-line: no-unsafe-any
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


export function upload(opts: {
    filename: string,
    label: string | undefined,
    allowDuplicates: boolean,
    apiKey: string,
    processed: {
        encoded: Buffer,
        contentType: string,
        attachments?: { value: Buffer, options: { contentType: string}}[]
    },
    config: EdgeImpulseConfig,
    category: string | undefined,
    dataBuffer: Buffer,
    boundingBoxes: ExportInputBoundingBox[] | undefined
}) {
    let headers: { [k: string]: string} = {
        'x-api-key': opts.apiKey,
        'x-file-name': encodeLabel(opts.filename),
        'Content-Type': (!opts.processed.attachments ? opts.processed.contentType : 'multipart/form-data'),
        'Connection': 'keep-alive'
    };

    if (opts.label) {
        headers['x-label'] = encodeLabel(opts.label);
    }
    if (!opts.allowDuplicates) {
        headers['x-disallow-duplicates'] = '1';
    }
    if (opts.boundingBoxes) {
        headers['x-bounding-boxes'] = JSON.stringify(opts.boundingBoxes);
    }

    return new Promise((res, rej) => {
        if (!opts.config) return rej('No config object');

        let agent = opts.config.endpoints.internal.ingestion.indexOf('https:') === 0 ?
            keepAliveAgentHttps :
            keepAliveAgentHttp;

        let category = opts.category;

        // if category is split we calculate the md5 hash of the buffer
        // then look at the first char in the string that's not f
        // then split 0..b => training, rest => test for a 80/20 split
        if (category === 'split') {
            let hash = crypto.createHash('md5').update(opts.dataBuffer).digest('hex');
            while (hash.length > 0 && hash[0] === 'f') {
                hash = hash.substr(1);
            }
            if (hash.length === 0) {
                return rej('Failed to calculate MD5 hash of buffer');
            }
            let firstHashChar = hash[0];

            if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b' ].indexOf(firstHashChar) > -1) {
                category = 'training';
            }
            else {
                category = 'testing';
            }
        }

        // now upload the buffer to Edge Impulse
        request.post(
            opts.config.endpoints.internal.ingestion + '/api/' + category + '/data', {
                headers: headers,
                body: (!opts.processed.attachments ? opts.processed.encoded : undefined),
                formData: (opts.processed.attachments ? {
                    body: {
                        value: opts.processed.encoded,
                        options: {
                            filename: opts.filename,
                            contentType: opts.processed.contentType
                        }
                    },
                    attachments: opts.processed.attachments
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
}

export function makeCsv(buffer: Buffer, hmacKey: string | undefined) {

    let csvFile = parseCsvString(buffer.toString('utf-8'));

    let intervalMs: number;
    let hasTimestamp = true;

    if (csvFile.length === 0) {
        throw new Error('No lines in CSV file, need at least two (a header and a line with values)');
    }

    if (Object.keys(csvFile[0]).indexOf('timestamp') > -1) {
        if (csvFile.length === 1) {
            intervalMs = 1000;
        }
        else {
            intervalMs = Number(csvFile[1].timestamp) - Number(csvFile[0].timestamp);
            if (!intervalMs || isNaN(intervalMs)) {
                throw new Error('Could not determine frequency, the timestamp column should ' +
                    'contain increasing numbers');
            }
        }
    }
    else {
        hasTimestamp = false;
        intervalMs = 1000;
        if (csvFile.length !== 1) {
            throw new Error('For CSV files without a timestamp column, need exactly one line with values (but found ' +
                csvFile.length + ')');
        }
    }

    let columns = [];
    for (let k of Object.keys(csvFile[0])) {
        if (k === 'timestamp') continue;
        columns.push(k);
    }

    let csvData: number[][] = [];

    for (let ix = 0; ix < csvFile.length; ix++) {
        let line = csvFile[ix];
        if (hasTimestamp && !('timestamp' in line)) {
            throw new Error('File does not have a timestamp column');
        }

        let lineData: number[] = [];
        for (let k of columns) {
            if (!(k in line)) {
                throw new Error('Line ' + (ix + 2) + ' is missing column ' + k);
            }
            if (isNaN(line[k])) {
                throw new Error('Line ' + (ix + 2) + ' column ' + k + ' is not numeric');
            }

            lineData.push(line[k]);
        }

        csvData.push(lineData);
    }

    // empty signature (all zeros). HS256 gives 32 byte signature, and we encode in hex,
    // so we need 64 characters here
    let emptySignature = Array(64).fill('0').join('');

    let data = {
        protected: {
            ver: "v1",
            alg: "HS256",
        },
        signature: emptySignature,
        payload: {
            device_type: "EDGE_IMPULSE_UPLOADER",
            interval_ms: intervalMs,
            sensors: columns.map(c => ({ name: c.trim(), units: 'N/A' })),
            values: csvData
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

// From https://gist.github.com/plbowers/7560ae793613ee839151624182133159
function parseCsvString(text: string) {
    // from http://stackoverflow.com/a/1293163/2343
    function CSVToArray(strData: string, strDelimiter: string) {
        // Create a regular expression to parse the CSV values.
        const objPattern = new RegExp(
            (
                // Delimiters.
                "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

                // Quoted fields.
                "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

                // Standard fields.
                "([^\"\\" + strDelimiter + "\\r\\n]*))"
            ),
            "gi"
            );

        // Create an array to hold our data. Give the array
        // a default empty first row.
        let arrData: string[][] = [[]];

        // Create an array to hold our individual pattern
        // matching groups.
        let arrMatches = null;

        // Keep looping over the regular expression matches
        // until we can no longer find a match.
        // tslint:disable-next-line: no-conditional-assignment
        while (arrMatches = objPattern.exec(strData)) {

            // Get the delimiter that was found.
            let strMatchedDelimiter = arrMatches[1];

            // Check to see if the given delimiter has a length
            // (is not the start of string) and if it matches
            // field delimiter. If id does not, then we know
            // that this delimiter is a row delimiter.
            if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
                // Since we have reached a new row of data,
                // add an empty row to our data array.
                arrData.push([]);
            }

            let strMatchedValue: string;

            // Now that we have our delimiter out of the way,
            // let's check to see which kind of value we
            // captured (quoted or unquoted).
            if (arrMatches[2]) {
                // We found a quoted value. When we capture
                // this value, unescape any double quotes.
                strMatchedValue = arrMatches[ 2 ].replace(
                    new RegExp( "\"\"", "g" ),
                    "\""
                    );

            }
            else {
                // We found a non-quoted value.
                strMatchedValue = arrMatches[ 3 ];
            }

            // Now that we have our value string, let's add
            // it to the data array.
            arrData[ arrData.length - 1 ].push(strMatchedValue);
        }

        // Return the parsed data.
        return arrData;
    }

    let firstLine = text.split('\n')[0].trim();
    let commaCount = firstLine.split(',').length;
    let semicolonCount = firstLine.split(';').length;
    let tabCount = firstLine.split('\t').length;

    let delimiter = ',';
    if (semicolonCount > commaCount && semicolonCount > tabCount) {
        delimiter = ';';
    }
    else if (tabCount > commaCount && tabCount > semicolonCount) {
        delimiter = '\t';
    }

    let lines = CSVToArray(text, delimiter);
    // console.log('Parsing CSV file, found delimiter', delimiter, 'returned', lines);
    let header = lines[0];
    if (header.length === 0) {
        throw new Error('No column names found in header');
    }

    lines = lines.filter(l => {
        return l.length === header.length;
    });

    let ret = [];
    for (let l of lines.slice(1)) {
        let obj: { [k: string]: number } = { };
        for (let ix = 0; ix < header.length; ix++) {
            let value = l[ix];
            if (value.indexOf('.') === -1 && value.indexOf(',') > -1) {
                value = value.replace(/,/g, '.');
            }

            obj[header[ix]] = value === '' ? NaN : Number(value);
        }
        ret.push(obj);
    }

    return ret;
}
