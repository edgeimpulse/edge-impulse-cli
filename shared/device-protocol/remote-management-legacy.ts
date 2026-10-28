// Generated from device-services-contracts/schema/ by device-services-contracts/generate.sh. Do not edit.

/**
 * Historical handshake types retained while existing Remote Management clients migrate. This is not a
 * new negotiated protocol version.
 */
export type LegacyRemoteManagementMessage = HelloV1 | HelloV2 | HelloV3 | HelloResponse;

/**
 * Legacy Hello V1 request. Remote Management normalizes it to V4 before handling the session.
 */
export interface HelloV1 {
    /**
     * The legacy handshake.
     */
    hello: {
        /**
         * Hello version 1.
         */
        version: 1;
        /**
         * The project's API key.
         */
        apiKey: string;
        /**
         * The device identifier.
         */
        deviceId: string;
        /**
         * The device type.
         */
        deviceType: string;
        /**
         * How the device connects.
         */
        connection: 'ip' | 'daemon';
        /**
         * The sensors the device offers.
         */
        sensors?: string[];
    };
}
/**
 * Legacy Hello V2 request. Remote Management normalizes it to V4 before handling the session.
 */
export interface HelloV2 {
    /**
     * The legacy handshake.
     */
    hello: {
        /**
         * Hello version 2.
         */
        version: 2;
        /**
         * The project's API key.
         */
        apiKey: string;
        /**
         * The device identifier.
         */
        deviceId: string;
        /**
         * The device type.
         */
        deviceType: string;
        /**
         * How the device connects.
         */
        connection: 'ip' | 'daemon';
        /**
         * The sensors the device offers.
         */
        sensors: Sensor[];
    };
}
/**
 * A sampling sensor in Hello V2 and V3.
 */
export interface Sensor {
    /**
     * Sensor name.
     */
    name: string;
    /**
     * Maximum sample length in seconds.
     */
    maxSampleLengthS: number;
    /**
     * Supported frequencies in hertz.
     */
    frequencies: number[];
}
/**
 * Legacy Hello V3 request. Remote Management normalizes it to V4 before handling the session.
 */
export interface HelloV3 {
    /**
     * The legacy handshake.
     */
    hello: {
        /**
         * Hello version 3.
         */
        version: 3;
        /**
         * The project's API key.
         */
        apiKey: string;
        /**
         * The device identifier.
         */
        deviceId: string;
        /**
         * The device type.
         */
        deviceType: string;
        /**
         * How the device connects.
         */
        connection: 'ip' | 'daemon';
        /**
         * The sensors the device offers.
         */
        sensors: Sensor[];
        /**
         * Whether the device supports snapshot streaming.
         */
        supportsSnapshotStreaming: boolean;
    };
}
/**
 * The historical TypeScript Hello response contract, retained for existing imports. Its required
 * serverTimestamp is an old typing limitation: actual refusals can omit it. New code should use the V4
 * schema's HelloResponse union.
 */
export interface HelloResponse {
    /**
     * Whether the handshake was accepted.
     */
    hello: boolean;
    /**
     * Optional rejection reason.
     */
    err?: string;
    /**
     * Whether authentication succeeded.
     */
    auth?: boolean;
    /**
     * Server time in milliseconds since the epoch, required by the historical TS interface.
     */
    serverTimestamp: number;
}
