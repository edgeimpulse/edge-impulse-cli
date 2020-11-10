# Edge Impulse CLI tools

Command-line interface tools for [Edge Impulse](https://www.edgeimpulse.com). We make things smarter by enabling developers to create the next generation of intelligent device solutions with embedded Machine Learning.

This package consists of four tools (click to see their respective documentation):

* [edge-impulse-daemon](https://docs.edgeimpulse.com/docs/cli-daemon) - configures devices over serial, and acts as a proxy for devices that do not have an IP connection.
* [edge-impulse-uploader](https://docs.edgeimpulse.com/docs/cli-uploader) - allows uploading and signing local files.
* [edge-impulse-data-forwarder](https://docs.edgeimpulse.com/docs/cli-data-forwarder) - a very easy way to collect data from any device over a serial connection, and forward the data to Edge Impulse.
* [edge-impulse-run-impulse](https://docs.edgeimpulse.com/docs/cli-run-impulse) - show the impulse running on your device.
* [edge-impulse-blocks](https://docs.edgeimpulse.com/docs/cli-blocks) - create organizational transformation blocks.
* [eta-flash-tool](https://docs.edgeimpulse.com/docs/cli-eta-flash-tool) - to flash the Eta Compute ECM3532 AI Sensor.

## Installation

1. Install [Node.js](https://nodejs.org/en/) v12 or higher on your host computer.
2. Install the CLI tools via:

    ```
    $ npm install -g edge-impulse-cli
    ```

Afterwards you should have the tools available in your PATH.

## Troubleshooting

### Tools version "2.0" is unrecognized (Windows)

If you receive the following error: `The tools version "2.0" is unrecognized. Available tools versions are "4.0"`, launch a new command window as administrator and run:

```
$ npm install --global --production windows-build-tools
$ npm config set msvs_version 2015 --global
```

### EACCES: permission denied, access '/usr/local/lib/node_modules' (macOS)

This is indication that the `node_modules` is not owned by you, but rather by root. This is probably not what you want. To fix this, run:

```
$ sudo chown -R $USER /usr/local/lib/node_modules
```
