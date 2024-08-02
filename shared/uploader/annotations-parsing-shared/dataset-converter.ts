import { ExportInputBoundingBox } from "../../bounding-box-file-types";
import { FormatMetadata } from "./label-file-types";
import { AnnotationLookup, Annotations, LabelMapType, removeExtension } from "./label-files-shared";

type Category = 'training' | 'testing' | undefined;

/**
 * DatasetConverterHelpers allow for converting various dataset annotation formats to a format usable in EI.
 * We use DatasetConverterHelpers in different contexts (CLI and web); this class implements common base
 * functionality which context-specific helpers should extend.
 */
export abstract class DatasetConverterHelper {
    protected _datasetFormat: FormatMetadata;
    protected _categoryAnnotations: AnnotationLookup | undefined;
    protected _directoryAnnotations: AnnotationLookup | undefined;
    protected _globalAnnotations: Annotations | undefined;
    protected _labelmap: LabelMapType | undefined;

    constructor(format: FormatMetadata) {
        this._datasetFormat = format;
    }

    /**
     * Clear all stored annotations
     */
    protected clearAnnotations() {
        // Store any annotations that match a category
        this._categoryAnnotations = {
            training: undefined,
            testing: undefined
        };

        // Store any annotations exclusive to a directory
        this._directoryAnnotations = { };

        // Store annotations not associated with a category in a global scope
        this._globalAnnotations = {
            type: this._datasetFormat.type,
            labels: { }
        };
    }

    /**
     * Store new annotations
     * @param directoryCategory Category of the directory the source annotation file belongs to
     * @param fileCategory Derived category of the source annotation file itself
     * @param dirPath Path of the directory the source annotation file belongs to
     * @param annotations Annotations to store
     */
    protected storeAnnotations(directoryCategory: Category, fileCategory: Category, dirPath: string,
        annotations: Annotations) {

        if (!this._categoryAnnotations || !this._directoryAnnotations || !this._globalAnnotations) {
            throw new Error('No annotations yet');
        }

        // If we can, we'll associate these annotations with a category.
        // We try to derive this first from the directory path, then the file name.
        let annotationsKey: 'training' | 'testing' | undefined;
        if (directoryCategory) {
            annotationsKey = directoryCategory;
        }
        else if (fileCategory) {
            annotationsKey = fileCategory;
        }

        if (annotationsKey) {
            // Store these annotations against a global scope for a particular category
            this._categoryAnnotations[annotationsKey] =
                this.mergeAnnotations(this._categoryAnnotations[annotationsKey], annotations);
        }
        else {
            // Store these annotations against the current directory
            this._directoryAnnotations[dirPath] =
                this.mergeAnnotations(this._directoryAnnotations[dirPath], annotations);
            this._globalAnnotations = this.mergeAnnotations(this._globalAnnotations, annotations);
        }
    }

    /**
     * Get annotations for a sample (pre-transformation)
     * @param sampleFilename Sample file name
     * @param category Sample category
     * @param directory Sample directory path
     * @returns Sample annotations (label string or bounding boxes), if they exist
     */
    protected getAnnotation(sampleFilename: string, category: Category, directory: string) {
        if (!this._categoryAnnotations || !this._directoryAnnotations || !this._globalAnnotations) {
            throw new Error('Attempting to get sample annotations before dataset has been converted');
        }

        const filename = this._datasetFormat.additionalOpts?.lookupNoExtension ? removeExtension(sampleFilename)
            : sampleFilename;

        // Try to find an annotation for this sample...
        let annotation: string | ExportInputBoundingBox[] | undefined;

        // First, look at annotations associated with the sample category
        if (category && this._categoryAnnotations[category]) {
            annotation = this._categoryAnnotations[category]?.labels[filename];
        }
        // Next, look for annotations we found in the current directory
        if (!annotation && this._directoryAnnotations[directory]) {
            annotation = this._directoryAnnotations[directory]?.labels[filename];
        }
        // Finally, try to find any matching annotation
        if (!annotation && this._globalAnnotations) {
            annotation = this._globalAnnotations.labels[filename];
        }

        // Use a label map to correct the label, if relevant
        if (this._datasetFormat.additionalOpts?.needsLabelmap && annotation) {
            if (!this._labelmap) {
                // Just use the original label...
            }
            else if (this._datasetFormat.type === 'single-label') {
                const newAnnotation = this._labelmap[annotation as string];
                if (newAnnotation) {
                    annotation = newAnnotation;
                }
            }
            else if (this._datasetFormat.type === 'object-detection') {
                let newAnnotations: ExportInputBoundingBox[] = [];
                for (const box of annotation as ExportInputBoundingBox[]) {
                    const newBoxLabel = this._labelmap[box.label];
                    newAnnotations.push({
                        label: newBoxLabel ? newBoxLabel : box.label,
                        x: box.x,
                        y: box.y,
                        width: box.width,
                        height: box.height
                    });
                }
                annotation = newAnnotations;
            }
        }

        return annotation;
    }

    /**
     * Apply transformations to bounding boxes
     * @param annotations Set of bounding boxes
     * @param width Image file width, if relevant
     * @param height Image file height, if relevant
     * @returns Transformed bounding boxes
     */
    protected transformBoundingBoxes(annotations: ExportInputBoundingBox[], width?: number, height?: number) {
        const opts = this._datasetFormat.additionalOpts;
        if (!opts) return annotations;

        if (opts.normalizedBoundingBoxes) {
            annotations = annotations.map(box => {
                // Check the box is normalized first
                if (box.height > 1 && box.width > 1 && box.x > 1 && box.y > 1) {
                    return box;
                }

                return {
                    label: box.label,
                    width: Math.round(box.width * (width || 1)),
                    height: Math.round(box.height * (height || 1)),
                    x: Math.round(box.x * (width || 1)),
                    y: Math.round(box.y * (height || 1))
                };
            });
        }

        if (opts.centeredBoundingBoxes) {
            annotations = annotations.map(box => {
                return {
                    label: box.label,
                    width: box.width,
                    height: box.height,
                    x: Math.round(box.x - (box.width / 2)),
                    y: Math.round(box.y - (box.height / 2))
                };
            });
        }

        return annotations;
    }

    /**
     * Helper function to merge sets of sample labels
     * @param oldAnnotations Existing sample labels; they take priority
     * @param newAnnotations New example labels
     * @returns New, merged annotations
     */
    private mergeAnnotations(oldAnnotations: Annotations | undefined, newAnnotations: Annotations | undefined) {
        if (!oldAnnotations) return newAnnotations;
        if (!newAnnotations) return oldAnnotations;
        if (oldAnnotations.type !== newAnnotations.type) {
            throw new Error('Annotation types do not match');
        }

        const annotations = {
            type: oldAnnotations.type,
            labels: Object.assign(
                oldAnnotations.labels,
                newAnnotations.labels,
            )
        } as Annotations;

        return annotations;
    }
}
