export interface IWebsocket {
    close(): void;

    terminate(): void;

    removeAllListeners(): void;

    send(message: string | Buffer): void;

    on(m: 'message' | 'pong' | 'open' | 'close' | 'error', fn?: (data: Buffer) => void): void;

    once(m: 'message' | 'pong' | 'open' | 'close' | 'error', fn?: (data: Buffer) => void): void;

    ping(): void;
}
