import { BoundingBoxesMap, ExportInputBoundingBox } from "../../bounding-box-file-types";
import { JsonSchemaConstraint } from "./parse-label-json";
import { cocoJsonSchema, pascalVocSchema, remoObjectDetectionSchema, remoSingleLabelSchema } from "./label-json-schema";
import { LabelMapType } from "./label-files-shared";
import { TypedCsv } from "./parse-label-csv";

export type SupportedLabelType = 'single-label' | 'object-detection';

// We support datasets with annotations in a range of formats.
// For each format we support, we need to define a schema and a conversion function,
// allowing us to convert that format into a format we recognize.

export type FormatMetadata = {
    key: SupportedLabelFormatNames;
    type: SupportedLabelType;
    fileFilter: (name: string) => boolean;
    formatStyle: 'json' | 'csv' | 'txt' | 'xml' | 'bounding_boxes.labels';
    additionalOpts: FormatAdditionalOpts | undefined;
    labelsFile?: FormatLabelsFile[];
};

export type LabelMapFile = { [ filename: string ]: string };

type SupportedLabelFormat = SupportedLabelFormatJson |
    SupportedLabelFormatCsv |
    SupportedLabelFormatTxt |
    SupportedLabelFormatXml;

export type SupportedLabelFormatJson = {
    info: SupportedLabelFormatInfo;
    fn: SupportedLabelFormatFnJson;
};

export type SupportedLabelFormatCsv = {
    info: SupportedLabelFormatInfo;
    fn: SupportedLabelFormatFnCsv;
};

export type SupportedLabelFormatTxt = {
    info: SupportedLabelFormatInfo;
    fn: SupportedLabelFormatFnTxt;
};

export type SupportedLabelFormatXml = {
    info: SupportedLabelFormatInfo;
    fn: SupportedLabelFormatFnXml;
};

export type SupportedLabelFormatInfo = {
    key: SupportedLabelFormatNames;
    name: string;
    parentFormat: SupportedLabelFormatStyles;
};

// Some formats require some additional steps
type FormatAdditionalOpts = {
    // Format expects a labelmap file to map label indexes to strings
    needsLabelmap: boolean;
    // Most annotations map filename with extension to the label. In some cases (e.g. YOLO), we have no extension,
    // so when looking up labels for a particular file we need to remove the file extension first
    lookupNoExtension: boolean;
    // Bounding boxes may be normalized, so a fraction of the image size
    normalizedBoundingBoxes: boolean;
    // Bounding boxes may have x and y given as the center of the box
    centeredBoundingBoxes: boolean;
};

// Some formats need a label map, mapping labels from one string to another.
// In the case of numeric indices, if we can't detect a label map file, we allow the user
// to enter a list of labels and use that to map labels.
type FormatLabelsFile = {
    // Function used to try to locate a label map file
    fileFilter: (name: string) => boolean;
    // Label map file type
    fileType: 'csv';
    // Label map file description
    fileDescription: string;
    // Function to convert label map file to a usable label map
    conversionFunction: (csv: string[][]) => LabelMapType;
    // Are we mapping from numeric indices?
    isNumeric: boolean;
} | {
    fileFilter: (name: string) => boolean;
    fileType: 'txt';
    fileDescription: string;
    conversionFunction: (txt: string) => LabelMapType;
    isNumeric: boolean;
} | {
    fileFilter: (name: string) => boolean;
    fileType: 'yaml';
    fileDescription: string;
    conversionFunction: (yaml: any) => LabelMapType;
    isNumeric: boolean;
};

type SupportedLabelFormatFnJson = {
    fileType: 'json';
    type: 'object-detection';
    // Function to convert any JSON to valid bounding boxes, once we've verified the JSON matches the schema
    conversionFunction: (json: object) => BoundingBoxesOutput;
    // Check the JSON matches this format by validating against this schema
    schema: JsonSchemaConstraint;
    additionalOpts?: FormatAdditionalOpts;
    labelsFile?: FormatLabelsFile[];
} | {
    fileType: 'json';
    type: 'single-label';
    // Function to convert any JSON to a label map, once we've verified the JSON matches the schema
    conversionFunction: (json: object) => SingleLabelOutput;
    // Check the JSON matches this format by validating against this schema
    schema: JsonSchemaConstraint;
    additionalOpts?: FormatAdditionalOpts;
    labelsFile?: FormatLabelsFile[];
};

