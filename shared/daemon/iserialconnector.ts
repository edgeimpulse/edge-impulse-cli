import TypedEmitter from 'typed-emitter';

export interface ISerialConnector extends TypedEmitter<{
    connected: () => void;
    data: (buffer: Buffer) => void;
    error: (err: any) => void;
    close: () => void;
}> {
    isConnected(): boolean;
    connect(): Promise<void>;
    write(buffer: Buffer): Promise<void>;
    setBaudRate(baudRate: number): Promise<void>;
    disconnect(): Promise<boolean>;
    getMACAddress(): Promise<string | null>;
    hasSerial(): Promise<boolean>;
    canSwitchBaudRate(): boolean;
}
