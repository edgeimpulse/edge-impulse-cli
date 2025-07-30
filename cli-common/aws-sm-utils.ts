import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const PREFIX = '\x1b[34m[AWS_SECRET_MANAGER]\x1b[0m';

interface AWSSecretsManagerOptions {
    region: string;
    silent: boolean;
    secretId: string;
    secretName: string;
}

export class AWSSecretsManagerUtils {
    private readonly client: SecretsManagerClient;
    private readonly silent: boolean;
    private readonly secretId: string;
    private readonly secretName: string;

    constructor(options: Partial<AWSSecretsManagerOptions> = {}, client?: SecretsManagerClient) {
        this.silent = options.silent ?? false;
        this.secretId = options.secretId ?? process.env.EI_AWS_SECRET_ID ?? '';
        this.secretName = options.secretName ?? process.env.EI_AWS_SECRET_NAME ?? '';

        // Allow dependency injection of the AWS client for testing/mocking
        this.client = client ?? new SecretsManagerClient({
            region: options.region ?? process.env.AWS_REGION
        });
    }

    async getSecret(): Promise<string | undefined> {
        // Don't proceed if required values are missing
        if (!this.secretId || !this.secretName) {
            this.logError(
                `ERROR - Missing required env variables EI_AWS_SECRET_ID and/or EI_AWS_SECRET_NAME`
            );
            return undefined;
        }

        try {
            const response = await this.client.send(new GetSecretValueCommand({ SecretId: this.secretId }));

            const secretString = response.SecretString;
            if (!secretString) {
                this.logError('ERROR - Secret value is empty');
                return undefined;
            }

            const secretData = JSON.parse(secretString) as Record<string, string>;
            const secretValue = secretData[this.secretName];

            if (!secretValue) {
                this.logError(`ERROR - Secret not found with name: ${this.secretName}`);
                return undefined;
            }

            this.logInfo('Secret successfully retrieved from AWS Secrets Manager');
            return secretValue;
        }
        catch (error) {
            this.logError(
                `ERROR - Unable to retrieve secret from AWS Secrets Manager: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return undefined;
        }
    }

    private logInfo(message: string): void {
        if (!this.silent) {
            console.log(PREFIX, message);
        }
    };

    private logError(message: string): void {
        console.error(PREFIX, message);
    };
}