type SupportedLabelFormatFnCsv = {
    fileType: 'csv';
    type: 'object-detection';
    // Function to convert any CSV to valid bounding boxes, once we've verified the CSV has correct headings
    conversionFunction: (csv: TypedCsv<any>) => BoundingBoxesOutput;
    // Check the CSV matches this format by checking header columns
    schema: string[];
    additionalOpts?: FormatAdditionalOpts;
    labelsFile?: FormatLabelsFile[];
} | {
    fileType: 'csv';
    type: 'single-label';
    // Function to convert any CSV to a label map, once we've verified the CSV has correct headings
    conversionFunction: (csv: TypedCsv<any>) => SingleLabelOutput;
    // Check the CSV matches this format by checking header columns
    schema: string[];
    additionalOpts?: FormatAdditionalOpts;
    labelsFile?: FormatLabelsFile[];
};

type SupportedLabelFormatFnTxt = {
    fileType: 'txt';
    type: 'object-detection';
    // Function to convert a TXT file to bounding boxes. No schema here; just throw if invalid
    conversionFunction: (txt: string, labels?: LabelMapType) => ExportInputBoundingBox[];
    additionalOpts?: FormatAdditionalOpts;
    labelsFile?: FormatLabelsFile[];
};

type SupportedLabelFormatFnXml = {
    fileType: 'xml';
    type: 'object-detection';
    // Function to convert any JSON to valid bounding boxes, once we've verified the JSON matches the schema
    conversionFunction: (json: object) => BoundingBoxesOutput;
    // Check the JSON matches this format by validating against this schema
    schema: JsonSchemaConstraint;
    additionalOpts?: FormatAdditionalOpts;
    labelsFile?: FormatLabelsFile[];
} | {
    fileType: 'xml';
    type: 'single-label';
    // Function to convert any JSON to a label map, once we've verified the JSON matches the schema
    conversionFunction: (json: object) => SingleLabelOutput;
    // Check the JSON matches this format by validating against this schema
    schema: JsonSchemaConstraint;
    additionalOpts?: FormatAdditionalOpts;
    labelsFile?: FormatLabelsFile[];
};

type BoundingBoxesOutput = {
    type: 'object-detection';
    bboxes: BoundingBoxesMap;
};

type SingleLabelOutput = {
    type: 'single-label';
    labels: LabelMapFile;
};

// All the annotation formats we support
export type SupportedLabelFormatStyles = 'edge-impulse-format'
    | 'coco-json'
    | 'open-images-csv'
    | 'pascal-voc-xml'
    | 'plain-csv'
    | 'remo-json'
    | 'yolo-txt';

// All the annotation format keys overall (single label and bounding box variants)
export type SupportedLabelFormatNames = 'ei-bounding-boxes-format'
    | 'coco'
    | 'plain-csv'
    | 'plain-csv-object-detection'
    | 'remo-json-single-label'
    | 'remo-json-object-detection'
    | 'yolo-txt'
    | 'open-images-csv'
    | 'pascal-voc-xml-object-detection';

