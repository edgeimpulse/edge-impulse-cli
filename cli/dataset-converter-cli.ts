import Path from 'path';
import fs from 'fs';
import Papa from 'papaparse';
import inquirer from 'inquirer';
import {
    FormatMetadata,
    SupportedLabelFormatCsv,
    SupportedLabelFormatJson,
    SupportedLabelFormatNames,
    SupportedLabelFormatXml,
    supportedCsvLabelFormats,
    supportedJsonLabelFormats,
    supportedXmlLabelFormats
} from "../shared/uploader/annotations-parsing-shared/label-file-types";
import {
    checkJsonMatchesAnyFormat,
    parseJsonLabelsFile,
    parseTxtLabelsFile
} from "../shared/uploader/annotations-parsing-shared/parse-label-json";
import { FSHelpers, FileInFolder } from './fs-helpers';
import { checkCsvMatchesAnyFormat, parseCsvLabelsFile }
    from "../shared/uploader/annotations-parsing-shared/parse-label-csv";
import { ExportBoundingBoxesFileV1, ExportInputBoundingBox, validateBoundingBoxLabelsFile }
    from '../shared/bounding-box-file-types';
import {
    Annotations,
    findCategoryMatch,
    LabelMapType,
    SampleAnnotations
} from '../shared/uploader/annotations-parsing-shared/label-files-shared';
import { DatasetConverterHelper } from '../shared/uploader/annotations-parsing-shared/dataset-converter';
import { DOMParser } from "@xmldom/xmldom";
import { checkXmlMatchesAnyFormat, parseXmlLabelsFile }
    from '../shared/uploader/annotations-parsing-shared/parse-label-xml';
import sizeOf from 'image-size';
import yaml from 'js-yaml';

type SampleMetadata = {
    filename: string;
    directory: string;
    category: 'training' | 'testing' | undefined;
};

type DatasetConverterHelperOpts = {
    silent: boolean;
    validExtensions: string[];
};

/**
 * This class implements a range of helper functions to convert dataset annotations into a format usable in EI.
 * This class works specifically in the CLI.
 */
export class DatasetConverterHelperCli extends DatasetConverterHelper {
    private _samples: SampleMetadata[] | undefined;
    private _labelMapFiles: {
        path: string;
        name: string;
    }[];
    private _opts: DatasetConverterHelperOpts;
    private _successCount: number;

    /**
     * Create a new dataset converter helper
     * @param format Dataset format
     * @param opts Additional options
     */
    constructor(format: FormatMetadata, opts: DatasetConverterHelperOpts) {
        super(format);
        this._opts = opts;
        this._successCount = 0;
        this._labelMapFiles = [];
    }

    /**
     * Convert annotations within a set of files
     * @param directory Directory to analyze
     */
    async convertDataset(files: { filename: string, path: string }[]) {
        if (!this._opts.silent) {
            console.log('\nPre-processing annotation files...\n');
        }

        this.clearAnnotations();

        this._successCount = 0;

        // Store any actual samples to be uploaded
        this._samples = [];

        // Read all files in the directory, parsing any annotation files and listing any samples
        for (const file of files) {
            this.parseFile(file.filename, file.path);
        }

        // Get additional info for more complex formats
        if (this._datasetFormat.additionalOpts) {
            this._labelmap = await this.getLabelmap();
        }

        if (!this._opts.silent) {
            console.log(`\nDone. Annotation files parsed successfully: ${this._successCount}.\n`);
        }
    }

    /**
     * Get a flattened list of all samples relevant to this dataset converter
     * @returns All relevant samples
     */
    getSamples() {
        return this._samples;
    }

