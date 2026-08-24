import assert from "assert";
import { Config, EdgeImpulseConfig, SerialConfig } from "../cli-common/config";

const originalEnv = {
    EI_HOST: process.env.EI_HOST,
    EI_CLI_STUDIO_ENDPOINT: process.env.EI_CLI_STUDIO_ENDPOINT,
    EI_CLI_INGESTION_ENDPOINT: process.env.EI_CLI_INGESTION_ENDPOINT,
    EI_CLI_REMOTE_MGMT_ENDPOINT: process.env.EI_CLI_REMOTE_MGMT_ENDPOINT,
};

describe("endpoint config", () => {
    beforeEach(() => {
        clearEndpointOverrides();
    });

    afterEach(() => {
        restoreEnv();
    });

    it("keeps default domain endpoints", async () => {
        const eiConfig = await verifyEndpoints("edgeimpulse.com");

        assert.deepStrictEqual(eiConfig.endpoints.internal, {
            ws: "wss://remote-mgmt.edgeimpulse.com",
            api: "https://studio.edgeimpulse.com",
            apiWs: "wss://studio.edgeimpulse.com",
            ingestion: "https://ingestion.edgeimpulse.com",
        });
        assert.deepStrictEqual(eiConfig.endpoints.device, {
            ws: "ws://remote-mgmt.edgeimpulse.com",
            api: "https://studio.edgeimpulse.com",
            ingestion: "http://ingestion.edgeimpulse.com",
        });
    });

    it("keeps default host.docker.internal endpoints", async () => {
        const eiConfig = await verifyEndpoints("host.docker.internal");

        assert.deepStrictEqual(eiConfig.endpoints.internal, {
            ws: "ws://host.docker.internal:4802",
            api: "http://host.docker.internal:4800",
            apiWs: "ws://host.docker.internal:4800",
            ingestion: "http://host.docker.internal:4810",
        });
        assert.deepStrictEqual(eiConfig.endpoints.device, {
            ws: "ws://host.docker.internal:4802",
            api: "http://host.docker.internal:4800",
            ingestion: "http://host.docker.internal:4810",
        });
    });

    it("overrides endpoints via EI_CLI env vars", async () => {
        process.env.EI_CLI_STUDIO_ENDPOINT = "http://host.docker.internal:14800";
        process.env.EI_CLI_INGESTION_ENDPOINT = "http://host.docker.internal:14810";
        process.env.EI_CLI_REMOTE_MGMT_ENDPOINT = "http://host.docker.internal:14802";

        const eiConfig = await verifyEndpoints("host.docker.internal");

        assert.deepStrictEqual(eiConfig.endpoints.internal, {
            ws: "ws://host.docker.internal:14802",
            api: "http://host.docker.internal:14800",
            apiWs: "ws://host.docker.internal:14800",
            ingestion: "http://host.docker.internal:14810",
        });
        assert.deepStrictEqual(eiConfig.endpoints.device, {
            ws: "ws://host.docker.internal:14802",
            api: "http://host.docker.internal:14800",
            ingestion: "http://host.docker.internal:14810",
        });
    });
});

async function verifyEndpoints(host: string): Promise<EdgeImpulseConfig> {
    process.env.EI_HOST = host;

    const configFactory = new Config();
    Object.defineProperty(configFactory, "load", {
        value: async (): Promise<SerialConfig> => ({
            host: "",
            jwtToken: "",
            uploaderProjectId: undefined,
            lastVersionCheck: Date.now(),
            apiKey: undefined,
            dataForwarderDevices: { },
            daemonDevices: { },
            linuxProjectId: undefined,
            camera: undefined,
            audio: undefined,
            runner: {
                projectId: undefined,
                blockId: undefined,
                storageIndex: undefined,
                storagePath: "",
                storageMaxSizeMb: undefined,
                deploymentVersion: undefined,
                monitorSummaryIntervalMs: undefined,
                impulseIdsForProjectId: undefined,
                modelVariantsForProjectId: undefined,
            },
            apiKeysForProject: undefined,
        }),
    });
    Object.defineProperty(configFactory, "store", {
        value: async () => undefined,
    });
    Object.defineProperty(configFactory, "verifyAccess", {
        value: async () => undefined,
    });

    return await configFactory.verifyLogin(false, "ei_test_key");
}

function restoreEnv() {
    for (let [ key, value ] of Object.entries(originalEnv)) {
        if (typeof value === "undefined") {
            delete process.env[key];
        }
        else {
            process.env[key] = value;
        }
    }
}

function clearEndpointOverrides() {
    delete process.env.EI_CLI_STUDIO_ENDPOINT;
    delete process.env.EI_CLI_INGESTION_ENDPOINT;
    delete process.env.EI_CLI_REMOTE_MGMT_ENDPOINT;
}