// Supported JSON formats
export const supportedJsonLabelFormats: SupportedLabelFormatJson[] = [
    // COCO
    {
        info: {
            key: 'coco',
            name: 'COCO JSON',
            parentFormat: 'coco-json',
        },
        fn: {
            fileType: 'json',
            type: 'object-detection',
            conversionFunction: (json) => {
                const jsonParsed = json as CocoJsonBoundingBoxFormat;

                // Map image IDs to filenames
                let filenameMap = new Map<number, string>();
                for (const image of jsonParsed.images) {
                    filenameMap.set(image.id, image.file_name);
                }

                // Map category IDs to labels
                let categoryMap = new Map<number, string>();
                for (const category of jsonParsed.categories) {
                    categoryMap.set(category.id, category.name);
                }

                // Now extract all bounding boxes
                let bboxes: BoundingBoxesMap = { };
                for (const annotation of jsonParsed.annotations) {
                    const filename = filenameMap.get(annotation.image_id);
                    if (!filename) {
                        throw new Error(`Missing file info for image ID ${annotation.image_id}`);
                    }
                    const label = categoryMap.get(annotation.category_id);
                    if (!label) {
                        throw new Error(`Missing category info for category ID ${annotation.category_id}`);
                    }

                    // May or may not be nested
                    let allBoxes: [number, number, number, number][] = [];
                    if (!Array.isArray(annotation.bbox[0])) {
                        const box = <[number, number, number, number]>annotation.bbox;
                        allBoxes.push(box);
                    } else {
                        allBoxes = <[number, number, number, number][]>annotation.bbox;
                    }

                    const parsedBoxes: ExportInputBoundingBox[] = allBoxes.map(box => {
                        if (box.length !== 4) {
                            throw new Error(`Expected bounding box to have length 4 but got ${box.length}`);
                        }
                        return {
                            label: label,
                            x: box[0],
                            y: box[1],
                            width: box[2],
                            height: box[3]
                        };
                    });
                    if (bboxes[filename]) {
                        bboxes[filename] = [...bboxes[filename], ...parsedBoxes];
                    } else {
                        bboxes[filename] = parsedBoxes;
                    }
                }

                return {
                    type: 'object-detection',
                    bboxes: bboxes,
                };
            },
            schema: cocoJsonSchema,
        },
    },
    // Remo (single label)
    {
        info: {
            key: 'remo-json-single-label',
            name: 'Remo JSON (single label)',
            parentFormat: 'remo-json',
        },
        fn: {
            fileType: 'json',
            type: 'single-label',
            conversionFunction: (json) => {
                const jsonParsed = json as RemoSingleLabelFormat[];
                let labels: LabelMapFile = { };
                jsonParsed.forEach(row => {
                    labels[row.file_name] = row.classes[0];
                });
                return {
                    type: 'single-label',
                    labels: labels,
                };
            },
            schema: remoSingleLabelSchema,
        }
    },
    // Remo (object detection)
    {
        info: {
            key: 'remo-json-object-detection',
            name: 'Remo JSON (object detection)',
            parentFormat: 'remo-json',
        },
        fn: {
            fileType: 'json',
            type: 'object-detection',
            conversionFunction: (json) => {
                const jsonParsed = json as RemoBoundingBoxesFormat[];
                let bboxes: BoundingBoxesMap = { };

                for (const file of jsonParsed) {
                    bboxes[file.file_name] = [];
                    for (const annotation of file.annotations) {
                        const box = annotation.bbox;
                        for (const classname of annotation.classes) {
                            bboxes[file.file_name].push({
                                label: classname,
                                x: box.xmin,
                                y: box.ymin,
                                width: box.xmax - box.xmin,
                                height: box.ymax - box.ymin
                            });
                        }
                    }
                }

                return {
                    type: 'object-detection',
                    bboxes: bboxes
                };
            },
            schema: remoObjectDetectionSchema,
        }
    },
];

const plainCsvObjDetSchema = ['file_name', 'classes', 'xmin', 'ymin', 'xmax', 'ymax'] as const;
const plainCsvSchema = ['file_name', 'class_name'] as const;
const openImagesCsvSchema = ['ImageID', 'LabelName', 'XMin', 'XMax', 'YMin', 'YMax'] as const;

