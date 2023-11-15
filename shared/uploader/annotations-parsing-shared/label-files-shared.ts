import { BoundingBoxesMap, ExportInputBoundingBox, ExportUploaderInfoFileLabel } from "../../bounding-box-file-types";
import { LabelMapFile, SupportedLabelFormatInfo } from "./label-file-types";

export type AnnotationLookup = { [key: string]: Annotations | undefined };

export type Annotations = {
    type: 'single-label';
    labels: LabelMapFile;
} | {
    type: 'object-detection';
    labels: BoundingBoxesMap;
};

export type LabelsParseOutput = {
    success: false;
    reason: string;
} | {
    success: true;
    type: 'object-detection';
    match: SupportedLabelFormatInfo;
    labels: BoundingBoxesMap;
} | {
    success: true;
    type: 'single-label';
    match: SupportedLabelFormatInfo;
    labels: LabelMapFile;
};

export type SampleAnnotations = {
    label: { type: 'infer'} | ExportUploaderInfoFileLabel;
    boundingBoxes: ExportInputBoundingBox[] | undefined,
};

export type LabelMapType = { [ key: string ]: string };

/**
 * Try to find a category from a file name or path
 * @param name Name to examine
 * @returns Category if one can be found
 */
export function findCategoryMatch(name: string): 'training' | 'testing' | undefined {
    name = name.toLowerCase();
    if (name.includes('val') || name.includes('test')) {
        return 'testing';
    } else if (name.includes('train')) {
        return 'training';
    }
    return undefined;
}

/**
 * Remove the extension from a file
 * @param filename File name
 * @returns File name without extension
 */
export function removeExtension(filename: string) {
    if (!filename.includes('.')) return filename;
    return filename.split('.').slice(0, -1).join('.');
}