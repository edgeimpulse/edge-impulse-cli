import { ExportInputBoundingBox } from "../../bounding-box-file-types";
import { supportedJsonLabelFormats, SupportedLabelFormatInfo, SupportedLabelFormatJson, SupportedLabelFormatNames,
    SupportedLabelFormatXml,
    supportedTxtLabelFormats } from "./label-file-types";
import { LabelsParseOutput, removeExtension } from "./label-files-shared";

export type JsonSchemaConstraint = {
    type: 'object';
    isMap?: false;
    value: { [k: string]: JsonSchemaConstraint };
    required?: boolean;
    allowAllKeys?: boolean;
    validationFn?: (o: object) => SchemaValidationOutputOmitScope;
} | {
    type: 'object';
    isMap: true;
    values: JsonSchemaConstraint | {
        // Allows you to define a constraint recursively, with some recursive base type.
        // E.g. type X = { [ key: string ]: X | number } ->
        // values: { type: 'recursive', base: { type: 'number', ... } }
        type: 'recursive';
        base: JsonSchemaConstraint;
    };
    required?: boolean;
    validationFn?: (o: object) => SchemaValidationOutputOmitScope;
} | {
    type: 'array';
    values: JsonSchemaConstraint | ((o: object) => JsonSchemaConstraint);
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    validationFn?: (o: any[]) => SchemaValidationOutputOmitScope;
} | {
    type: 'number';
    valid?: number[];
    required?: boolean;
    validationFn?: (o: number) => SchemaValidationOutputOmitScope;
} | {
    type: 'string';
    valid?: string[];
    required?: boolean;
    validationFn?: (o: string) => SchemaValidationOutputOmitScope;
} | {
    type: 'boolean';
    valid?: boolean[];
    required?: boolean;
    validationFn?: (o: boolean) => SchemaValidationOutputOmitScope;
} | {
    type: 'any';
    required?: boolean;
} | {
    type: 'either';
    required?: boolean;
    possibleTypes: JsonSchemaConstraint[];
};

type SchemaValidationOutput = {
    valid: false;
    reason: string;
    scope: (string | number)[];
} | {
    valid: true;
};

type SchemaValidationOutputOmitScope = {
    valid: false;
    reason: string;
} | {
    valid: true;
};

type SchemaValidationOpts = {
    examineFirstArrayEntryOnly?: boolean;
    examineFirstMapEntryOnly?: boolean;
};

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
 * Check whether a JSON object adheres to a given schema
 * @param schema Schema to validate against
 * @param instance JSON instance
 * @param opts Options
 * @returns valid: true if JSON matches schema; if not, returns why not
 */