// Supported formats that come in a CSV file
export const supportedCsvLabelFormats: SupportedLabelFormatCsv[] = [
    // Plain CSV (object detection)
    {
        info: {
            key: 'plain-csv-object-detection',
            name: 'Plain CSV (object detection)',
            parentFormat: 'plain-csv',
        },
        fn: {
            fileType: 'csv',
            type: 'object-detection',
            schema: Array.from(plainCsvObjDetSchema),
            conversionFunction: (csv: TypedCsv<typeof plainCsvObjDetSchema>) => {
                let bboxes: BoundingBoxesMap = { };

                for (const row of csv) {
                    const filename = row.file_name;
                    const classes = row.classes.split(';').map(s => s.trim());
                    const x = Number(row.xmin);
                    const y = Number(row.ymin);
                    const xMax = Number(row.xmax);
                    const yMax = Number(row.ymax);
                    if (isNaN(x) || isNaN(y) || isNaN(xMax) || isNaN(yMax)) {
                        continue;
                    }

                    const width = xMax - x;
                    const height = yMax - y;
                    if (width < 0) {
                        continue;
                    }
                    if (height < 0) {
                        continue;
                    }

                    for (const className of classes) {
                        if (!bboxes[filename]) {
                            bboxes[filename] = [];
                        }
                        bboxes[filename].push({
                            label: className,
                            x: x,
                            y: y,
                            width: width,
                            height: height,
                        });
                    }
                }
                return {
                    type: 'object-detection',
                    bboxes: bboxes,
                };
            }
        },
    },
    // Plain CSV (single label)
    {
        info: {
            key: 'plain-csv',
            name: 'Plain CSV (single label)',
            parentFormat: 'plain-csv',
        },
        fn: {
            fileType: 'csv',
            type: 'single-label',
            schema: Array.from(plainCsvSchema),
            conversionFunction: (csv: TypedCsv<typeof plainCsvSchema>) => {
                let labels: LabelMapFile = { };

                for (const row of csv) {
                    labels[row.file_name] = row.class_name;
                }

                return {
                    type: 'single-label',
                    labels: labels,
                };
            }
        }
    },
    // Open images CSV
    {
        info: {
            key: 'open-images-csv',
            name: 'Open Images CSV',
            parentFormat: 'open-images-csv',
        },
        fn: {
            fileType: 'csv',
            type: 'object-detection',
            schema: Array.from(openImagesCsvSchema),
            conversionFunction: (csv: TypedCsv<typeof openImagesCsvSchema>) => {
                let bboxes: BoundingBoxesMap = { };

                for (const row of csv) {
                    const filename = row.ImageID;
                    const className = row.LabelName;
                    const x = Number(row.XMin);
                    const y = Number(row.YMin);
                    const xMax = Number(row.XMax);
                    const yMax = Number(row.YMax);
                    if (isNaN(x) || isNaN(y) || isNaN(xMax) || isNaN(yMax)) {
                        continue;
                    }

                    const width = xMax - x;
                    const height = yMax - y;
                    if (width < 0) {
                        continue;
                    }
                    if (height < 0) {
                        continue;
                    }

                    if (!bboxes[filename]) {
                        bboxes[filename] = [];
                    }
                    bboxes[filename].push({
                        label: className,
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                    });
                }

                return {
                    type: 'object-detection',
                    bboxes: bboxes,
                };
            },
            additionalOpts: {
                needsLabelmap: true,
                normalizedBoundingBoxes: true,
                centeredBoundingBoxes: false,
                lookupNoExtension: true,
            },
            labelsFile: [{
                fileFilter: (name) => {
                    return name.endsWith('class-descriptions.csv');
                },
                fileType: 'csv',
                conversionFunction: (csv) => {
                    let labels: LabelMapFile = { };

                    for (const row of csv) {
                        if (row.length < 2) continue;
                        labels[row[0]] = row[1];
                    }

                    return labels;
                },
                fileDescription: 'class-descriptions.csv',
                isNumeric: false
            }]
        }
    }
];

// Supported formats that come in a txt file
export const supportedTxtLabelFormats: SupportedLabelFormatTxt[] = [
    {
        info: {
            key: 'yolo-txt',
            name: 'YOLO TXT',
            parentFormat: 'yolo-txt',
        },
        fn: {
            fileType: 'txt',
            type: 'object-detection',
            conversionFunction: (txt) => {
                const lines = txt.split('\n');
                let boxes: ExportInputBoundingBox[] = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    const lineParts = line.split(' ');
                    if (lineParts.length !== 5) {
                        continue;
                    }
                    const label = lineParts[0];
                    const x = Number(lineParts[1]);
                    const y = Number(lineParts[2]);
                    const width = Number(lineParts[3]);
                    const height = Number(lineParts[4]);
                    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
                        throw new Error(`Got NaN value on line ${i}`);
                    }
                    boxes.push({
                        x: x,
                        y: y,
                        width: width,
                        height: height,
                        label: label
                    });
                }
                if (boxes.length === 0) {
                    throw new Error('No valid boxes found');
                }
                return boxes;
            },
            additionalOpts: {
                needsLabelmap: true,
                normalizedBoundingBoxes: true,
                centeredBoundingBoxes: true,
                lookupNoExtension: true,
            },
            labelsFile: [
                {
                    fileFilter: (name) => {
                        return name.toLowerCase().endsWith('.names')
                            || name.toLowerCase() === 'classes.txt';
                    },
                    fileType: 'txt',
                    conversionFunction: (txt) => {
                        let labelMap: LabelMapType = { };
                        const rows = txt.split('\n');
                        for (let i = 0; i < rows.length; i++) {
                            labelMap[i] = rows[i];
                        }
                        return labelMap;
                    },
                    fileDescription: 'labels.names',
                    isNumeric: true
                },
                {
                    fileFilter: (name) => {
                        return name.toLowerCase() === 'data.yaml';
                    },
                    fileType: 'yaml',
                    conversionFunction: (yamlContents) => {
                        let labelMap: LabelMapType = { };
                        // tslint:disable-next-line: no-unsafe-any
                        const yamlNames = yamlContents.names;
                        if (typeof yamlNames === 'undefined') {
                            throw new Error('File contains no "names" entry');
                        }
                        if (!Array.isArray(yamlNames)) {
                            throw new Error('"names" is not an array');
                        }
                        let nameIx = 0;
                        for (const name of yamlNames) {
                            if (typeof name === 'string') {
                                labelMap[nameIx++] = name;
                            }
                        }
                        return labelMap;
                    },
                    fileDescription: 'labels.names',
                    isNumeric: true
                },
            ]
        }
    }
];

