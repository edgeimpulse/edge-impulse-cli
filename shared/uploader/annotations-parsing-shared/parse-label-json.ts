import { ExportInputBoundingBox } from "../../bounding-box-file-types";
import { SchemaValidationOutput, validateJsonSchema } from "../../json-parsing";
import { supportedJsonLabelFormats, SupportedLabelFormatInfo, SupportedLabelFormatJson, SupportedLabelFormatNames,
    SupportedLabelFormatXml,
    supportedTxtLabelFormats } from "./label-file-types";
import { LabelsParseOutput, removeExtension } from "./label-files-shared";

/**
 * Check whether a JSON object adheres to the schema for a given dataset format
 * @param format Dataset format to check
 * @param json JSON instance
 * @returns valid: true if JSON matches format; if not, returns why not
 */
export function checkJsonMatchesFormat(format: SupportedLabelFormatJson | SupportedLabelFormatXml, json: object):
    SchemaValidationOutput {

    const valOpts = {
        examineFirstArrayEntryOnly: true,
        examineFirstMapEntryOnly: true
    };
    return validateJsonSchema(format.fn.schema, json, valOpts);
}

/**
 * Check if a given JSON object matches any known schema from a list of supported types
 * @param jsonFile JSON object to analyze
 * @param formatsToTry List of formats to try; if not given, will try all formats
 * @returns Format info if a match is found
 */
export function checkJsonMatchesAnyFormat(jsonFile: string, formatsToTry?: SupportedLabelFormatJson[]):
    SupportedLabelFormatInfo | undefined {

    const json = <object>JSON.parse(jsonFile);
    const allFormats = formatsToTry ? formatsToTry : supportedJsonLabelFormats;

    for (const format of allFormats) {
        const formatMatch = checkJsonMatchesFormat(format, json);

        if (formatMatch.valid) {
            return format.info;
        }
    }

    return undefined;
}

/**
 * Parse a JSON labels file, converting it to a format usable in EI
 * @param jsonFile JSON file to convert
 * @param format Format to convert from
 * @returns Labels or bounding boxes from the JSON object
 */
export function parseJsonLabelsFile(jsonFile: string, format: SupportedLabelFormatNames): LabelsParseOutput {
    const json = <object>JSON.parse(jsonFile);

    const jsonFormat = supportedJsonLabelFormats.find(f => f.info.key === format);
    if (!jsonFormat) {
        return {
            success: false,
            reason: `No JSON format matches type '${format}'`
        };
    }

    try {
        // Validate against schema
        const formatMatch = checkJsonMatchesFormat(jsonFormat, json);
        if (!formatMatch.valid) {
            throw new Error(formatMatch.reason);
        }

        // Convert to bounding boxes
        const res = jsonFormat.fn.conversionFunction(json);
        if (res.type === 'object-detection') {
            return {
                success: true,
                match: jsonFormat.info,
                type: 'object-detection',
                labels: res.bboxes,
            };
        }
        else {
            return {
                success: true,
                match: jsonFormat.info,
                type: 'single-label',
                labels: res.labels,
            };
        }
    }
    catch (ex) {
        return {
            success: false,
            reason: `Error parsing type '${jsonFormat.info.name}'; ${(<Error>ex).message}`
        };
    }
}

/**
 * Parse a single TXT labels file (e.g. YOLO)
 * @param file TXT file contents
 * @param filename File name; used to work out which sample this label belongs to
 * @param format Dataset format
 * @returns Bounding boxes from the file
 */
export function parseTxtLabelsFile(file: string, filename: string, format: SupportedLabelFormatNames):
    LabelsParseOutput {

    const labelFormat = supportedTxtLabelFormats.find(f => f.info.key === format);
    if (!labelFormat || labelFormat.fn.fileType !== 'txt') {
        return {
            success: false,
            reason: `No txt format matches type '${format}'`
        };
    }

    try {
        const labelsRes = labelFormat.fn.conversionFunction(file);
        let labels: { [ filename: string ]: ExportInputBoundingBox[] } = { };
        labels[removeExtension(filename)] = labelsRes;

        return {
            success: true,
            match: labelFormat.info,
            type: 'object-detection',
            labels: labels,
        };
    }
    catch (ex) {
        return {
            success: false,
            reason: `Error parsing type '${labelFormat.info.name}'; ${(<Error>ex).message}`
        };
    }
}
