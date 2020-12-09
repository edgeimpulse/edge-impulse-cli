import crypto from 'crypto';
import borc from 'borc';

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
