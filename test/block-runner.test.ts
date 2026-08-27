/// <reference path="../types/inquirer-search-list.d.ts" />

import assert from "assert";
import fs from "fs";
import os from "os";
import Path from "path";
import inquirer from "inquirer";
import { BlockRunnerTransferLearning } from "../cli/block-runner";
import { BlockConfig } from "../cli/blocks/block-config-manager";
import { Config, EdgeImpulseConfig, RunnerConfig } from "../cli-common/config";

describe("block runner", () => {
    describe("machine learning", () => {
        let originalCwd: string;
        let originalPrompt: typeof inquirer.prompt;

        beforeEach(() => {
            originalCwd = process.cwd();
            originalPrompt = inquirer.prompt;
        });

        afterEach(() => {
            process.chdir(originalCwd);
            inquirer.prompt = originalPrompt;
        });

        it("uses explicit IDs without prompting", async () => {
            const tempDir = await fs.promises.mkdtemp(Path.join(os.tmpdir(), "ei-block-runner-"));
            await fs.promises.mkdir(Path.join(tempDir, "ei-block-data", "123"), { recursive: true });
            await fs.promises.writeFile(Path.join(tempDir, "ei-block-data", "123", "X_train_features.npy"), "x");
            await fs.promises.writeFile(Path.join(tempDir, "ei-block-data", "123", "y_train.npy"), "y");
            process.chdir(tempDir);
            const cwd = process.cwd();

            let promptCount = 0;
            inquirer.prompt = <typeof inquirer.prompt><unknown>(async () => {
                promptCount++;
                throw new Error("Unexpected prompt");
            });

            const runner = new BlockRunnerTransferLearning(
                createCliConfig(),
                createEiConfig(),
                createBlockConfig(),
                {
                    type: "machine-learning",
                    container: "test-container",
                    projectId: "123",
                    impulseId: "456",
                    learnId: "789",
                    epochs: "12",
                    learningRate: "0.001",
                    validationSetSize: "0.25",
                }
            );

            await runner.setup();
            const dockerRunCommand = await runner.getDockerRunCommand();

            assert.strictEqual(promptCount, 0);
            assert.deepStrictEqual(dockerRunCommand.args, [
                "run",
                "--rm",
                "-v",
                Path.join(cwd, "ei-block-data", "123") + ":/home",
                "test-container",
                "--epochs",
                "12",
                "--learning-rate",
                "0.001",
                "--validation-set-size",
                "0.25",
                "--input-shape",
                "(1, 4, 2)",
            ]);
        });

        it("prompts for IDs when they are not explicit or cached", async () => {
            const tempDir = await fs.promises.mkdtemp(Path.join(os.tmpdir(), "ei-block-runner-"));
            await fs.promises.mkdir(Path.join(tempDir, "ei-block-data", "123"), { recursive: true });
            await fs.promises.writeFile(Path.join(tempDir, "ei-block-data", "123", "X_train_features.npy"), "x");
            await fs.promises.writeFile(Path.join(tempDir, "ei-block-data", "123", "y_train.npy"), "y");
            process.chdir(tempDir);

            let promptNames: string[] = [];
            inquirer.prompt = <typeof inquirer.prompt><unknown>(async (questions: { name: string }[]) => {
                promptNames = promptNames.concat(questions.map(q => q.name));
                return { projectId: 123 };
            });

            const storedIds: { projectId?: number, impulseId?: number, blockId?: number } = { };
            const runner = new BlockRunnerTransferLearning(
                createCliConfig({
                    runnerConfig: createRunnerConfig({
                        projectId: undefined,
                        blockId: undefined,
                        impulseIdsForProjectId: undefined,
                    }),
                    storeProjectId: async projectId => {
                        storedIds.projectId = projectId;
                    },
                    setRunnerImpulseIdForProjectId: async (_projectId, impulseId) => {
                        storedIds.impulseId = impulseId;
                    },
                    storeBlockId: async blockId => {
                        storedIds.blockId = blockId;
                    },
                }),
                createEiConfig(),
                createBlockConfig(),
                {
                    type: "machine-learning",
                    container: "test-container",
                    epochs: "12",
                    learningRate: "0.001",
                    validationSetSize: "0.25",
                }
            );

            await runner.setup();

            assert.deepStrictEqual(promptNames, [ "projectId" ]);
            assert.deepStrictEqual(storedIds, {
                projectId: 123,
                impulseId: 456,
                blockId: 789,
            });
        });

        it("uses local image input scaling when it differs from the remote block", async () => {
            const tempDir = await fs.promises.mkdtemp(Path.join(os.tmpdir(), "ei-block-runner-"));
            process.chdir(tempDir);

            let exportRequest: { overrideImageInputScaling?: string } | undefined;
            const runner = new BlockRunnerTransferLearning(
                createCliConfig(),
                createEiConfig({
                    organizationBlocks: {
                        listOrganizationTransferLearningBlocks: async () => ({
                            transferLearningBlocks: [
                                { id: 321, name: "Remote Block", imageInputScaling: "0..255" },
                            ],
                        }),
                    },
                    jobs: {
                        exportKerasBlockData: async (
                            _projectId: number,
                            _learnId: number,
                            request: { overrideImageInputScaling?: string }
                        ) => {
                            exportRequest = request;
                            return { id: 1 };
                        },
                    },
                    runJobUntilCompletion: async () => undefined,
                    learn: {
                        downloadKerasData: async () => createEmptyZip(),
                    },
                }),
                createBlockConfig({
                    config: {
                        id: 321,
                        organizationId: 1,
                    },
                    parameters: {
                        info: {
                            imageInputScaling: "0..1",
                        },
                    },
                }),
                {
                    type: "machine-learning",
                    container: "test-container",
                    projectId: "123",
                    impulseId: "456",
                    learnId: "789",
                    epochs: "12",
                    learningRate: "0.001",
                    validationSetSize: "0.25",
                }
            );

            await runner.setup();

            assert.deepStrictEqual(exportRequest, {
                overrideImageInputScaling: "0..1",
            });
        });
    });
});

