import { v4 as uuidv4 } from 'uuid';
import { AWSStatus } from './aws-iotcore-connector'; // Assuming this exists

const enum TrendDirection {
    INCREASING = 'INCREASING',
    FLAT = 'FLAT',
    DECREASING = 'DECREASING'
}

interface MetricsCollectorJSON {
    mean_confidence: number;
    standard_deviation: number;
    confidence_trend: TrendDirection;
    details: {
        n: number;
        sum_confidences: number;
        sum_confidences_squared: number;
    };
    ts: number;
    id: string;
}

/**
 * Internal utility for collecting and analyzing confidence metrics.
 * Calculates running statistics and provides trend analysis.
 */
export class MetricsCollector {
    private static readonly NUM_PLACES = 6;
    private count = 0;
    private sumConfidences = 0;
    private sumSquaredConfidences = 0;
    private meanConfidenceTrend: TrendDirection = TrendDirection.FLAT;

    // Core calculation methods
    getMeanConfidence(): number {
        return this.count > 0 ? this.sumConfidences / this.count : 0;
    }

    getStandardDeviation(): number {
        if (this.count <= 0) {
            return 0;
        }

        const mean = this.getMeanConfidence();
        return Math.sqrt(this.sumSquaredConfidences / this.count - mean * mean);
    }

    // Updating methods
    reset() {
        this.count = 0;
        this.sumConfidences = 0;
        this.sumSquaredConfidences = 0;
        this.meanConfidenceTrend = TrendDirection.FLAT;
        return { metrics_reset: AWSStatus.SUCCESS };
    }

    addConfidence(confidence: number): void {
        const prevConfidence = this.getMeanConfidence();

        // Update running sums
        this.sumConfidences += confidence;
        this.sumSquaredConfidences += confidence * confidence;
        this.count++;

        // Update trend direction
        const newConfidence = this.getMeanConfidence();
        if (newConfidence > prevConfidence) {
            this.meanConfidenceTrend = TrendDirection.INCREASING;
        }
        else if (newConfidence < prevConfidence) {
            this.meanConfidenceTrend = TrendDirection.DECREASING;
        }
        else {
            this.meanConfidenceTrend = TrendDirection.FLAT;
        }
    }

    updateConfidenceMetrics(confidences: number[]): void {
        for (const confidence of confidences) {
            this.addConfidence(confidence);
        }
    }

    // Output formatting
    toJSON(): MetricsCollectorJSON {
        return {
            mean_confidence: Number(this.getMeanConfidence().toFixed(MetricsCollector.NUM_PLACES)),
            standard_deviation: Number(this.getStandardDeviation().toFixed(MetricsCollector.NUM_PLACES)),
            confidence_trend: this.meanConfidenceTrend,
            details: {
                n: this.count,
                sum_confidences: Number(this.sumConfidences.toFixed(MetricsCollector.NUM_PLACES)),
                sum_confidences_squared: Number(this.sumSquaredConfidences.toFixed(MetricsCollector.NUM_PLACES))
            },
            ts: Date.now(),
            id: uuidv4()
        };
    }
}
