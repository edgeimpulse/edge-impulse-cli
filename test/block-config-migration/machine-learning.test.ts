import assert from "assert";
import Path from 'path';
import fs from 'fs';
import { BlockConfigManager } from "../../cli/blocks/block-config-manager";
import { EdgeImpulseConfig } from "../../cli/config";
import os from 'os';
import { EdgeImpulseApi } from "../../sdk/studio";
import { OrganizationBlocksApi } from "../../sdk/studio/sdk/api";
import * as models from  '../../sdk/studio/sdk/model/models';

describe("block config migration (ML)", () => {
    describe('machine learning', () => {
        it('converts v0 ML block', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransferLearningBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransferLearningBlockResponse><unknown>{
                            success: true,
                            transferLearningBlock: {
                                id: blockId,
                            }
                        };
                    },
                },
            };

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                name: 'Custom MLP Hello world',
                type: 'transferLearning',
                description: 'Multi-layer perceptron in Keras',
                organizationId: 1,
                tlOperatesOn: 'other',
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'machine-learning') {
                assert(false, 'blockConfig type should be "machine-learning": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'machine-learning');
            assert.deepEqual(blockConfig.config, {
                organizationId: 1,
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "Custom MLP Hello world",
                    "description": "Multi-layer perceptron in Keras",
                    "operatesOn": "other",
                },
                "parameters": []
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "Custom MLP Hello world",
                    "description": "Multi-layer perceptron in Keras",
                    "operatesOn": "other",
                },
                "parameters": []
            });
        });

        it('converts v1 ML block (other host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransferLearningBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransferLearningBlockResponse><unknown>{
                            success: true,
                            transferLearningBlock: {
                                id: blockId,
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
                        "name": "MobileNetV2 w/ 0..255 scaling",
                        "id": 88,
                        "type": "transferLearning",
                        "description": "MobileNetV2 but with custom scaling",
                        "tlImageInputScaling": "0..255",
                        "repositoryUrl": "https://github.com/janjongboom/bleep",
                        "organizationId": 1,
                        "tlIndRequiresGpu": false
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'machine-learning') {
                assert(false, 'blockConfig type should be "machine-learning": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'machine-learning');
            assert.deepEqual(blockConfig.config, null); // host is different
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "MobileNetV2 w/ 0..255 scaling",
                    "description": "MobileNetV2 but with custom scaling",
                    "imageInputScaling": "0..255",
                    "repositoryUrl": "https://github.com/janjongboom/bleep",
                    "indRequiresGpu": false,
                },
                "parameters": []
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "edgeimpulse.com": {
                        "organizationId": 1,
                        "id": 88
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "MobileNetV2 w/ 0..255 scaling",
                    "description": "MobileNetV2 but with custom scaling",
                    "imageInputScaling": "0..255",
                    "repositoryUrl": "https://github.com/janjongboom/bleep",
                    "indRequiresGpu": false,
                },
                "parameters": []
            });
        });

        it('converts v1 ML block (same host, no parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransferLearningBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransferLearningBlockResponse><unknown>{
                            success: true,
                            transferLearningBlock: {
                                id: blockId,
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
                        "name": "MobileNetV2 w/ 0..255 scaling",
                        "id": 88,
                        "type": "transferLearning",
                        "description": "MobileNetV2 but with custom scaling",
                        "tlImageInputScaling": "0..255",
                        "repositoryUrl": "https://github.com/janjongboom/bleep",
                        "organizationId": 1,
                        "tlIndRequiresGpu": false
                    }
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'machine-learning') {
                assert(false, 'blockConfig type should be "machine-learning": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'machine-learning');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 88
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "MobileNetV2 w/ 0..255 scaling",
                    "description": "MobileNetV2 but with custom scaling",
                    "imageInputScaling": "0..255",
                    "repositoryUrl": "https://github.com/janjongboom/bleep",
                    "indRequiresGpu": false,
                },
                "parameters": []
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 88
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "MobileNetV2 w/ 0..255 scaling",
                    "description": "MobileNetV2 but with custom scaling",
                    "imageInputScaling": "0..255",
                    "repositoryUrl": "https://github.com/janjongboom/bleep",
                    "indRequiresGpu": false,
                },
                "parameters": []
            });
        });

        it('converts v1 ML block (same host, old parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransferLearningBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransferLearningBlockResponse><unknown>{
                            success: true,
                            transferLearningBlock: {
                                id: blockId,
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
                        "name": "MobileNet SSD",
                        "id": 88,
                        "type": "transferLearning",
                        "description": "Object detector",
                        "tlImageInputScaling": "0..1",
                        "repositoryUrl": "https://github.com/janjongboom/bleep",
                        "tlOperatesOn": "object_detection",
                        "tlObjectDetectionLastLayer": "mobilenet-ssd",
                        "organizationId": 1,
                        "tlIndRequiresGpu": true,
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify([
                {
                    "name": "Learning rate",
                    "value": "0.001",
                    "type": "float",
                    "help": "How fast the neural network learns, if the network overfits quickly, then lower the learning rate.",
                    "param": "learning-rate"
                }], null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'machine-learning') {
                assert(false, 'blockConfig type should be "machine-learning": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'machine-learning');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 88
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "MobileNet SSD",
                    "description": "Object detector",
                    "imageInputScaling": "0..1",
                    "repositoryUrl": "https://github.com/janjongboom/bleep",
                    "operatesOn": "object_detection",
                    "objectDetectionLastLayer": "mobilenet-ssd",
                    "indRequiresGpu": true,
                },
                "parameters": [
                    {
                        "name": "Learning rate",
                        "value": "0.001",
                        "type": "float",
                        "help": "How fast the neural network learns, if the network overfits quickly, then lower the learning rate.",
                        "param": "learning-rate"
                    },
                ],
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 88
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "MobileNet SSD",
                    "description": "Object detector",
                    "imageInputScaling": "0..1",
                    "repositoryUrl": "https://github.com/janjongboom/bleep",
                    "operatesOn": "object_detection",
                    "objectDetectionLastLayer": "mobilenet-ssd",
                    "indRequiresGpu": true,
                },
                "parameters": [
                    {
                        "name": "Learning rate",
                        "value": "0.001",
                        "type": "float",
                        "help": "How fast the neural network learns, if the network overfits quickly, then lower the learning rate.",
                        "param": "learning-rate"
                    },
                ],
            });
        });

        it('converts v1 ML block (same host, new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            config.api = <EdgeImpulseApi><unknown>{
                organizationBlocks: <OrganizationBlocksApi><unknown>{
                    getOrganizationTransferLearningBlock: async (organizationId: number, blockId: number) => {
                        return <models.GetOrganizationTransferLearningBlockResponse><unknown>{
                            success: true,
                            transferLearningBlock: {
                                id: blockId,
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
                        "name": "MobileNetV2 w/ 0..255 scaling",
                        "id": 88,
                        "type": "transferLearning",
                        "description": "MobileNetV2 but with custom scaling",
                        "tlImageInputScaling": "0..255",
                        "repositoryUrl": "https://github.com/janjongboom/bleep",
                        "organizationId": 1,
                        "tlIndRequiresGpu": false
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    }
                ]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'machine-learning') {
                assert(false, 'blockConfig type should be "machine-learning": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'machine-learning');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 88
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    },
                ]
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 88
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    },
                ]
            });
        });

        it('loads v2 ML block (same host, new parameters.json)', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            // no api needed here

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 88
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    }
                ]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'machine-learning') {
                assert(false, 'blockConfig type should be "machine-learning": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'machine-learning');
            assert.deepEqual(blockConfig.config, {
                "organizationId": 1,
                "id": 88
            });
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    }
                ]
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, '.ei-block-config'), 'utf-8')), {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 88
                    }
                }
            });
            assert.deepStrictEqual(JSON.parse(await fs.promises.readFile(Path.join(folder, 'parameters.json'), 'utf-8')), {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    }
                ]
            });
        });

        it('v2 ML block with clean returns null config', async () => {
            let config = <EdgeImpulseConfig><unknown>{ };
            config.host = '211.212.213.214';
            // no api needed here

            let folder = await fs.promises.mkdtemp(Path.join(os.tmpdir() + '-ei-'));
            let eiBlockConfig = {
                "version": 2,
                "config": {
                    "211.212.213.214": {
                        "organizationId": 1,
                        "id": 88
                    },
                }
            };
            await fs.promises.writeFile(Path.join(folder, '.ei-block-config'), JSON.stringify(eiBlockConfig, null, 4), 'utf-8');
            await fs.promises.writeFile(Path.join(folder, 'parameters.json'), JSON.stringify({
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    }
                ]
            }, null, 4), 'utf-8');

            const blockConfigManager = new BlockConfigManager(config, folder, {
                skipConfirmation: true,
            });
            const blockConfig = await blockConfigManager.loadConfig({ throwOnMissingParams: false, clean: true });
            assert(blockConfig !== null, 'blockConfig should not be null');
            if (blockConfig.type !== 'machine-learning') {
                assert(false, 'blockConfig type should be "machine-learning": ' + JSON.stringify(blockConfig));
            }
            assert.deepEqual(blockConfig.type, 'machine-learning');
            assert.deepEqual(blockConfig.config, null);
            assert.deepEqual(blockConfig.parameters, {
                "version": 1,
                "type": "machine-learning",
                "info": {
                    "name": "YOLOv5",
                    "description": "Transfer learning model based on Ultralytics YOLOv5 using yolov5n.pt weights, supports RGB input at any resolution (square images only).",
                    "operatesOn": "object_detection",
                    "indRequiresGpu": false
                },
                "parameters": [
                    {
                        "name": "Batch size",
                        "value": "16",
                        "type": "int",
                        "help": "The batch size to use during training. Consider reducing this for larger models. Use -1 to autotune this value.",
                        "param": "batch-size",
                        "optional": true
                    }
                ]
            });
        });
    });
});