    /**
     * Get the converted annotations for a sample
     * @param sample Sample to get annotations for
     * @returns Sample annotations (bounding boxes or label) if they can be found
     */
    async getAnnotationsForSample(sample: SampleMetadata): Promise<SampleAnnotations> {
        if (!this._categoryAnnotations || !this._directoryAnnotations || !this._samples) {
            throw new Error('Attempting to get sample annotations before dataset has been converted');
        }

        // Get the sample annotation
        let annotation = this.getAnnotation(sample.filename, sample.category, sample.directory);

        if (annotation && this._datasetFormat.type === 'object-detection'
            && this._datasetFormat.additionalOpts) {

            const samplePath = Path.join(sample.directory, sample.filename);
            annotation = this.transformAnnotations(<ExportInputBoundingBox[]>annotation, samplePath);
        }

        return {
            label: annotation && this._datasetFormat.type === 'single-label' ?
                {
                    type: 'label',
                    label: annotation as string,
                } : { type: 'infer' },
            boundingBoxes: annotation && this._datasetFormat.type === 'object-detection' ?
                annotation as ExportInputBoundingBox[] : undefined,
        };
    }

    /**
     * Process a single file: if this file is an annotations file, parse and store it. Otherwise, add it to the set
     * of files to be uploaded.
     * @param filename File name
     * @param path File path
     */
    private parseFile(filename: string, path: string) {
        if (!this._categoryAnnotations || !this._directoryAnnotations || !this._samples) {
            throw new Error('No annotations yet');
        }

        const filePath = Path.join(path, filename);
        try {
            if (this._datasetFormat.additionalOpts?.needsLabelmap && this._datasetFormat.labelsFile
                && this._datasetFormat.labelsFile.find(format => format.fileFilter(filename))) {
                // Store a label map file
                this._labelMapFiles.push({
                    path: filePath,
                    name: filename,
                });
            }
            else if (this._datasetFormat.fileFilter(filename)) {
                // This file is potentially a label file
                let labelFileRes: Annotations | undefined;
                const fileContents = fs.readFileSync(filePath, { encoding: 'utf-8' });

                if (this._datasetFormat.formatStyle === 'json') {
                    const jsonParseRes = parseJsonLabelsFile(fileContents, this._datasetFormat.key);
                    if (jsonParseRes.success) {
                        labelFileRes = {
                            type: jsonParseRes.type,
                            labels: jsonParseRes.labels,
                        } as Annotations;
                    }
                    else {
                        throw new Error(jsonParseRes.reason);
                    }
                }
                else if (this._datasetFormat.formatStyle === 'csv') {
                    // Parse the text (as CSV) into rows and columns
                    const csvParsed = Papa.parse(fileContents, {
                        delimitersToGuess: [',', '\t', ';'],
                    });
                    const data: string[][] = <string[][]>csvParsed.data;
                    // Check if the columns match any known schema, and parse the rows
                    const csvParseRes = parseCsvLabelsFile(data, this._datasetFormat.key);
                    if (csvParseRes.success) {
                        labelFileRes = {
                            type: csvParseRes.type,
                            labels: csvParseRes.labels,
                        } as Annotations;
                    }
                    else {
                        throw new Error(csvParseRes.reason);
                    }
                }
                else if (this._datasetFormat.formatStyle === 'txt') {
                    const txtParseRes = parseTxtLabelsFile(fileContents, filename, this._datasetFormat.key);
                    if (txtParseRes.success) {
                        labelFileRes = {
                            type: txtParseRes.type,
                            labels: txtParseRes.labels,
                        } as Annotations;
                    }
                    else {
                        throw new Error(txtParseRes.reason);
                    }
                }
                else if (this._datasetFormat.formatStyle === 'bounding_boxes.labels') {
                    // Original bounding boxes format
                    const bboxFile = JSON.parse(fileContents) as ExportBoundingBoxesFileV1;
                    labelFileRes = {
                        type: 'object-detection',
                        labels: validateBoundingBoxLabelsFile(bboxFile).boundingBoxes,
                    };
                }
                else if (this._datasetFormat.formatStyle === 'xml') {
                    // Parse the text into an XMLDocument
                    const xmlParser = new DOMParser();
                    const xmlParsed = xmlParser.parseFromString(fileContents, 'application/xml');
                    // Check if the XMLDocument matches any known schema
                    const xmlParseRes = parseXmlLabelsFile(xmlParsed, this._datasetFormat.key);
                    if (xmlParseRes.success) {
                        labelFileRes = {
                            type: xmlParseRes.type,
                            labels: xmlParseRes.labels,
                        } as Annotations;
                    }
                    else {
                        throw new Error(xmlParseRes.reason);
                    }
                }
                else {
                    throw new Error('File has unsupported file type');
                }

                // If we can, we'll associate these annotations with a category.
                // We try to derive this first from the directory path, then the file name.
                const directoryCategory = findCategoryMatch(path);
                const fileCategory = findCategoryMatch(filename);
                this.storeAnnotations(directoryCategory, fileCategory, path, labelFileRes);
                this._successCount++;
                if (!this._opts.silent) {
                    console.log(`Parsed annotations file '${filename}' successfully`);
                }
            }
            else if (this._opts.validExtensions.indexOf(Path.extname(filename.toLowerCase())) !== -1) {
                // A non-label file; work out its category and store
                const directoryCategory = findCategoryMatch(path);
                this._samples.push({
                    filename: filename,
                    directory: path,
                    category: directoryCategory
                });
            }
            else {
                // We cannot handle this file; ignore it
                throw new Error(`File is not a valid label file (expected ${this._datasetFormat.formatStyle}) ` +
                    `or valid sample file (unsupported extension)`);
            }
        }
        catch (ex) {
            if (!this._opts.silent) {
                console.log(`Skipping file '${filePath}': ${ex}`);
            }
        }
    }

