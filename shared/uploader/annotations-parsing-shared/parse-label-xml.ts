import { SupportedLabelFormatInfo, SupportedLabelFormatNames, SupportedLabelFormatXml, supportedXmlLabelFormats } from "./label-file-types";
import { LabelsParseOutput } from "./label-files-shared";
import { checkJsonMatchesFormat, validateJsonSchema } from "./parse-label-json";

type ParsedJSON = string | { [ key: string ]: ParsedJSON | ParsedJSON[] };

/**
 * Convert an XML document to JSON
 * @param xml An XML document
 * @returns The equivalent JSON
 */
export function xmlToJson(xml: XMLDocument) {
    // We're never interested in text nodes, just their value
    const TEXT_NODE_TYPE = 3;

    // Recursively explore a node, returning it as JSON
    const exploreNode = (node: Node): ParsedJSON | undefined => {
        if (node.nodeType === TEXT_NODE_TYPE) {
            // Text node with sibling nodes; just ignore the node.
            return undefined;
        }

        if (typeof node.childNodes === 'undefined' || node.childNodes === null || node.childNodes.length === 0) {
            // Node with no children; just return the value
            const nodeValue = node.nodeValue;
            if (nodeValue) {
                return nodeValue;
            }
            else {
                return undefined;
            }
        }

        if (node.childNodes.length === 1 && node.childNodes[0].nodeType === TEXT_NODE_TYPE) {
            // Text node with no siblings; ignore the text part, return just the value
            const nodeValue = node.childNodes[0].nodeValue;
            if (nodeValue) {
                return nodeValue;
            }
            else {
                return undefined;
            }
        }

        // Otherwise we have a node with children; recursively parse it
        let nodeValueParsed: ParsedJSON = { };
        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let ix = 0; ix < node.childNodes.length; ix++) {
            const child = node.childNodes[ix];
            const childKey = child.nodeName as string | undefined;

            // Ignore comments and child nodes with no key
            if (!childKey || childKey === '#comment') {
                continue;
            }

            const childValue = exploreNode(child);

            // Ignore text nodes with no siblings
            if (!childValue) {
                continue;
            }

            const curNodeVal = nodeValueParsed[childKey];
            if (curNodeVal !== undefined) {
                // Already have an entry for this key.
                // In this case, we'll convert it to an array.
                if (Array.isArray(curNodeVal)) {
                    // Array already exists, push to it
                    curNodeVal.push(childValue);
                }
                else {
                    // This is the second entry, so create an array
                    nodeValueParsed[childKey] = [curNodeVal, childValue];
                }
            }
            else {
                // Otherwise we can just store the node value against its name.
                nodeValueParsed[childKey] = childValue;
            }
        }
        return nodeValueParsed;
    };

    const rootNode = typeof xml.getRootNode !== 'undefined' ? xml.getRootNode() : xml;

    return exploreNode(rootNode);
}

/**
 * Parse an XML labels file, converting it to a format usable in EI
 * @param xmlFile XML document to convert
 * @param format Format to convert from
 * @returns Labels or bounding boxes from the file
 */
export function parseXmlLabelsFile(xmlDoc: XMLDocument, format: SupportedLabelFormatNames): LabelsParseOutput {
    const xmlFormat = supportedXmlLabelFormats.find(f => f.info.key === format);
    if (!xmlFormat || xmlFormat.fn.fileType !== 'xml') {
        return {
            success: false,
            reason: `No XML format matches type '${format}'`
        };
    }

    // Convert to JSON
    const json = xmlToJson(xmlDoc);
    if (!json || typeof json === 'string') {
        throw new Error('Could not convert XML to JSON');
    }
    // Validate the JSON
    const isValid = validateJsonSchema(xmlFormat.fn.schema, json);
    if (!isValid.valid) {
        throw new Error(`File did not match expected format: ${isValid.reason}`);
    }

    try {
        const res = xmlFormat.fn.conversionFunction(json);
        if (res.type === 'object-detection') {
            return {
                success: true,
                match: xmlFormat.info,
                type: 'object-detection',
                labels: res.bboxes,
            };
        }
        else {
            return {
                success: true,
                match: xmlFormat.info,
                type: 'single-label',
                labels: res.labels,
            };
        }
    }
    catch (ex) {
        return {
            success: false,
            reason: `Error parsing type '${xmlFormat.info.name}'; ${(<Error>ex).message}`
        };
    }
}

/**
 * Check if a given XML document matches any known schema from a list of supported types
 * @param xmlFile XML document to analyze
 * @param formatsToTry List of formats to try; if not given, will try all formats
 * @returns Format info if a match is found
 */
export function checkXmlMatchesAnyFormat(xmlFile: XMLDocument, formatsToTry?: SupportedLabelFormatXml[]):
    SupportedLabelFormatInfo | undefined {

    let jsonObj: object;
    try {
        // Convert to JSON
        const json = xmlToJson(xmlFile);
        if (!json || typeof json === 'string') {
            throw new Error('Could not convert XML to JSON');
        }
        jsonObj = json;
    }
    catch (ex) {
        // Failed to parse; no valid match
        return undefined;
    }

    const allFormats = formatsToTry ? formatsToTry : supportedXmlLabelFormats;

    for (const format of allFormats) {
        if (format.fn.fileType !== 'xml') {
            continue;
        }
        const formatMatch = checkJsonMatchesFormat(format, jsonObj);

        if (formatMatch.valid) {
            return format.info;
        }
    }

    return undefined;
}
