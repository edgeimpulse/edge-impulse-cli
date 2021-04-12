import npmFetch from 'npm-registry-fetch';
import fs from 'fs';
import Path from 'path';
import util from 'util';
import { Config } from './config';
const compareSemver = createCompareVersions();

const minNodeVersion = '12.0.0';

export default async function(config: Config) {
    // Node.js version check
    let nodeVersion = process.version.replace(/^v/, '');
    if (nodeVersion && compareSemver(nodeVersion, minNodeVersion) === -1) {
        console.log(`\x1b[31mERR:\x1b[0m You're running an outdated version of Node.js,`);
        console.log(`     you need Node.js ${minNodeVersion} or higher to run this tool.`);
        process.exit(1);
    }

    let lastCheck = await config.getLastVersionCheck();
    if (lastCheck > Date.now() - (1000 * 60 * 60 * 24)) {
        return;
    }

    const packageJson = <{ version: string, name: string }>JSON.parse(
        await util.promisify(fs.readFile)(Path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));

    let pkg: { versions: { [k: string]: { } } } = <any>await npmFetch.json(`/${packageJson.name}/`, {
        timeout: 3000
    });
    if (pkg) {
        let latestInNpm = (Object.keys(pkg.versions).sort((a, b) => compareSemver(b, a))[0]);
        let myVersion = packageJson.version;
        if (compareSemver(latestInNpm, myVersion) === 1) {
            console.log(`\x1b[33mWARN:\x1b[0m You're running an outdated version of the Edge Impulse CLI tools`);
            console.log('      Upgrade via `\x1b[2mnpm update -g ' + packageJson.name + '\x1b[0m`');
        }
        await config.setLastVersionCheck();
    }
}

// from https://github.com/omichelsen/compare-versions#readme
// licensed under the MIT
function createCompareVersions() {
    // tslint:disable-next-line: max-line-length
    let semver = /^v?(?:\d+)(\.(?:[x*]|\d+)(\.(?:[x*]|\d+)(\.(?:[x*]|\d+))?(?:-[\da-z\-]+(?:\.[\da-z\-]+)*)?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?)?)?$/i;

    function indexOrEnd(str: string, q: string) {
        return str.indexOf(q) === -1 ? str.length : str.indexOf(q);
    }

    function split(v: string) {
        let c = v.replace(/^v/, '').replace(/\+.*$/, '');
        let patchIndex = indexOrEnd(c, '-');
        let arr = c.substring(0, patchIndex).split('.');
        arr.push(c.substring(patchIndex + 1));
        return arr;
    }

    function tryParse(v: string) {
        return isNaN(Number(v)) ? v : Number(v);
    }

    function validate(version: string) {
        if (typeof version !== 'string') {
            throw new TypeError('Invalid argument expected string');
        }
        if (!semver.test(version)) {
            throw new Error('Invalid argument not valid semver (\'' + version + '\' received)');
        }
    }

    function compareVersions(v1: string, v2: string) {
        [v1, v2].forEach(validate);

        let s1 = split(v1);
        let s2 = split(v2);

        for (let i = 0; i < Math.max(s1.length - 1, s2.length - 1); i++) {
            let n1 = Number(s1[i] || '0');
            let n2 = Number(s2[i] || '0');

            if (n1 > n2) return 1;
            if (n2 > n1) return -1;
        }

        let sp1 = s1[s1.length - 1];
        let sp2 = s2[s2.length - 1];

        if (sp1 && sp2) {
            let p1 = sp1.split('.').map(tryParse);
            let p2 = sp2.split('.').map(tryParse);

            for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
                if (p1[i] === undefined || typeof p2[i] === 'string' && typeof p1[i] === 'number') return -1;
                if (p2[i] === undefined || typeof p1[i] === 'string' && typeof p2[i] === 'number') return 1;

                if (p1[i] > p2[i]) return 1;
                if (p2[i] > p1[i]) return -1;
            }
        } else if (sp1 || sp2) {
            return sp1 ? -1 : 1;
        }

        return 0;
    }

    let allowedOperators = [
        '>',
        '>=',
        '=',
        '<',
        '<='
    ];

    let operatorResMap = {
        '>': [1],
        '>=': [0, 1],
        '=': [0],
        '<=': [-1, 0],
        '<': [-1]
    };

    function validateOperator(op: string) {
        if (typeof op !== 'string') {
            throw new TypeError('Invalid operator type, expected string but got ' + typeof op);
        }
        if (allowedOperators.indexOf(op) === -1) {
            throw new TypeError('Invalid operator, expected one of ' + allowedOperators.join('|'));
        }
    }

    compareVersions.compare = (v1: string, v2: string, operator: '>' | '>=' | '=' | '<=' | '<') => {
        // Validate operator
        validateOperator(operator);

        // since result of compareVersions can only be -1 or 0 or 1
        // a simple map can be used to replace switch
        let res = compareVersions(v1, v2);
        return operatorResMap[operator].indexOf(res) > -1;
    };

    return compareVersions;
}