    /**
     * Attempt to automatically find and parse a label map file.
     * @returns Label map
     */
    private async getLabelmap() {
        if (!this._datasetFormat.additionalOpts?.needsLabelmap || !this._datasetFormat.labelsFile) {
            return;
        }

        let labelMap: LabelMapType | undefined;

        // First try to automatically find and parse a labels file
        for (const labelsFileFormat of this._datasetFormat.labelsFile) {
            const labelFile = this._labelMapFiles.find(f => labelsFileFormat.fileFilter(f.name));
            if (!labelFile) {
                continue;
            }

            try {
                const fileContents = fs.readFileSync(labelFile.path, { encoding: 'utf8' });

                if (labelsFileFormat.fileType === 'txt') {
                    labelMap = labelsFileFormat.conversionFunction(fileContents);
                }
                else if (labelsFileFormat.fileType === 'csv') {
                    const csvParsed = Papa.parse(fileContents, {
                        delimitersToGuess: [',', '\t', ';'],
                    });
                    const data: string[][] = <string[][]>csvParsed.data;
                    labelMap = labelsFileFormat.conversionFunction(data);
                }
                else if (labelsFileFormat.fileType === 'yaml') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const yamlParsed = yaml.load(fileContents) as any;
                    labelMap = labelsFileFormat.conversionFunction(yamlParsed);
                }
                if (labelMap) {
                    console.log(`Successfully parsed label map file '${labelFile.name}'`);
                    return labelMap;
                }
            }
            catch (ex) {
                console.log(`Failed to automatically parse label map file '${labelFile.name}'`, ex);
            }
        }

        console.log('\nA label map file could not be detected.');
        console.log('This format requires a label map file, which maps keys to the label they represent.');
        console.log('You can fix these labels later by clicking "Edit labels" on the data acquisition page.\n');
        const continueRes = await inquirer.prompt({
            type: 'confirm',
            name: 'continue',
            message: 'Continue?'
        });

        if (!continueRes.continue) {
            process.exit(0);
        }
    }

    /**
     * Transform bounding boxes (e.g. when normalized)
     * @param annotations Annotations to transform
     * @param filepath File these annotations are specific to
     * @returns Transformed annotations, if relevant for this dataset format
     */
    private transformAnnotations(annotations: ExportInputBoundingBox[], filepath: string) {
        const opts = this._datasetFormat.additionalOpts;
        if (!opts) return annotations;

        let width: number | undefined;
        let height: number | undefined;

        if (opts.normalizedBoundingBoxes) {
            const dimensions = sizeOf(filepath);
            width = dimensions.width;
            height = dimensions.height;
        }

        return this.transformBoundingBoxes(annotations, width, height);
    }
}