export function validateJsonSchema(schema: JsonSchemaConstraint, instance: object, opts?: SchemaValidationOpts):
    SchemaValidationOutput {

    const validateObject = (io: object, constraint: JsonSchemaConstraint | undefined, scope: (string | number)[]):
        SchemaValidationOutput => {

        if (!constraint) {
            return {
                valid: true
            };
        }

        // If type 'any', do no further validation
        if (constraint.type === 'any') {
            return {
                valid: true
            };
        }

        // If type 'either', check we have any valid match
        if (constraint.type === 'either') {
            for (const possibleConstraint of constraint.possibleTypes) {
                const result = validateObject(io, possibleConstraint, scope);
                if (result.valid) {
                    return {
                        valid: true
                    };
                }
            }
            // No valid matches
            return {
                valid: false,
                reason: 'Value did not match any valid constraint',
                scope: scope
            };
        }

        // Is the root the correct type?
        const type = Array.isArray(io) ? 'array' : typeof io;
        if (type !== constraint.type) {
            return {
                valid: false,
                reason: `Incorrect type. Got: ${type}, expected: ${constraint.type}`,
                scope: scope
            };
        }
        // Don't allow NaN for number
        if (typeof io === 'number' && isNaN(io)) {
            return {
                valid: false,
                reason: 'Entry is NaN',
                scope,
            };
        }

        if (constraint.type === 'object' && !constraint.isMap) {
            // Validate object has required keys & values
            const rootObj = <{ [k: string]: object | number | string | boolean }>io;

            // For each required key/value:
            for (const [ key, value ] of Object.entries(constraint.value || [])) {
                // Examine constraint on the current value
                const rootObjEntries = Object.entries(rootObj || []);
                const entry = rootObjEntries.find(([ k1, _ ]) => k1 === key);

                // Value is required but is missing in target object
                if (value.required && typeof entry === 'undefined') {
                    return {
                        valid: false,
                        reason: `Missing value. Expected value for key: ${key}`,
                        scope: scope
                    };
                }

                // Recursively validate this value
                if (entry) {
                    const entryIsValid = validateObject(<object>entry[1], value, [ ...scope, key ]);
                    if (!entryIsValid.valid) {
                        return entryIsValid;
                    }
                }
            }

            // Check we have no additional (unexpected) keys when disallowed
            if (!constraint.allowAllKeys) {
                for (const key of Object.keys(rootObj)) {
                    if (!Object.keys(constraint.value || { }).includes(key)) {
                        return {
                            valid: false,
                            reason: `Got unexpected key: ${key}`,
                            scope: scope
                        };
                    }
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                const validationRes = constraint.validationFn(rootObj);
                if (!validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        else if (constraint.type === 'object' && constraint.isMap) {
            // Like an 'object', only the keys can be any string, we just enforce types of values
            const rootObj = <{ [k: string]: object }>io;
            // Constraint may be recursively defined; if so, reuse the parent constraint.
            const valuesConstraint: JsonSchemaConstraint = constraint.values.type === 'recursive' ? {
                type: 'either',
                possibleTypes: [ constraint, constraint.values.base ],
            } : constraint.values;

            // Recursively validate all values
            for (const [ key, value ] of Object.entries(rootObj)) {
                const entryIsValid = validateObject(value, valuesConstraint, [ ...scope, key ]);
                if (!entryIsValid.valid) {
                    return entryIsValid;
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                const validationRes = constraint.validationFn(rootObj);
                if (!validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        else if (constraint.type === 'array') {
            // Validate array has correct types for each entry
            const rootArr = <object[]>io;

            // Validate array length
            if (typeof constraint.minLength !== 'undefined' && rootArr.length < constraint.minLength) {
                return {
                    valid: false,
                    reason: `Array contains fewer elements than expected. Got: ${rootArr.length}, expected: ${constraint.minLength}`,
                    scope: scope
                };
            }
            if (typeof constraint.maxLength !== 'undefined' && rootArr.length > constraint.maxLength) {
                return {
                    valid: false,
                    reason: `Array contains more elements than expected. Got: ${rootArr.length}, expected: ${constraint.maxLength}`,
                    scope: scope
                };
            }

            // Validate type of each entry
            for (let idx = 0; idx < rootArr.length; idx++) {
                const entryIsValid = validateObject(rootArr[idx],
                    (typeof constraint.values === 'function') ? constraint.values(rootArr[idx]) : constraint.values,
                    [ ...scope, idx ]);
                if (!entryIsValid.valid) {
                    return entryIsValid;
                }
                // Optionally, only validate the first entry
                if (opts && opts.examineFirstArrayEntryOnly) {
                    break;
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                const validationRes = constraint.validationFn(rootArr);
                if (!validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        else {
            // Primitive type
            // If we have a constraint on the accepted values here, validate them
            if (constraint.valid) {
                const validEntries = (<(boolean | string | number)[]>constraint.valid).map(cv => JSON.stringify(cv));
                if (validEntries.indexOf(JSON.stringify(io)) === -1) {
                    return {
                        valid: false,
                        reason: `Invalid value. Expected value in: ${JSON.stringify(constraint.valid)}, got: ${JSON.stringify(io)}`,
                        scope: scope
                    };
                }
            }

            // Check custom validation function
            if (constraint.validationFn) {
                let validationRes: SchemaValidationOutputOmitScope | undefined;
                if (constraint.type === 'string') {
                    validationRes = constraint.validationFn(io as unknown as string);
                }
                else if (constraint.type === 'boolean') {
                    validationRes = constraint.validationFn(io as unknown as boolean);
                }
                else if (constraint.type === 'number') {
                    validationRes = constraint.validationFn(io as unknown as number);
                }
                if (validationRes && !validationRes.valid) {
                    return { ...validationRes, scope };
                }
            }
        }
        return {
            valid: true
        };
    };
    return validateObject(instance, schema, []);
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
