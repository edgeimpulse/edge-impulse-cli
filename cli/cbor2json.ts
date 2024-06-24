import cbor from 'cbor';
import fs from 'fs';
import Path from 'path';

function decodeCBOR(obj: any): Promise<any> {
    return new Promise((res, rej) => {
        let decoder = new cbor.Decoder();
        let data: any;
        decoder.on('data', buf => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            data = buf;
        });
        decoder.on('error', rej);
        decoder.on('finish', () => res(data));
        decoder.end(obj);
    });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    let files = process.argv.slice(2);

    let ix = 0;

    for (let f of files) {
        if (Path.extname(f) !== '.cbor') continue;

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        let d = await decodeCBOR(fs.readFileSync(f));
        let dir = Path.dirname(f);
        fs.writeFileSync(Path.join(dir, Path.basename(f, '.cbor') + '.json'), JSON.stringify(d), 'utf8');
        console.log(`[${++ix}/${files.length}] Written ${Path.join(dir, Path.basename(f, '.cbor') + '.json')}`);
    }
})();