/**
 * Get all files in a folder (including sub-folders)
 * @param folder Path to folder to read
 */
export function getAllFilesInFolder(folder: string) {
    let allFiles: FileInFolder[] = [];
    FSHelpers.readAllFiles(folder, (file) => allFiles.push(file));
    return allFiles;
}

/**
 * Given a set of files, try to find a match against a known dataset format.
 * @param files Set of files to analyze
 * @param formatsToTry List of formats to try; if not given, will try all formats
 * @returns Dataset format if a match can be found
 */
export function deriveDatasetFormat(files: FileInFolder[], formatsToTry?: SupportedLabelFormatNames[]):
    SupportedLabelFormatNames | undefined {

    // Only try to find dataset format if we've uploaded any images
    const someImageFiles = files.some(f => {
        const filename = f.filename.toLowerCase();
        return filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png');
    });
    if (!someImageFiles) {
        return undefined;
    }

    // Examine each image label file, check if it matches a known type
    const imageLabelFiles = files.filter(f => f.filename.toLowerCase().endsWith('.csv')
        || f.filename.toLowerCase().endsWith('.json')
        || f.filename.toLowerCase().endsWith('.xml')
        || f.filename.toLocaleLowerCase() === 'bounding_boxes.labels');

    // If we filter to a list of formats to try, use only those formats
    let formatsToTryJson: SupportedLabelFormatJson[] | undefined;
    let formatsToTryCsv: SupportedLabelFormatCsv[] | undefined;
    let formatsToTryXml: SupportedLabelFormatXml[] | undefined;
    let tryBboxes = true;
    if (formatsToTry) {
        formatsToTryJson = supportedJsonLabelFormats.filter(format => formatsToTry.includes(format.info.key));
        formatsToTryCsv = supportedCsvLabelFormats.filter(format => formatsToTry.includes(format.info.key));
        formatsToTryXml = supportedXmlLabelFormats.filter(format => formatsToTry.includes(format.info.key));
        tryBboxes = formatsToTry.includes('ei-bounding-boxes-format');
    }

    for (const labelFile of imageLabelFiles) {
        const filePath = Path.join(labelFile.path, labelFile.filename);
        const labelFileText = fs.readFileSync(filePath, { encoding: 'utf-8' });
        const labelFileName = labelFile.filename.toLowerCase();

        if (labelFileName.endsWith('.json')) {
            // Look for any JSON format match
            const format = checkJsonMatchesAnyFormat(labelFileText, formatsToTryJson);
            if (format) {
                return format.key;
            }
        }
        else if (labelFileName.endsWith('.csv')) {
            // Parse the text (as CSV) into rows and columns
            const csvParsed = Papa.parse(labelFileText, {
                delimitersToGuess: [',', '\t', ';'],
            });
            const data: string[][] = <string[][]>csvParsed.data;
            // Look for any CSV format match
            const format = checkCsvMatchesAnyFormat(data, formatsToTryCsv);
            if (format) {
                return format.key;
            }
        }
        else if (labelFileName.endsWith('.xml')) {
            // Parse the text into an XMLDocument
            const xmlParser = new DOMParser();
            const xmlParsed = xmlParser.parseFromString(labelFileText, 'application/xml');
            // Look for any XML format match
            const format = checkXmlMatchesAnyFormat(xmlParsed, formatsToTryXml);
            if (format) {
                return format.key;
            }
        }
        else if (labelFileName === 'bounding_boxes.labels' && tryBboxes) {
            // Original bounding boxes format
            return 'ei-bounding-boxes-format';
        }
    }

    // No match for any label file
    return undefined;
}

/**
 * Check a dataset matches a given format
 * @param files Set of files to analyze
 * @param formatName Format to check
 * @returns True if the dataset matches the format, else false
 */
export function checkDatasetMatchesFormat(files: FileInFolder[], formatName: SupportedLabelFormatNames): boolean {
    const format = deriveDatasetFormat(files, [formatName]);
    if (format && format === formatName) {
        return true;
    }
    else {
        return false;
    }
}