export const supportedXmlLabelFormats: SupportedLabelFormatXml[] = [
    {
        info: {
            key: 'pascal-voc-xml-object-detection',
            name: 'Pascal VOC XML (object detection)',
            parentFormat: 'pascal-voc-xml',
        },
        fn: {
            fileType: 'xml',
            conversionFunction: (json) => {
                const jsonParsed = json as PascalVocBoundingBoxesFormat;
                let bboxes: BoundingBoxesMap = { };

                const boxesToProcess = Array.isArray(jsonParsed.annotation.object)
                    ? jsonParsed.annotation.object : [jsonParsed.annotation.object];
                let boxes: ExportInputBoundingBox[] = [];

                // Process each box
                for (const box of boxesToProcess) {
                    const x = Number(box.bndbox.xmin);
                    if (isNaN(x) || x < 0) {
                        throw new Error(`Got invalid value for xmin: ${box.bndbox.xmin}`);
                    }

                    const y = Number(box.bndbox.ymin);
                    if (isNaN(y) || y < 0) {
                        throw new Error(`Got invalid value for ymin: ${box.bndbox.ymin}`);
                    }

                    const xmax = Number(box.bndbox.xmax);
                    if (isNaN(xmax) || xmax < 0) {
                        throw new Error(`Got invalid value for xmax: ${box.bndbox.xmax}`);
                    }
                    if (xmax < x) {
                        throw new Error('Got bounding box with negative width');
                    }

                    const ymax = Number(box.bndbox.ymax);
                    if (isNaN(ymax) || ymax < 0) {
                        throw new Error(`Got invalid value for ymax: ${box.bndbox.ymax}`);
                    }
                    if (ymax < y) {
                        throw new Error('Got bounding box with negative height');
                    }

                    boxes.push({
                        x: x,
                        y: y,
                        width: xmax - x,
                        height: ymax - y,
                        label: box.name,
                    });
                }

                // Store boxes against this filename
                bboxes[jsonParsed.annotation.filename] = boxes;

                return {
                    type: 'object-detection',
                    bboxes: bboxes,
                };
            },
            schema: pascalVocSchema,
            type: 'object-detection'
        }
    }
];

const allSupportedFormats = [
    ...supportedJsonLabelFormats,
    ...supportedCsvLabelFormats,
    ...supportedTxtLabelFormats,
    ...supportedXmlLabelFormats,
].sort((a, b) => a.info.name.localeCompare(b.info.name));

const allFormatsMap = new Map<string, SupportedLabelFormat>();
allSupportedFormats.forEach(format => allFormatsMap.set(format.info.key, format));

/**
 * Get info about a dataset format type
 * @param format Dataset format; if we don't recognize it, return undefined
 * @returns Dataset format metadata, or undefined
 */
