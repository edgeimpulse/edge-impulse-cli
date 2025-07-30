import { Server as SocketIoServer } from 'socket.io';

// Default parameters for legacy Socket.IO v2.
// These parameters are used to ensure compatibility with
// EIO3 (Engine.IO v3) clients and to allow cross-origin requests.
// See https://socket.io/docs/v4/server-api/#new-Serverhttpserver-options
// and https://socket.io/docs/v4/socket-io-protocol/
// for more details on the parameters.
export const DEFAULT_SOCKET_IO_V2_PARAMS = {
    cors: {
        origin: '*',
        methods: [ 'GET', 'POST' ],
        credentials: true
    },
    allowEIO3: true, // Allow compatibility with EIO3 clients
    maxHttpBufferSize: 1e8 // 100 MB
};

// Intercept EIO3 packets at the engine.io level
// https://socket.io/docs/v4/socket-io-protocol/
export function startEio3Interceptor(io: SocketIoServer) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    io.engine.on('packet', (packet: { data?: string }, engineSocket: { id: string }) => {
        if (typeof packet.data === 'string') {
            const MESSAGE_CONNECT = '40';
            const MESSAGE_EVENT = '42';

            if (packet.data === MESSAGE_CONNECT) {
                // EIO3: connection established, ignore
                return;
            }
            if (packet.data.startsWith(MESSAGE_EVENT)) {
                try {
                    const parsed = JSON.parse(packet.data.slice(2)) as [string, unknown];
                    const eventName = parsed[0];
                    const payload = parsed[1];
                    // Find the corresponding socket.io socket
                    const sioSocket = io.sockets.sockets.get(engineSocket.id);
                    if (sioSocket) {
                        sioSocket.emit(eventName, payload);
                    }
                }
                catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('Failed to parse EIO3 payload:', packet.data);
                }
                // Prevent socket.io from processing this packet further
                return;
            }
        }
    });
}