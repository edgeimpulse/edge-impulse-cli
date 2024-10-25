export interface ExportInputBoundingBox {
    label: string;
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface ExportBoundingBoxesFileV1 {
    version: 1;
    type: 'bounding-box-labels';
    boundingBoxes: BoundingBoxesMap;
}

export interface BoundingBoxesMap { [fileName: string]: ExportInputBoundingBox[]; }

export function parseBoundingBoxLabels(jsonFile: string) {
    const data = <ExportBoundingBoxesFileV1>JSON.parse(jsonFile);
    return validateBoundingBoxLabelsFile(data);
}

export function validateBoundingBoxLabelsFile(data: ExportBoundingBoxesFileV1) {
    if (data.version !== 1) {
        throw new Error('Invalid version');
    }
    if (data.type !== 'bounding-box-labels') {
        throw new Error('Invalid type');
    }
    if (typeof data.boundingBoxes !== 'object') {
        throw new Error('boundingBoxes is not an object');
    }
    return data;
}

export function verifyBoundingBoxes(boundingBoxes: ExportInputBoundingBox[]) {
    if (!Array.isArray(boundingBoxes)) {
        throw new Error('boundingBoxes should be an array');
    }

    for (let b of boundingBoxes) {
        if (typeof b.label !== 'string') {
            throw new Error('label is not a string in ' + JSON.stringify(b));
        }
        if (typeof b.x !== 'number') {
            throw new Error('x is not a number in ' + JSON.stringify(b));
        }
        if (typeof b.y !== 'number') {
            throw new Error('y is not a number in ' + JSON.stringify(b));
        }
        if (typeof b.width !== 'number') {
            throw new Error('width is not a number in ' + JSON.stringify(b));
        }
        if (typeof b.height !== 'number') {
            throw new Error('height is not a number in ' + JSON.stringify(b));
        }
    }
}

export type ExportStructuredLabelsFileV1 = {
    version: 1;
    type: 'structured-labels';
    structuredLabels: StructuredLabelsMap;
};

export type ExportStructuredLabel = {
    startIndex: number;
    endIndex: number;
    label: string;
};

export type StructuredLabelsMap = { [fileName: string]: ExportStructuredLabel[]; };

export function parseStructuredLabelsFile(jsonFile: string) {
    const data = <ExportStructuredLabelsFileV1>JSON.parse(jsonFile);
    return validateStructuredLabelsFile(data);
}

export function validateStructuredLabelsFile(data: ExportStructuredLabelsFileV1) {
    if (data.version !== 1) {
        throw new Error('Invalid version');
    }
    if (data.type !== 'structured-labels') {
        throw new Error('Invalid type, expected "structured-labels" but was "' + data.type + '"');
    }
    if (typeof data.structuredLabels !== 'object') {
        throw new Error('structuredLabels is not an object');
    }

    // inner structure will be validated by ingestion

    return data;
}

export type StructuredLabelSource = 'structured_labels.labels' | 'payload.structured_labels' |
    'labels from csv file' | 'structuredLabels';

export function parseStructuredLabelsString(json: string, source: StructuredLabelSource) {
    let labels;
    try {
        labels = <ExportStructuredLabel[]>JSON.parse(json);
    }
    catch (ex) {
        throw new Error(source + ' is not valid json');
    }
    return labels;
}

export function verifyStructuredLabelsString(json: string, valuesCount: number,
                                             source: StructuredLabelSource) {
    const labels = parseStructuredLabelsString(json, source);
    return verifyStructuredLabels(labels, valuesCount, source);
}

export function verifyStructuredLabels(labels: ExportStructuredLabel[], valuesCount: number,
                                       source: StructuredLabelSource) {
    if (!Array.isArray(labels)) {
        throw new Error(`${source} is not a valid array`);
    }

    for (let ix = 0; ix < labels.length; ix++) {
        const l = labels[ix];
        if (typeof l.label !== 'string') {
            throw new Error(`${source} (index ${ix}) "label" is required and should be string. Type is ${typeof l.label}`);
        }
        if (typeof l.startIndex !== 'number') {
            throw new Error(`${source} (index ${ix}) "startIndex" is required and should be numeric`);
        }
        if (typeof l.endIndex !== 'number') {
            throw new Error(`${source} (index ${ix}) "endIndex" is required and should be numeric`);
        }
        if (l.startIndex !== Math.floor(l.startIndex)) {
            throw new Error(`${source} (index ${ix}) "startIndex" should be an integer`);
        }
        if (l.endIndex !== Math.floor(l.endIndex)) {
            throw new Error(`${source} (index ${ix}) "endIndex" should be an integer`);
        }
        if (l.startIndex < 0) {
            throw new Error(`${source} (index ${ix}) "startIndex" should be >= 0`);
        }
        if (l.startIndex > l.endIndex) {
            throw new Error(`${source} (index ${ix}) "endIndex" should be after "startIndex"`);
        }
        if (l.startIndex >= valuesCount) {
            throw new Error(`${source} (index ${ix}) "startIndex" is out of bounds, max. index is ${valuesCount - 1}`);
        }
        if (l.endIndex >= valuesCount) {
            throw new Error(`${source} (index ${ix}) "endIndex" is out of bounds, max. index is ${valuesCount - 1}`);
        }
    }

    // this validates that we have labels for every index
    let allLabels = calculateAllStructuredLabels({
        structuredLabels: labels,
        valuesCount: valuesCount,
    });

    // based on the allLabels, reconstruct the structured labels
    // into new boxes (this'll have no overlap, and will merge labels)
    let currStartIx = 0;
    let currLabel = allLabels[0];
    let ret: ExportStructuredLabel[] = [];
    for (let ix = 1; ix < valuesCount; ix++) {
        if (allLabels[ix] !== currLabel) {
            ret.push({
                startIndex: currStartIx,
                endIndex: ix - 1,
                label: currLabel,
            });
            currStartIx = ix;
        }
        currLabel = allLabels[ix];
    }
    ret.push({
        startIndex: currStartIx,
        endIndex: valuesCount - 1,
        label: currLabel,
    });

    return ret;
}

/**
 * This returns a new string array of length `sample.valuesCount`, and each
 * value of the array contains the label of the sample at that specific index.
 * If you have a sample that has structured labels you can use this to easily
 * find what the expected label was for the sample at a certain index.
 * If the sample has no structured labels it'll return undefined.
 * @param sample The sample
 * @returns A string[] with labels (or undefined if no structured labels)
 */
export function calculateAllStructuredLabels(sample: {
    structuredLabels: ExportStructuredLabel[],
    valuesCount: number,
}): string[] {
    let allStructuredLabels = <(string | undefined)[]>Array.from({ length: sample.valuesCount }).fill(undefined);
    for (let structuredLabel of sample.structuredLabels) {
        // endIx is inclusive
        for (let ix = structuredLabel.startIndex; ix <= structuredLabel.endIndex; ix++) {
            if (ix > sample.valuesCount + 1) {
                throw new Error(`structuredLabels: index ${ix} is out of bounds. ` +
                    `Max index is ${sample.valuesCount + 1}.`);
            }
            allStructuredLabels[ix] = structuredLabel.label;
        }
    }

    let undefinedIx = allStructuredLabels?.findIndex(l => typeof l === 'undefined');
    if (undefinedIx !== -1) {
        throw new Error(`structuredLabels: index ${undefinedIx} does not have a label. ` +
            `Currently we require structured labels for the complete sample, there cannot be any gaps in the labels.`);
    }

    return <string[]>allStructuredLabels;
}

export type ExportUploaderInfoFileCategory = 'training' | 'testing' | 'split';

export type ExportUploaderInfoFileMultiLabel = {
    startIndex: number,
    endIndex: number, // endIndex is _inclusive_ (so startIndex=0, endIndex=3 => 4 values)
    label: string,
};

export type ExportUploaderInfoFileLabel = { type: 'unlabeled' } |
    { type: 'label', label: string } |
    {
        type: 'multi-label',
        labels: ExportUploaderInfoFileMultiLabel[],
    };

export interface ExportUploaderInfoFile {
    path: string;
    name: string | undefined;
    category: ExportUploaderInfoFileCategory;
    label: ExportUploaderInfoFileLabel;
    metadata: { [k: string]: string } | undefined;
    boundingBoxes: ExportInputBoundingBox[] | undefined;
}

export interface ExportUploaderInfoFileV1 {
    version: 1;
    files: ExportUploaderInfoFile[];
}

export function parseUploaderInfo(jsonFile: string) {
    let data = <ExportUploaderInfoFileV1>JSON.parse(jsonFile);
    if (data.version !== 1) {
        throw new Error('Invalid version');
    }
    if (!Array.isArray(data.files)) {
        throw new Error('files is not an array');
    }
    return data;
}