function createRunnerConfig(overrides?: Partial<RunnerConfig>): RunnerConfig {
    return {
        projectId: 999,
        blockId: 999,
        storageIndex: undefined,
        storagePath: "",
        storageMaxSizeMb: undefined,
        deploymentVersion: undefined,
        monitorSummaryIntervalMs: undefined,
        impulseIdsForProjectId: {
            "123": { impulseId: 999 },
        },
        modelVariantsForProjectId: undefined,
        ...overrides,
    };
}

function createCliConfig(overrides?: {
    runnerConfig?: RunnerConfig,
    storeProjectId?: (projectId: number) => Promise<void>,
    setRunnerImpulseIdForProjectId?: (projectId: number, impulseId: number) => Promise<void>,
    storeBlockId?: (blockId: number) => Promise<void>,
}): Config {
    const runnerConfig = overrides?.runnerConfig || createRunnerConfig();

    return <Config><unknown>{
        getRunner: async () => runnerConfig,
        storeProjectId: overrides?.storeProjectId || (async () => assert.fail("project ID should not be stored when passed explicitly")),
        setRunnerImpulseIdForProjectId: overrides?.setRunnerImpulseIdForProjectId ||
            (async () => assert.fail("impulse ID should not be stored when passed explicitly")),
        storeBlockId: overrides?.storeBlockId ||
            (async () => assert.fail("learn block ID should not be stored when passed explicitly")),
    };
}

function createEiConfig(overrides?: {
    organizationBlocks?: object,
    jobs?: object,
    runJobUntilCompletion?: () => Promise<void>,
    learn?: object,
}): EdgeImpulseConfig {
    return <EdgeImpulseConfig><unknown>{
        api: {
            projects: {
                listProjects: async () => ({
                    success: true,
                    projects: [
                        { id: 123, owner: "Owner", name: "Project" },
                    ],
                }),
                getProjectInfo: async () => ({
                    success: true,
                    project: { owner: "Owner", name: "Project" },
                }),
            },
            impulse: {
                getAllImpulses: async () => ({
                    success: true,
                    impulses: [
                        {
                            id: 456,
                            name: "Impulse",
                            learnBlocks: [
                                { id: 789, title: "Learn" },
                            ],
                        },
                    ],
                }),
            },
            learn: {
                getKeras: async () => ({
                    name: "Learn",
                    shape: "(1, 4, 2)",
                }),
                ...overrides?.learn,
            },
            organizationBlocks: overrides?.organizationBlocks,
            jobs: overrides?.jobs,
            runJobUntilCompletion: overrides?.runJobUntilCompletion,
        },
    };
}

function createBlockConfig(overrides?: {
    config?: object,
    parameters?: {
        info?: object,
    },
}): BlockConfig {
    return <BlockConfig>{
        type: "machine-learning",
        config: {
            organizationId: 1,
            ...overrides?.config,
        },
        parameters: {
            version: 1,
            type: "machine-learning",
            info: {
                name: "Block",
                description: "Block",
                operatesOn: "other",
                ...overrides?.parameters?.info,
            },
            parameters: [],
        },
    };
}

function createEmptyZip(): Buffer {
    return Buffer.from("504b0506000000000000000000000000000000000000", "hex");
}