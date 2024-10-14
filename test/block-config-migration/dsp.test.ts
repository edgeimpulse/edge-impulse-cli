import assert from "assert";
import Path from 'path';
import fs from 'fs';
import { BlockConfigManager } from "../../cli/blocks/block-config-manager";
import { EdgeImpulseConfig } from "../../cli/config";
import os from 'os';

describe("block config migration (dsp)", () => {
    describe('dsp', () => {
        it('throws error if parameters.json missing', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "edgeimpulse.com": {
                        "name": "Pose estimation",
                        "id": 6,
                        "type": "dsp",
                        "description": "Test 123",
                        "organizationId": 1,
                        "tlIndRequiresGpu": false,
                        "port": 4446,
                    },
                    "edgeimpulse2.com": {
                        "name": "Pose estimation",
                        "id": 7,
                        "type": "dsp",
                        "description": "Test 123",
                        "organizationId": 2,
                        "tlIndRequiresGpu": false,
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            let errorMsg: string | undefined;
            try {
                const blockConfigManager = new BlockConfigManager(config, folder, {
                    skipConfirmation: true,
                });
                await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            }
            catch (ex2) {
                let ex = <Error>ex2;
                errorMsg = ex.message || ex.toString();
            }

            assert(errorMsg, `Expected an error to be thrown`);
            assert(errorMsg.indexOf(`You're missing a "parameters.json" file`) !== -1,
                `error message should have 'You're missing a "parameters.json" file' (${errorMsg})`);
        });

        it('converts v1 dsp block (old parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "Pose estimation",
                        "id": 6,
                        "type": "dsp",
                        "description": "Test 123",
                        "organizationId": 1,
                        "tlIndRequiresGpu": false,
                        "port": 4446,
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "info": {
                    "title": "Audio (MFE)",
                    "author": "Edge Impulse",
                    "description": "Extracts a spectrogram from audio signals using Mel-filterbank energy features, great for non-voice audio.",
                    "name": "MFE",
                    "preferConvolution": true,
                    "convolutionColumns": "num_filters",
                    "convolutionKernelSize": 5,
                    "cppType": "mfe",
                    "visualization": "dimensionalityReduction",
                    "experimental": false,
                    "latestImplementationVersion": 4,
                    "hasAutoTune": true
                },
                "parameters": [{
                    "name": "Window size",
                    "value": 101,
                    "type": "int",
                    "help": "The size of sliding window for local normalization",
                    "param": "win_size",
                    "showForImplementationVersion": [ 1, 2 ]
                }]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'dsp') {
                assert(false, 'blockConfig type should be "dsp": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'dsp');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 6
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "dsp",
                "info": {
                    "title": "Audio (MFE)",
                    "author": "Edge Impulse",
                    "description": "Extracts a spectrogram from audio signals using Mel-filterbank energy features, great for non-voice audio.",
                    "name": "MFE",
                    "preferConvolution": true,
                    "convolutionColumns": "num_filters",
                    "convolutionKernelSize": 5,
                    "cppType": "mfe",
                    "visualization": "dimensionalityReduction",
                    "experimental": false,
                    "latestImplementationVersion": 4,
                    "hasAutoTune": true,
                    "port": 4446, // <-- this should have been added
                },
                "parameters": [
                    {
                        "name": "Window size",
                        "value": 101,
                        "type": "int",
                        "help": "The size of sliding window for local normalization",
                        "param": "win_size",
                        "showForImplementationVersion": [ 1, 2 ]
                    }
                ],
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 6
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "dsp",
                "info": {
                    "title": "Audio (MFE)",
                    "author": "Edge Impulse",
                    "description": "Extracts a spectrogram from audio signals using Mel-filterbank energy features, great for non-voice audio.",
                    "name": "MFE",
                    "preferConvolution": true,
                    "convolutionColumns": "num_filters",
                    "convolutionKernelSize": 5,
                    "cppType": "mfe",
                    "visualization": "dimensionalityReduction",
                    "experimental": false,
                    "latestImplementationVersion": 4,
                    "hasAutoTune": true,
                    "port": 4446, // <-- this should have been added
                },
                "parameters": [
                    {
                        "name": "Window size",
                        "value": 101,
                        "type": "int",
                        "help": "The size of sliding window for local normalization",
                        "param": "win_size",
                        "showForImplementationVersion": [ 1, 2 ]
                    },
                ],
            });
        });

        it('converts v1 dsp block (new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "Pose estimation",
                        "id": 6,
                        "type": "dsp",
                        "description": "Test 123",
                        "organizationId": 1,
                        "tlIndRequiresGpu": false,
                        "port": 4446,
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "dsp",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "port": 5100, // <-- should not be overwritten
                },
                "parameters": [
                    {
                        "name": "Window size",
                        "value": 101,
                        "type": "int",
                        "help": "The size of sliding window for local normalization",
                        "param": "win_size",
                        "showForImplementationVersion": [ 1, 2 ]
                    },
                ]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'dsp') {
                assert(false, 'blockConfig type should be "dsp": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'dsp');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 6
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "dsp",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "port": 5100, // <-- should not be overwritten
                },
                "parameters": [
                    {
                        "name": "Window size",
                        "value": 101,
                        "type": "int",
                        "help": "The size of sliding window for local normalization",
                        "param": "win_size",
                        "showForImplementationVersion": [ 1, 2 ]
                    }
                ],
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 6
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "dsp",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "port": 5100,
                },
                "parameters": [
                    {
                        "name": "Window size",
                        "value": 101,
                        "type": "int",
                        "help": "The size of sliding window for local normalization",
                        "param": "win_size",
                        "showForImplementationVersion": [ 1, 2 ]
                    },
                ],
            });
        });

        it('loads v2 dsp block (new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 6
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "dsp",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "port": 5100,
                },
                "parameters": [
                    {
                        "name": "OpenAI API Key",
                        "value": "",
                        "type": "secret",
                        "help": "An API Key that gives access to OpenAI",
                        "param": "OPENAI_API_KEY"
                    },
                ]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'dsp') {
                assert(false, 'blockConfig type should be "dsp": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'dsp');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 6
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "dsp",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "port": 5100,
                },
                "parameters": [
                    {
                        "name": "OpenAI API Key",
                        "value": "",
                        "type": "secret",
                        "help": "An API Key that gives access to OpenAI",
                        "param": "OPENAI_API_KEY"
                    }
                ],
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 6
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "dsp",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "port": 5100,
                },
                "parameters": [
                    {
                        "name": "OpenAI API Key",
                        "value": "",
                        "type": "secret",
                        "help": "An API Key that gives access to OpenAI",
                        "param": "OPENAI_API_KEY"
                    },
                ],
            });
        });
    });
});
