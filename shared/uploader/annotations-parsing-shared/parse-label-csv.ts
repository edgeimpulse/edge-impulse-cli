import { supportedCsvLabelFormats, SupportedLabelFormatCsv, SupportedLabelFormatInfo, SupportedLabelFormatNames } from "./label-file-types";
import { LabelsParseOutput } from "./label-files-shared";

type CsvColumnMap = { column: string, ix: number }[];

/**
 * Check if a given CSV file matches any known schema from a list of supported types
 * @param csvFile CSV file to analyze
 * @param formatsToTry List of formats to try; if not given, will try all formats
 * @returns Format info if a match is found
 */
export function checkCsvMatchesAnyFormat(csvFile: string[][], formatsToTry?: SupportedLabelFormatCsv[]):
    SupportedLabelFormatInfo | undefined {

    if (csvFile.length === 0) {
        return undefined;
    }

    const allFormats = formatsToTry ? formatsToTry : supportedCsvLabelFormats;

    // We check that our CSV has at least the columns required for these formats.
    // So we should match the most specific first.
    const csvFormatsSorted = allFormats.sort((a, b) => b.fn.schema.length - a.fn.schema.length);

    const headerRow = csvFile[0];

    for (const format of csvFormatsSorted) {
        const colMap = parseCsvHeader(headerRow, format.fn.schema);
        if (colMap) {
            return format.info;
        }
    }
}

/**
 * Parse a CSV labels file, converting it to a format usable in EI
 * @param csvFile CSV file to convert
 * @param format Format to convert from
 * @returns Labels or bounding boxes from the CSV file
 */
export function parseCsvLabelsFile(csvFile: string[][], format: SupportedLabelFormatNames): LabelsParseOutput {
    if (csvFile.length === 0) {
        throw new Error('Failed to parse CSV file');
    }

    const csvFormat = supportedCsvLabelFormats.find(f => f.info.key === format);
    if (!csvFormat) {
        return {
            success: false,
            reason: `No CSV format matches type '${format}'`
        };
    }

    try {
        // Convert to TypedCsv; also validates instance against schema
        const csv = new TypedCsv(csvFile, csvFormat.fn.schema);

        // Convert to bounding boxes
        const res = csvFormat.fn.conversionFunction(csv);

        if (res.type === 'object-detection') {
            return {
                success: true,
                match: csvFormat.info,
                type: 'object-detection',
                labels: res.bboxes,
            };
        } else {
            return {
                success: true,
                match: csvFormat.info,
                type: 'single-label',
                labels: res.labels,
            };
        }
    } catch (ex) {
        return {
            success: false,
            reason: `Error parsing type '${csvFormat.info.name}'; ${(<Error>ex).message}`
        };
    }
}

/**
 * Parse a CSV header row, mapping column headings to their index.
 * If the header row does not contain all headings, this returns undefined.
 * @param headerRow First row of a CSV file
 * @param schema Column headings to match
 * @returns Mapping between headings and column indices
 */
function parseCsvHeader(headerRow: string[], schema: string[]) {
    if (headerRow.length < schema.length) {
        return undefined;
    }

    let colMap: CsvColumnMap = [];

    for (const col of schema) {
        const ix = headerRow.indexOf(col);
        if (ix === -1) {
            return undefined;
        }
        colMap.push({
            column: col,
            ix: ix
        });
    }
    return colMap;
}

/**
 * This class converts rows from a CSV file (as string arrays) to objects, allowing for getting properties from a row
 * without needing to understand how the row is actually structured.
 */
export class TypedCsv<T extends readonly string[]> implements Iterable<{ [ k in T[number] ]: string }> {
    private _rows: string[][];
    private _colMap: CsvColumnMap;

    /**
     * Create a new TypedCsv
     * @param csvFile CSV file rows
     * @param schema CSV column headings
     */
    constructor(csvFile: string[][], schema: T) {
        // First check this CSV file is valid
        if (csvFile.length === 0) {
            throw new Error('CSV file is empty');
        }
        const colMap = parseCsvHeader(csvFile[0], Array.from(schema));
        if (!colMap) {
            throw new Error('CSV file does not match schema');
        }
        this._rows = csvFile.slice(1);
        this._colMap = colMap;
    }

    /**
     * Get an iterator for the rows of the CSV file
     * @returns CSV rows iterator
     */
    [Symbol.iterator](): TypedCsvIterator<T> {
        return new TypedCsvIterator<T>(this._rows, this._colMap);
    }
}

class TypedCsvIterator<T extends readonly string[]>
    implements Iterator<{ [ k in T[number] ]: string }> {

    private _index: number;
    private _done: boolean;
    private _rows: string[][];
    private _colMap: CsvColumnMap;

    constructor(rows: string[][], colMap: CsvColumnMap) {
        this._rows = rows;
        this._colMap = colMap;
        this._index = 0;
        this._done = false;
    }

    next(): IteratorResult<{ [ k in T[number] ]: string }> {
        if (this._done) {
            return {
                done: true,
                value: undefined
            };
        }

        if (this._index === this._rows.length) {
            this._done = true;
            return {
                done: true,
                value: this._index
            };
        }

        const row = this._rows[this._index];
        this._index += 1;
        const minimumRowLength = Object.values(this._colMap).length;
        if (row.length < minimumRowLength) {
            return this.next();
        }

        let rowMapped: { [ key: string ]: string } = { };
        for (const col of Object.values(this._colMap)) {
            rowMapped[col.column] = row[col.ix];
        }
        return {
            done: false,
            value: rowMapped as { [ k in T[number] ]: string }
        };
    }
}