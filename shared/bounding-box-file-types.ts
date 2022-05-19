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
    boundingBoxes: { [fileName: string]: ExportInputBoundingBox[] };
}

export function parseBoundingBoxLabels(jsonFile: string) {
    let data = <ExportBoundingBoxesFile>JSON.parse(jsonFile);
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