export function getMetadataForFormat(format: string | undefined): FormatMetadata | undefined {
    if (!format) return undefined;

    if (format === 'ei-bounding-boxes-format') {
        return {
            key: 'ei-bounding-boxes-format',
            type: 'object-detection',
            fileFilter: (name) => {
                return name.toLowerCase() === 'bounding_boxes.labels';
            },
            formatStyle: 'bounding_boxes.labels',
            additionalOpts: undefined,
        };
    }

    const formatMatch = allFormatsMap.get(format);

    if (formatMatch) {
        return {
            key: formatMatch.info.key,
            type: formatMatch.fn.type,
            fileFilter: (name) => {
                return name.toLowerCase().endsWith(`.${formatMatch.fn.fileType}`);
            },
            formatStyle: formatMatch.fn.fileType,
            additionalOpts: formatMatch.fn.additionalOpts,
            labelsFile: formatMatch.fn.labelsFile
        };
    }

    // Unrecognized format
    return undefined;
}

/**
 * Get info for all dataset annotation formats we can convert from
 * @returns Names and keys of all formats we support
 */
export function listAllAnnotationFormats(filter?: SupportedLabelType) {
    const eiBoundingBoxesInfo = {
        name: 'Edge Impulse object detection dataset',
        key: 'ei-bounding-boxes-format',
        type: 'object-detection',
    };

    return [
        eiBoundingBoxesInfo,
        ...allSupportedFormats.map(format => {
            return {
                name: format.info.name,
                key: format.info.key,
                type: format.fn.type,
            };
        })
    ].filter(format => !filter || format.type === filter);
}

export type FormatSubformatInfo = {
    type: 'object-detection' | 'single-label';
    key: SupportedLabelFormatNames;
}[];

export const allFormatsWithSubformats: { [key in SupportedLabelFormatStyles]: {
    name: string;
    subformats: FormatSubformatInfo;
} } = {
    'edge-impulse-format': {
        name: 'Edge Impulse object detection dataset',
        subformats: [
            {
                type: 'object-detection',
                key: 'ei-bounding-boxes-format'
            }
        ]
    },
    'coco-json': {
        name: 'COCO JSON',
        subformats: [
            {
                type: 'object-detection',
                key: 'coco'
            }
        ]
    },
    'open-images-csv': {
        name: 'Open Images CSV',
        subformats: [
            {
                type: 'object-detection',
                key: 'open-images-csv'
            }
        ]
    },
    'pascal-voc-xml': {
        name: 'Pascal VOC XML',
        subformats: [
            {
                type: 'object-detection',
                key: 'pascal-voc-xml-object-detection'
            }
        ]
    },
    'plain-csv': {
        name: 'Plain CSV',
        subformats: [
            {
                type: 'object-detection',
                key: 'plain-csv-object-detection'
            },
            {
                type: 'single-label',
                key: 'plain-csv'
            }
        ]
    },
    'remo-json': {
        name: 'Remo JSON',
        subformats: [
            {
                type: 'object-detection',
                key: 'remo-json-object-detection'
            },
            {
                type: 'single-label',
                key: 'remo-json-single-label'
            }
        ]
    },
    'yolo-txt': {
        name: 'YOLO TXT',
        subformats: [
            {
                type: 'object-detection',
                key: 'yolo-txt'
            }
        ]
    }
};

interface CocoJsonBoundingBoxFormat {
    images: {
        file_name: string;
        id: number;
        height: number;
        width: number;
    }[];
    annotations: {
        image_id: number;
        category_id: number;
        bbox: [number, number, number, number] | [number, number, number, number][];
    }[];
    categories: {
        supercategory: string;
        id: number;
        name: string;
    }[];
}

interface RemoSingleLabelFormat {
    file_name: string;
    height: number;
    width: number;
    task: 'Image classification';
    classes: string[];
}

interface RemoBoundingBoxesFormat {
    file_name: string;
    height: number;
    width: number;
    task: 'Object detection';
    annotations: {
        classes: string[];
        bbox: {
            xmin: number;
            ymin: number;
            xmax: number;
            ymax: number;
        };
    }[];
}

interface PascalVocBoundingBoxesAnnotation {
    name: string;
    bndbox: {
        xmax: string;
        xmin: string;
        ymax: string;
        ymin: string;
    };
}

interface PascalVocBoundingBoxesFormat {
    annotation: {
        filename: string;
        folder?: string;
        object: PascalVocBoundingBoxesAnnotation | PascalVocBoundingBoxesAnnotation[];
    };
}
