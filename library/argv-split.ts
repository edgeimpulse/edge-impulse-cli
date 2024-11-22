/**
 * Based on https://github.com/kaelzhang/node-argv-split
 *
 * Copyright (c) 2013 kaelzhang <i@kael.me>, contributors
 * http://kael.me/
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';


// Flags                        Characters
//             0         1         2         3         4         5
// ------------------------------------------------------------------------
//             \         '         "         normal    space     \n
//   e,sq      n/a       n/a       n/a       n/a       n/a       n/a
// 0 ue,sq     a \       suq       a "       a +       a _       EOF
// 1 e,dq      a \,ue    a \',ue   a ",ue    a \+,ue   a \_,ue   ue
// 2 ue,dq     e         a '       duq       a +       a _       EOF
// 3 e,uq      a \,ue    a \',ue   a \",ue   a \+,ue   a _,ue    ue
// 4 ue,uq     e         sq        dq        a +       tp        EOF

const MATRIX: {
    [k: string]: (() => void)[]
} = {
    // object is more readable than multi-dim array.
    0: [ a, suq, a, a, a, EOF ],
    1: [ eaue, aue, eaue, aue, aue, ue ],
    2: [ e, a, duq, a, a, EOF ],
    3: [ eaue, aue, aue, aue, eaue, ue ],
    4: [ e, sq, dq, a, tp, EOF ]
};

// - a: add
// - e: turn on escape mode
// - ue: turn off escape mode
// - q: turn on quote mode
//   - sq: single quoted
//   - dq: double quoted
// - uq: turn off quote mode
// - tp: try to push if there is something in the stash
// - EOF: end of file(input)

let escaped = false; // 1
let singleQuoted = false; // 2
let doubleQuoted = false; // 4
let ended = false;

const FLAGS: {
    [k: string]: number
} = {
    2: 0,
    5: 1,
    4: 2,
    1: 3,
    0: 4
};

function y() {
    let sum = 0;

    if (escaped) {
        sum++;
    }

    if (singleQuoted) {
        sum += 2;
    }

    if (doubleQuoted) {
        sum += 4;
    }

    return FLAGS[sum.toString()];
}

const BACK_SLASH = '\\';
const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';
const WHITE_SPACE = ' ';
const CARRIAGE_RETURN = '\n';

function x() {
    return c in CHARS ?
        CHARS[c] :
        CHARS.NORMAL;
}

const CHARS: {
    [k: string]: number
} = {
    [BACK_SLASH]: 0,
    [SINGLE_QUOTE]: 1,
    [DOUBLE_QUOTE]: 2,
    NORMAL: 3,
    [WHITE_SPACE]: 4,
    [CARRIAGE_RETURN]: 5
};

let c = '';
let stash = '';
let ret: string[] = [];

function reset() {
    escaped = false;
    singleQuoted = false;
    doubleQuoted = false;
    ended = false;
    c = '';
    stash = '';
    ret = [];
}

function a() {
    stash += c;
}

function sq() {
    singleQuoted = true;
}

function suq() {
    singleQuoted = false;
}

function dq() {
    doubleQuoted = true;
}

function duq() {
    doubleQuoted = false;
}

function e() {
    escaped = true;
}

function ue() {
    escaped = false;
}

// add a backslash and a normal char, and turn off escaping
function aue() {
    stash += BACK_SLASH + c;
    escaped = false;
}

// add a escaped char and turn off escaping
function eaue() {
    stash += c;
    escaped = false;
}

// try to push
function tp() {
    if (stash) {
        ret.push(stash);
        stash = '';
    }
}

function EOF() {
    ended = true;
}


export function split(str: string) {
    if (typeof str !== 'string') {
        type_error(`Str must be a string. Received ${str}`);
    }

    reset();

    const length = str.length;
    let i = -1;

    while (++i < length) {
        c = str[i];

        MATRIX[y().toString()][x()]();

        if (ended) {
            break;
        }
    }

    if (singleQuoted) {
        error('unmatched single quote');
    }

    if (doubleQuoted) {
        error('unmatched double quote');
    }

    if (escaped) {
        error('unexpected end with \\');
    }

    tp();

    return ret;
}

function error(message: string) {
    throw new Error(message);
}

function type_error(message: string) {
    throw new TypeError(message);
}
