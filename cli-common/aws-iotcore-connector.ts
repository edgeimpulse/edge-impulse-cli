import { IoTDataPlaneClient, PublishCommand, GetRetainedMessageCommand } from "@aws-sdk/client-iot-data-plane";
import fs from 'fs';

const PREFIX = '\x1b[34m[AWS_IOTCORE]\x1b[0m';

// Payload typing
type ClassificationResult = { [k: string]: string | number };
type BoundingBox = {
    label: string;
    value: number;
    x: number;
    y: number;
    width: number;
    height: number;
};

type BasePayload = {
    time_ms: number;
    info?: string;
    id: string;
    ts: number;
    inference_count: number;
    total_inferences: number;
};

type DynamicPayload = {
    [key in AwsResultKey]?: AwsResult;
};

export type AwsResult = ClassificationResult | BoundingBox[];
export type AwsResultKey = 'c' | 'box' | 'grid';
export type Payload = BasePayload & DynamicPayload;

export class AWSIoTCoreConnector {

    private _notSilent : boolean;
    private _inferenceOutputTopic : string;
    private _metricsOutputTopic : string;
    private _commandInputTopic : string;
    private _commandOutputTopic : string;
    private _iot: IoTDataPlaneClient | undefined;
    private _clientConfig;
    private _iotcoreQoS: number;
    private _connected: boolean;
    private _delayCountdown: number;
    private _delayInferences: number;
    private _poolSleepTimeMS: number;
    private _opts : any | undefined;
    private _enableWriteToFile : string;
    private _writeToFileDir : string;

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
        this._inferenceOutputTopic = "";
        this._metricsOutputTopic = "";
        this._commandInputTopic = "";
        this._commandOutputTopic = "";

        this._clientConfig = { region: process.env.AWS_REGION };
        this._iot = undefined;
        this._connected = false;
        this._delayCountdown = 0;
        this._iotcoreQoS = Number((<string>process.env.EI_IOTCORE_QOS));
        this._poolSleepTimeMS = Number((<string>process.env.EI_IOTCORE_POLL_SLEEP_TIME_MS));
        this._opts = opts;

        // We can slow down the publication to IoTCore to save IoTCore message cost$.
        // set "iotcore_backoff" in Greengrass component config to "n" > 0 to enable
        // countdown backoff... "-1" to disable... (default: "10")
        this._delayInferences = Number((<string>process.env.EI_OUTPUT_BACKOFF_COUNT));

