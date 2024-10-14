import assert from "assert";
import Path from 'path';
import fs from 'fs';
import { BlockConfigManager } from "../../cli/blocks/block-config-manager";
import { EdgeImpulseConfig } from "../../cli/config";
import os from 'os';
import { EdgeImpulseApi } from "../../sdk/studio";
import { OrganizationBlocksApi } from "../../sdk/studio/sdk/api";
import * as models from  '../../sdk/studio/sdk/model/models';

describe("block config migration (deploy)", () => {
    describe('deploy', () => {
        it('converts v1 deploy block (other host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 1,
                "config": {
                    "edgeimpulse.com": {
                        "name": "Micro:bit 2",
                        "type": "deploy",
                        "description": "Firmware with microphone driver for the micro:bit",
                        "deployCategory": "firmware",
                        "organizationId": 1,
                        "id": 200
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'deploy') {
                assert(false, 'blockConfig type should be "deploy": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'deploy');
            assert.deepEqual(blockConfig.config, null); // host is different
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "deploy",
                "info": {
                    "name": "Micro:bit 2",
                    "description": "Firmware with microphone driver for the micro:bit",
                    "category": "firmware",
                    "cliArguments": '',
                    "mountLearnBlock": false,
                    "showOptimizations": true,
                    "supportsEonCompiler": true,
                },
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "edgeimpulse.com": {
                        "organizationId": 1,
                        "id": 200
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "deploy",
                "info": {
                    "name": "Micro:bit 2",
                    "description": "Firmware with microphone driver for the micro:bit",
                    "category": "firmware",
                    "cliArguments": '',
                    "mountLearnBlock": false,
                    "showOptimizations": true,
                    "supportsEonCompiler": true,
                },
            });
        });

        it('converts v1 deploy block (same host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationDeployBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationDeployBlockResponse><unknown>{
                            success: true,
                            deployBlock: {
                                id: blockId,
                                cliArguments: '--test',
                                mountLearnBlock: false,
                                showOptimizations: true,
                                supportsEonCompiler: true,
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
                        "name": "Micro:bit 2",
                        "type": "deploy",
                        "description": "Firmware with microphone driver for the micro:bit",
                        "organizationId": 1,
                        "deployCategory": "firmware",
                        "id": 200
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'deploy') {
                assert(false, 'blockConfig type should be "deploy": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'deploy');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 200
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "deploy",
                "info": {
                    "name": "Micro:bit 2",
                    "description": "Firmware with microphone driver for the micro:bit",
                    "category": "firmware",
                    "cliArguments": '--test',
                    "mountLearnBlock": false,
                    "showOptimizations": true,
                    "supportsEonCompiler": true,
                },
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 200
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "deploy",
                "info": {
                    "name": "Micro:bit 2",
                    "description": "Firmware with microphone driver for the micro:bit",
                    "category": "firmware",
                    "cliArguments": '--test',
                    "mountLearnBlock": false,
                    "showOptimizations": true,
                    "supportsEonCompiler": true,
                },
            });
        });

        it('loads v2 deploy block (same host, new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 200
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "deploy",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "category": "library",
                },
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'deploy') {
                assert(false, 'blockConfig type should be "deploy": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'deploy');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 200
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "deploy",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "category": "library",
                },
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 200
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "deploy",
                "info": {
                    "name": "My awesome block",
                    "description": "Don't overwrite dis",
                    "category": "library",
                },
            });
        });
    });
});
