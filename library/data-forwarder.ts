import crypto from 'crypto';
import request from 'request';
import http from 'http';
import https from 'https';

import encodeIngestionHeader from '../shared/encoding';

const keepAliveAgentHttp = new http.Agent({ keepAlive: true });
const keepAliveAgentHttps = new https.Agent({ keepAlive: true });

export class DataForwarder {
    private _options: {
        deviceId: string | undefined,
        deviceType: string,
        sensors: { name: string, units: string }[],
        intervalMs: number,
        ingestionHost: string,
        hmacKey: string,
        apiKey: string
    };
    private _samples: number[][] = [];

    constructor(options: {
        deviceId?: string,
        deviceType: string,
        sensors: { name: string, units: string }[],
        intervalMs?: number,
        frequency?: number,
        host?: string,
        hmacKey?: string,
        apiKey: string
    }) {
        this._options = {
            deviceId: options.deviceId,
            deviceType: options.deviceType,
            sensors: options.sensors,
            apiKey: options.apiKey || '',
            hmacKey: options.hmacKey || '0',
            intervalMs: options.intervalMs || (1000 / (options.frequency || 1)),
            ingestionHost: options.host || 'edgeimpulse.com'
        };

        if (typeof options.frequency === 'undefined' && typeof options.intervalMs === 'undefined') {
            throw new Error('Either "frequency" or "intervalMs" is required');
        }
        if (typeof options.host === 'undefined') {
            if (process.env.EI_HOST) {
                options.host = process.env.EI_HOST;
            }
            else {
                options.host = 'edgeimpulse.com';
            }
        }

        if (options.host === 'localhost') {
            this._options.ingestionHost = 'http://localhost:4810';
        }
        else if (options.host.endsWith('test.edgeimpulse.com')) {
            this._options.ingestionHost = 'http://ingestion.' + options.host;
        }
        else {
            this._options.ingestionHost = 'https://ingestion.' + options.host;
        }
        if (typeof options.apiKey !== 'string') {
            throw new Error('"apiKey" is required');
        }
        if (typeof options.deviceType !== 'string') {
            throw new Error('"deviceType" is required');
        }
        if (!Array.isArray(options.sensors)) {
            throw new Error('"sensors" is required');
        }
        for (let a of options.sensors) {
            if (typeof a.name !== 'string' || typeof a.units !== 'string') {
                throw new Error('"name" and "units" are required for all sensors');
            }
        }
    }

    addData(data: number[]) {
        if (data.length !== this._options.sensors.length) {
            throw new Error('Invalid data, expected ' + this._options.sensors.length + ' values, but got: ' +
                data.length);
        }

        this._samples.push(data);
    }

    async upload(opts: {
        filename: string,
        label?: string,
        allowDuplicates?: boolean,
        category: 'training' | 'testing' | 'split',
    }) {
        let emptySignature = Array(64).fill('0').join('');

        let data = {
            protected: {
                ver: "v1",
                alg: "HS256",
                iat: Math.floor(Date.now() / 1000) // epoch time, seconds since 1970
            },
            signature: emptySignature,
            payload: {
                device_name: this._options.deviceId,
                device_type: this._options.deviceType,
                interval_ms: this._options.intervalMs,
                sensors: this._options.sensors,
                values: this._samples
            }
        };

        let encodedJson = Buffer.from(JSON.stringify(data), 'utf-8');

        let hmacJson = crypto.createHmac('sha256', this._options.hmacKey);
        hmacJson.update(encodedJson);
        let signatureJson = hmacJson.digest().toString('hex');

        // now find the empty signature in our encoded buffer
        let jsonSigIx = encodedJson.indexOf(emptySignature);
        if (jsonSigIx === -1) {
            throw new Error('Could not find empty signature in encoded JSON object');
        }

        encodedJson = Buffer.concat([
            encodedJson.slice(0, jsonSigIx),
            Buffer.from(signatureJson, 'ascii'),
            encodedJson.slice(jsonSigIx + signatureJson.length)
        ]);

        let dataBuffer = encodedJson;

        let headers: { [k: string]: string} = {
            'x-api-key': this._options.apiKey,
            'x-file-name': encodeIngestionHeader(opts.filename),
            'Content-Type': 'application/json',
            'Connection': 'keep-alive'
        };
        if (opts.label) {
            headers['x-label'] = encodeIngestionHeader(opts.label);
        }
        if (opts.allowDuplicates !== true) {
            headers['x-disallow-duplicates'] = '1';
        }

        return new Promise((res, rej) => {
            let agent = this._options.ingestionHost.indexOf('https:') === 0 ?
                keepAliveAgentHttps :
                keepAliveAgentHttp;

            let category = opts.category;

            // now upload the buffer to Edge Impulse
            request.post(
                this._options.ingestionHost + '/api/' + category + '/data', {
                    headers: headers,
                    body: dataBuffer,
                    encoding: null,
                    agent: agent
                }, (err, response, body) => {
                    if (err) return rej(err);
                    if (response.statusCode !== 200) {
                        if (body instanceof Buffer) {
                            return rej(body.toString('utf-8'));
                        }
                        return rej(body || response.statusCode.toString());
                    }
                    res(body instanceof Buffer ? body.toString('utf-8') : body);
                });
        });
    }
}