        // optional write to file configuration
        this._enableWriteToFile = (<string>process.env.EI_ENABLE_WRITE_TO_FILE);
        this._writeToFileDir = (<string>process.env.EI_FILE_WRITE_DIRECTORY);
    }

    createTopics() {
        // Inference result topic
        this._inferenceOutputTopic = (<string>process.env.EI_INFERENCE_OUTPUT_TOPIC);

        // Model metrics status topic
        this._metricsOutputTopic = (<string>process.env.EI_METRICS_OUTPUT_TOPIC);

        // Command/control topics
        this._commandInputTopic = (<string>process.env.EI_COMMAND_INPUT_TOPIC);
        this._commandOutputTopic = (<string>process.env.EI_COMMAND_OUTPUT_TOPIC);
    }

    async connect() {
        if (this._iot === undefined) {
            if (this._notSilent) {
                // not connected.. so connect to IoTCore
                console.log(PREFIX + " EI: Connecting to IoTCore...");
            }

            try {
                // create topics
                this.createTopics();

                // allocate...
                this._iot = await new IoTDataPlaneClient(this._clientConfig);

                // we are connected!
                this._connected = true;
            }
            catch(err) {
                // unable to allocate
                if (this._notSilent) {
                    // not connected.. so connect to IoTCore
                    console.log(PREFIX + " EI: ERROR - Unable to allocate IoTDataPlaneClient with exception: " + err);
                }
                this._iot = undefined;
                this._connected = false;
            }
        }
        else {
            // already connected... OK
            this._connected = true;
        }
        return this.isConnected();
    }

    isConnected(): boolean {
        return this._connected;
    }

    isEmptyInference(payload: Payload, key: AwsResultKey): boolean {
        if (payload && key in payload) {
            const value = payload[key];

            if (Array.isArray(value) && value.length > 0) {
              return false;
            }

            // Check if it's an object and not empty
            if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
              return false;
            }
          }
          return true;
    }

    async launchCommandReceiver() {
        await this.listenForCommands(this._commandInputTopic, this._poolSleepTimeMS);
    }

    async clearRetainedQueue(cmd_topic: string) {
        try {
            if (this._iot !== undefined) {
                // publish... do not proceed until this message has been cleared...
                await this._iot.send(new PublishCommand({
                                                            topic: cmd_topic,
                                                            retain: true
                                                        }));
            }
        }
        catch(err) {
            // ignore
        }
    }

    isRestartCommand(command: string): boolean {
        return (command === "restart");
    }

    processRestartCommand() {
        // announce
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.log("EI: Restarting Service: " +  this._opts.appName + "...");

        // send ourselves a single to gracefully shutdown...
        process.kill(process.pid, "SIGINT");
    }

    async listenForCommands(commandInputTopic: string, longPollSleepMS: number) {
        while (this.isConnected() === true) {
            // Long Poll via GetRetainedMessageCommand()...
            try {
                if (this._iot !== undefined) {
                    const response = await this._iot.send(
                                        new GetRetainedMessageCommand({ topic: commandInputTopic }));
                    if (response !== undefined) {
                        // Retrieve the command
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        const rcvdCmd = JSON.parse(new TextDecoder().decode(response.payload));

                        // Clear Retained Messages
                        await this.clearRetainedQueue(commandInputTopic);

                        // ensure we have a received command...
                        if (rcvdCmd !== undefined) {
                            // Process the received command
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            if (this.isRestartCommand(<string>(rcvdCmd.cmd)) === true) {
                                // process the restart command...
                                this.processRestartCommand();
                            }
                            // more commands supported here over time...

                            // default case
                            else {
                                // command not supported/understood... so ignore
                                if (this._notSilent === true) {
                                    console.log("EI: listenForCommands() Command: " + JSON.stringify(rcvdCmd) + " not supported/understood. Ignoring...");
                                }
                            }
                        }
                        else {
                            // empty/null command... just ignore
                            if (this._notSilent === true) {
                                console.log("EI: listenForCommands() Command is empty/null. Ignoring...");
                            }
                        }
                    }
                }
                else {
                    if (this._notSilent === true) {
                        // Connected but null command object
                        console.log("listenForCommands(): WARNING Status states connected() but iotcore handle is NULL!");
                    }
                }
            }
            catch (err) {
                // ignore
            }

            // Sleep
            await new Promise(resolve => setTimeout(resolve, longPollSleepMS));
        }
    }

    // FUTURE: XXX
    async sendModelMetrics(payload: object) {
        if (this._iot !== undefined && this.isConnected() === true &&
            this._metricsOutputTopic !== undefined && this._metricsOutputTopic.length > 0) {
            // publish!
            try {
                // send the publication
                await this._iot.send(new PublishCommand({
                                                        topic: this._metricsOutputTopic,
                                                        qos: this._iotcoreQoS,
                                                        retain: false,
                                                        payload: Buffer.from(JSON.stringify(payload))
                                                   }));
            }
            catch(err) {
                if (this._notSilent === true) {
                    // exception during send()...
                    console.log(PREFIX + " EI: sendModelMetrics() ERROR - IoTDataPlaneClient.send() errored with exception: " + err);
                }
            }
        }
        else if (this._iot !== undefined && this.isConnected() === true) {
            // no model metrics topic
            if (this._notSilent) {
                console.log(PREFIX + " EI: ERROR - No model metrics topic specified in configuration... not sending inference.");
            }
        }
        else {
            // not connected
            if (this._notSilent) {
                console.log(PREFIX + " EI: ERROR - Not connected to IoTCore... not sending mdoel metrics.");
            }
        }
    }

    async saveToFile(payload: Payload, imgAsJpg: Buffer)  {
        // construct the filename...
        const filenameBase = this._writeToFileDir + "/" + payload.id;
        const imageFilename = filenameBase + ".img";
        const infFilename = filenameBase + ".json";

        // INFERENCE: write out to disk...
        fs.writeFile(infFilename, JSON.stringify(payload), function(writeErr) {
            if(writeErr) {
                console.log(writeErr);
            }
        });

        // IMAGE: write out to disk...
        fs.writeFile(imageFilename, imgAsJpg, function(writeErr) {
            if(writeErr) {
                console.log(writeErr);
            }
        });
    }

    async sendInference(payload: Payload, key: AwsResultKey, imgAsJpg?: Buffer) {
        if (this._iot !== undefined && this.isConnected() === true &&
            this._inferenceOutputTopic !== undefined && this._inferenceOutputTopic.length > 0) {
            if (this.isEmptyInference(payload, key)) {
                // empty inference ... so save money and don't publish
            }
            else {
                if (this._delayInferences > 0) {
                    ++this._delayCountdown;
                    if (this._delayCountdown >= this._delayInferences) {
                        // reset:
                        this._delayCountdown = 0;

                        // publish!
                        try {
                            // send the publication
                            await this._iot.send(new PublishCommand({
                                                                topic: this._inferenceOutputTopic,
                                                                qos: this._iotcoreQoS,
                                                                payload: Buffer.from(JSON.stringify(payload))
                                                              }));

                            // write to file (optional)
                            if (this._enableWriteToFile !== undefined && this._enableWriteToFile === "yes" && imgAsJpg !== undefined) {
                                await this.saveToFile(payload, imgAsJpg);
                            }
                        }
                        catch(err) {
                            if (this._notSilent) {
                                // exception during send()...
                                console.log(PREFIX + " EI: sendInference() ERROR - IoTDataPlaneClient.send() errored with exception: " + err);
                            }
                        }
                    }
                }
                else {
                    // publish!
                    try {
                        // send the publication
                        await this._iot.send(new PublishCommand({
                                                            topic: this._inferenceOutputTopic,
                                                            qos: this._iotcoreQoS,
                                                            payload: Buffer.from(JSON.stringify(payload))
                                                          }));

                        // write to file (optional)
                        if (this._enableWriteToFile !== undefined && this._enableWriteToFile === "yes" && imgAsJpg !== undefined) {
                            await this.saveToFile(payload, imgAsJpg);
                        }
                    }
                    catch(err) {
                        if (this._notSilent) {
                            // exception during send()...
                            console.log(PREFIX + " EI: ERROR - IoTDataPlaneClient.send() errored with exception: " + err);
                        }
                    }
                }
            }
        }
        else if (this._iot !== undefined && this.isConnected() === true) {
            // no publication topic
            if (this._notSilent) {
                console.log(PREFIX + " EI: ERROR - No model inference publication topic specified in configuration... not sending inference results.");
            }
        }
        else {
            // not connected
            if (this._notSilent) {
                console.log(PREFIX + " EI: ERROR - Not connected to IoTCore... not sending inference.");
            }
        }
    }
}