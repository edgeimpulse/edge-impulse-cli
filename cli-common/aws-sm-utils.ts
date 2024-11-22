import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const PREFIX = '\x1b[34m[AWS_SECRET_MANAGER]\x1b[0m';

export class AWSSecretsManagerUtils {

    private _smInput;
    private _smName;
    private _notSilent: boolean;
    private _client: SecretsManagerClient;
    private _clientConfig;

    constructor(opts: {
        appName: string,
        silentArgv: boolean,
        cleanArgv: boolean,
        apiKeyArgv: string | undefined,
        greengrassArgv: boolean,
        devArgv: boolean,
        hmacKeyArgv: string | undefined,
        connectProjectMsg: string,
    }) {
        this._notSilent = (!opts.silentArgv);
        this._smInput = { SecretId: process.env.EI_AWS_SECRET_ID };
        this._clientConfig = { region: process.env.AWS_REGION };
        this._smName = process.env.EI_AWS_SECRET_NAME;
        this._client = new SecretsManagerClient(this._clientConfig);
    }

    async getEdgeImpulseAPIKeyFromSecretsManager() {
        const command = new GetSecretValueCommand(this._smInput);
        let name = this._smName;
        if (name === undefined) {
            name = "";
        }
        try {
            const response = await this._client.send(command);
            if (response !== undefined && response.SecretString !== undefined && name.length > 0 &&
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                JSON.parse(response.SecretString)[name] !== undefined) {
                // return the API Key
                if (this._notSilent) {
                    // runtime: show status only...
                    console.log(PREFIX + " EI: API Key FOUND within AWS Secrets Manager. Continuing...");
                }

                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                return JSON.parse(response.SecretString)[name];
            }
            else {
                if (this._notSilent) {
                    // Unable to find the API Key... invalid SecretId more than likely...
                    console.log(PREFIX +
                        " EI: ERROR - Unable to retrieve API Key from AWS Secrets Manager with greengrass option selected. Check ID in configuration: NAME: " +
                        name + " ID: " + process.env.EI_AWS_SECRET_ID);
                }
            }
        }
        catch(err) {
            if (this._notSilent) {
                console.log(PREFIX + " EI: ERROR - Unable to retrieve API Key from AWS Secrets Manager with greengrass option selected. Caught Exception: " +
                            err + " NAME: " + name + " ID: " + process.env.EI_AWS_SECRET_ID);
            }
        }
        return undefined;
    }
}