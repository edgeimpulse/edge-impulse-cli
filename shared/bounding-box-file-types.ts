export interface ExportInputBoundingBox {
    label: string;
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface ExportBoundingBoxesFile {
    version: 1;
    type: 'bounding-box-labels';
    boundingBoxes: BoundingBoxesMap;
}

export interface BoundingBoxesMap { [fileName: string]: ExportInputBoundingBox[]; }

export function parseBoundingBoxLabels(jsonFile: string) {
    const data = <ExportBoundingBoxesFile>JSON.parse(jsonFile);
    return validateBoundingBoxLabels(data);
}

export function validateBoundingBoxLabels(data: ExportBoundingBoxesFile) {
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

export type ExportUploaderInfoFileCategory = 'training' | 'testing' | 'split';

export interface ExportUploaderInfoFile {
    path: string;
    category: ExportUploaderInfoFileCategory;
    label: { type: 'unlabeled' } | { type: 'label', label: string };
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
