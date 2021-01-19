#!/usr/bin/env node

import program from 'commander';
import fs from 'fs';
import Path from 'path';
import jpegjs from 'jpeg-js';

const packageVersion = (<{ version: string }>JSON.parse(fs.readFileSync(
    Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'))).version;

program
    .description('Dump framebuffer as JPG file')
    .version(packageVersion)
    .option('-b --framebuffer <base64>', 'Framebuffer in base64 format or as a list of RGB888 values')
    .option('-f --framebuffer-file <file>', 'File with framebuffer in base64 format or as a list of RGB888 values')
    .option('-w --width <n>', 'Width of the framebuffer')
    .option('-h --height <n>', 'Height of the framebuffer')
    .option('-o --output-file <file>', 'Output file')
    .allowUnknownOption(false)
    .parse(process.argv);

const frameBuffer = <string | undefined>program.framebuffer;
const frameBufferFile = <string | undefined>program.framebufferFile;
const width: number = Number(program.width);
const height: number = Number(program.height);
const outputFile = <string | undefined>program.outputFile;

(() => {
    if (frameBuffer && frameBufferFile) {
        console.error('Should specify either --framebuffer or --framebuffer-file, not both');
        return process.exit(1);
    }
    if (!frameBuffer && !frameBufferFile) {
        console.error('Missing --framebuffer or --framebuffer-file');
        return process.exit(1);
    }
    if (frameBufferFile && !fs.existsSync(frameBufferFile)) {
        console.error(frameBufferFile + ' does not exist');
        return process.exit(1);
    }
    if (isNaN(width)) {
        console.error('Missing --width (or not a number)');
        return process.exit(1);
    }
    if (isNaN(height)) {
        console.error('Missing --height (or not a number)');
        return process.exit(1);
    }
    if (!outputFile) {
        console.error('Missing --output-file');
        return process.exit(1);
    }

    const s = frameBufferFile ? fs.readFileSync(frameBufferFile, 'utf-8') : (frameBuffer || '');

    let snapshot: Buffer;
    // first we try to read the framebuffer as a features array (0x383c2b, 0x343827, 0x2b2f1e ...)
    let features = s.split(',').map(n => Number(n));
    if (features.length === width * height) {
        snapshot = Buffer.alloc(width * height * 3);
        let six = 0;
        for (let f of features) {
            // tslint:disable-next-line: no-bitwise
            snapshot[six++] = f >> 16 & 0xff;
            // tslint:disable-next-line: no-bitwise
            snapshot[six++] = f >> 8 & 0xff;
            // tslint:disable-next-line: no-bitwise
            snapshot[six++] = f >> 0 & 0xff;
        }
    }
    // if not the same, we try to parse it as base64
    else {
        snapshot = Buffer.from(s, 'base64');
    }

    let depth = snapshot.length / (width * height);
    if (depth !== 1 && depth !== 3) {
        console.error('Invalid length for snapshot, expected ' +
            (width * height) + ' or ' + (width * height * 3) + ' values, but got ' +
            snapshot.length);
        process.exit(1);
    }

    let frameData = Buffer.alloc(width * height * 4);
    let frameDataIx = 0;
    for (let ix = 0; ix < snapshot.length; ix += depth) {
        if (depth === 1) {
            frameData[frameDataIx++] = snapshot[ix]; // r
            frameData[frameDataIx++] = snapshot[ix]; // g
            frameData[frameDataIx++] = snapshot[ix]; // b
            frameData[frameDataIx++] = 255;
        }
        else {
            frameData[frameDataIx++] = snapshot[ix + 0]; // r
            frameData[frameDataIx++] = snapshot[ix + 1]; // g
            frameData[frameDataIx++] = snapshot[ix + 2]; // b
            frameData[frameDataIx++] = 255;
        }
    }

    let jpegImageData = jpegjs.encode({
        data: frameData,
        width: width,
        height: height,
    }, 100);

    fs.writeFileSync(outputFile, jpegImageData.data);
    console.log('Written to', outputFile);
})();
