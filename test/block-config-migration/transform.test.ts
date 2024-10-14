import assert from "assert";
import Path from 'path';
import fs from 'fs';
import { BlockConfigManager } from "../../cli/blocks/block-config-manager";
import { EdgeImpulseConfig } from "../../cli/config";
import os from 'os';
import * as models from  '../../sdk/studio/sdk/model/models';
import { OrganizationBlocksApi } from "../../sdk/studio/sdk/api";
import { EdgeImpulseApi } from "../../sdk/studio";

describe("block config migration (transform)", () => {
    describe('synthetic data', () => {
        it('converts v1 synthetic data (other host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "edgeimpulse.com": {
                        "name": "ElevenLabs Synthetic Audio Generator",
                        "type": "transform",
                        "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data.",
                        "organizationId": 1,
                        "operatesOn": "standalone",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 7174
                    },
                    "edgeimpulse2.com": {
                        "name": "ElevenLabs Synthetic Audio Generator",
                        "type": "transform",
                        "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data.",
                        "organizationId": 2,
                        "operatesOn": "standalone",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 7175
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
                transformWhatTypeOfBlockIsThisReply: 'synthetic-data',
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'synthetic-data') {
                assert(false, 'blockConfig type should be "synthetic-data": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'synthetic-data');
            assert.deepEqual(blockConfig.config, null); // host is different
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "ElevenLabs Synthetic Audio Generator",
                    "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data."
                },
                "parameters": []
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "edgeimpulse.com": {
                        "organizationId": 1,
                        "id": 7174
                    },
                    "edgeimpulse2.com": {
                        "organizationId": 2,
                        "id": 7175
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "ElevenLabs Synthetic Audio Generator",
                    "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data."
                },
                "parameters": []
            });
        });

        it('converts v1 synthetic data (same host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransformationBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransformationBlockResponse><unknown>{
                            success: true,
                            transformationBlock: {
                                id: blockId,
                                showInSyntheticData: true,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "ElevenLabs Synthetic Audio Generator",
                        "type": "transform",
                        "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data.",
                        "organizationId": 1,
                        "operatesOn": "standalone",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 7174
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'synthetic-data') {
                assert(false, 'blockConfig type should be "synthetic-data": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'synthetic-data');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 7174
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "ElevenLabs Synthetic Audio Generator",
                    "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data."
                },
                "parameters": []
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 7174
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "ElevenLabs Synthetic Audio Generator",
                    "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data."
                },
                "parameters": []
            });
        });

        it('converts v1 synthetic data (same host, old parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransformationBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransformationBlockResponse><unknown>{
                            success: true,
                            transformationBlock: {
                                id: blockId,
                                showInSyntheticData: true,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "ElevenLabs Synthetic Audio Generator",
                        "type": "transform",
                        "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data.",
                        "organizationId": 1,
                        "operatesOn": "standalone",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 7174
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify([
                {
                    "name": "OpenAI API Key",
                    "value": "",
                    "type": "secret",
                    "help": "An API Key that gives access to OpenAI",
                    "param": "OPENAI_API_KEY"
                }], null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'synthetic-data') {
                assert(false, 'blockConfig type should be "synthetic-data": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'synthetic-data');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 7174
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "ElevenLabs Synthetic Audio Generator",
                    "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data."
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
                        "id": 7174
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "ElevenLabs Synthetic Audio Generator",
                    "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data."
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

        it('converts v1 synthetic data (same host, new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransformationBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransformationBlockResponse><unknown>{
                            success: true,
                            transformationBlock: {
                                id: blockId,
                                showInSyntheticData: true,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "ElevenLabs Synthetic Audio Generator",
                        "type": "transform",
                        "description": "Uses ElevenLabs (https://elevenlabs.io/) text-to-audio model to generate synthetic non-voice audio samples. Very useful for building audible even detection on synthetic data.",
                        "organizationId": 1,
                        "operatesOn": "standalone",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 7174
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis"
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
            if (blockConfig.type !== 'synthetic-data') {
                assert(false, 'blockConfig type should be "synthetic-data": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'synthetic-data');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 7174
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis"
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
                        "id": 7174
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis"
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

        it('loads v2 synthetic data (same host, new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 7174
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis"
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
            if (blockConfig.type !== 'synthetic-data') {
                assert(false, 'blockConfig type should be "synthetic-data": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'synthetic-data');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 7174
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis"
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
                        "id": 7174
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "synthetic-data",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis"
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

    describe('transformation', () => {
        it('converts v1 transform block (other host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransformationBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransformationBlockResponse><unknown>{
                            success: true,
                            transformationBlock: {
                                id: blockId,
                                showInSyntheticData: false,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "edgeimpulse.com": {
                        "name": "Mix in noise",
                        "type": "transform",
                        "description": "Takes WAV files in, and adds noise to them",
                        "organizationId": 1,
                        "operatesOn": "file",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 155
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
                transformWhatTypeOfBlockIsThisReply: 'transform',
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'transform') {
                assert(false, 'blockConfig type should be "transform": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'transform');
            assert.deepEqual(blockConfig.config, null); // host is different
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "Mix in noise",
                    "description": "Takes WAV files in, and adds noise to them",
                    "operatesOn": "file",
                    "transformMountpoints": [],
                },
                "parameters": []
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "edgeimpulse.com": {
                        "organizationId": 1,
                        "id": 155
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "Mix in noise",
                    "description": "Takes WAV files in, and adds noise to them",
                    "operatesOn": "file",
                    "transformMountpoints": [],
                },
                "parameters": []
            });
        });

        it('converts v1 transform block (same host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransformationBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransformationBlockResponse><unknown>{
                            success: true,
                            transformationBlock: {
                                id: blockId,
                                showInSyntheticData: false,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "Mix in noise",
                        "type": "transform",
                        "description": "Takes WAV files in, and adds noise to them",
                        "organizationId": 1,
                        "operatesOn": "file",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 155
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'transform') {
                assert(false, 'blockConfig type should be "transform": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'transform');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 155
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "Mix in noise",
                    "description": "Takes WAV files in, and adds noise to them",
                    "operatesOn": "file",
                    "transformMountpoints": [],
                },
                "parameters": []
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 155
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "Mix in noise",
                    "description": "Takes WAV files in, and adds noise to them",
                    "operatesOn": "file",
                    "transformMountpoints": [],
                },
                "parameters": []
            });
        });

        it('converts v1 transform block (same host, old parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransformationBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransformationBlockResponse><unknown>{
                            success: true,
                            transformationBlock: {
                                id: blockId,
                                showInSyntheticData: false,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "Mix in noise",
                        "type": "transform",
                        "description": "Takes WAV files in, and adds noise to them",
                        "organizationId": 1,
                        "operatesOn": "file",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [],
                        "id": 155
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify([
                {
                    "name": "Number of files to create",
                    "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                    "type": "int",
                    "value": "10",
                    "param": "out-count"
                }], null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'transform') {
                assert(false, 'blockConfig type should be "transform": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'transform');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 155
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "Mix in noise",
                    "description": "Takes WAV files in, and adds noise to them",
                    "operatesOn": "file",
                    "transformMountpoints": [],
                },
                "parameters": [
                    {
                        "name": "Number of files to create",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ],
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 155
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "Mix in noise",
                    "description": "Takes WAV files in, and adds noise to them",
                    "operatesOn": "file",
                    "transformMountpoints": [],
                },
                "parameters": [
                    {
                        "name": "Number of files to create",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ],
            });
        });

        it('converts v1 transform block (same host, new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransformationBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransformationBlockResponse><unknown>{
                            success: true,
                            transformationBlock: {
                                id: blockId,
                                showInSyntheticData: false,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "211.212.213.214": {
                        "name": "Mix in noise",
                        "type": "transform",
                        "description": "Takes WAV files in, and adds noise to them",
                        "organizationId": 1,
                        "operatesOn": "file",
                        "tlIndRequiresGpu": false,
                        "transformMountpoints": [{ "bleep": 123 }],
                        "id": 155
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "operatesOn": "directory"
                },
                "parameters": [
                    {
                        "name": "Number of files to create #2",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'transform') {
                assert(false, 'blockConfig type should be "transform": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'transform');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 155
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "operatesOn": "directory", // should not be overwritten
                    // shouldn't have mountPoints here (if already this format shouldn't read from .ei-block-config)
                },
                "parameters": [
                    {
                        "name": "Number of files to create #2",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ]
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 155
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "operatesOn": "directory", // should not be overwritten
                    // shouldn't have mountPoints here (if already this format shouldn't read from .ei-block-config)
                },
                "parameters": [
                    {
                        "name": "Number of files to create #2",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ]
            });
        });

        it('loads v2 transform block (same host, new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 155
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "operatesOn": "directory"
                },
                "parameters": [
                    {
                        "name": "Number of files to create #2",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'transform') {
                assert(false, 'blockConfig type should be "transform": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'transform');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 155
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "operatesOn": "directory", // should not be overwritten
                    // shouldn't have mountPoints here (if already this format shouldn't read from .ei-block-config)
                },
                "parameters": [
                    {
                        "name": "Number of files to create #2",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ]
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 155
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "transform",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "operatesOn": "directory", // should not be overwritten
                    // shouldn't have mountPoints here (if already this format shouldn't read from .ei-block-config)
                },
                "parameters": [
                    {
                        "name": "Number of files to create #2",
                        "help": "How many new files to create per input file. Noise is randomly mixed in per file.",
                        "type": "int",
                        "value": "10",
                        "param": "out-count"
                    },
                ]
            });
        });
    });
});
