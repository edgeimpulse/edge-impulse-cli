declare module 'borc' {
    function decodeAll(buffer: Buffer): any[];
    function encode(input: any): Buffer;

    export {
        decodeAll,
        encode
    };
}