import { Criteria, BinaryStatus, sanitizeYesNo } from './aws-iotcore-connector';

export interface ThresholdFilterOptions {
    default_threshold: number;
    threshold_criteria: Criteria;
}

export class ThresholdFilter {
    private static readonly MIN_THRESHOLD = 0;
    private static readonly MAX_THRESHOLD = 1.0;

    private enabled: BinaryStatus;
    private confidenceThreshold: number;
    private confidenceThresholdCriteria: Criteria;

    constructor(options: ThresholdFilterOptions) {
        this.confidenceThreshold = options.default_threshold;
        this.confidenceThresholdCriteria = options.threshold_criteria;
        this.enabled = sanitizeYesNo(process.env.EI_ENABLE_THRESHOLD_LIMIT as string);
    }

    isThresholdValueInBounds(threshold: number): boolean {
        return threshold > ThresholdFilter.MIN_THRESHOLD && threshold <= ThresholdFilter.MAX_THRESHOLD;
    }

    get threshold(): number {
        return this.confidenceThreshold;
    }

    set threshold(threshold: number) {
        if (!this.isThresholdValueInBounds(threshold)) {
            throw new Error(
                `Threshold must be between ${ThresholdFilter.MIN_THRESHOLD} and ${ThresholdFilter.MAX_THRESHOLD}`
            );
        }

        this.confidenceThreshold = threshold;
    }

    get criteria(): Criteria {
        return this.confidenceThresholdCriteria;
    }

    set criteria(criteria: Criteria) {
        if (!this.isValidCriteria(criteria)) {
            console.warn(`Criteria ${criteria} is not valid.`);
        }
        this.confidenceThresholdCriteria = criteria;
    }

    enable(): void {
        this.enabled = BinaryStatus.YES;
    }

    disable(): void {
        this.enabled = BinaryStatus.NO;
    }

    meetsThresholdCriteria(threshold: number): boolean {
        switch (this.confidenceThresholdCriteria) {
            case Criteria.GREATER_THAN:
                return threshold > this.confidenceThreshold;
            case Criteria.GREATER_THAN_OR_EQUAL:
                return threshold >= this.confidenceThreshold;
            case Criteria.EQUAL:
                return threshold === this.confidenceThreshold;
            case Criteria.LESS_THAN_OR_EQUAL:
                return threshold <= this.confidenceThreshold;
            case Criteria.LESS_THAN:
                return threshold < this.confidenceThreshold;
            default:
                return false;
        }
    }

    isValidCriteria(criteria: string): boolean {
        return Object.values(Criteria).includes(criteria.toLowerCase() as Criteria);
    }

    isEnabled(): boolean {
        return this.enabled === BinaryStatus.YES;
    }

    toJSON(): {
        enabled: BinaryStatus;
        confidence_threshold: number;
        threshold_criteria: Criteria;
    } {
        return {
            enabled: this.enabled,
            confidence_threshold: this.confidenceThreshold,
            threshold_criteria: this.confidenceThresholdCriteria
        };
    }
}
