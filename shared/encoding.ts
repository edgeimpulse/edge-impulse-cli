export default function encodeIngestionHeader(header: string): string {
    let encodedHeader;
    try {
        encodedHeader = encodeURIComponent(header);
    }
    catch (ex) {
        encodedHeader = header;
    }

    return encodedHeader;
}
