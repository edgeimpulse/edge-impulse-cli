# Edge Impulse CLI tools

Command-line interface tools for [Edge Impulse](https://www.edgeimpulse.com). We make things smarter by enabling developers to create the next generation of intelligent device solutions with embedded Machine Learning.

This package consists of four tools (click to see their respective documentation):

* [edge-impulse-daemon](https://docs.edgeimpulse.com/docs/cli-daemon) - configures devices over serial, and acts as a proxy for devices that do not have an IP connection.
* [edge-impulse-uploader](https://docs.edgeimpulse.com/docs/cli-uploader) - allows uploading and signing local files.
* [edge-impulse-data-forwarder](https://docs.edgeimpulse.com/docs/cli-data-forwarder) - a very easy way to collect data from any device over a serial connection, and forward the data to Edge Impulse.
* [edge-impulse-run-impulse](https://docs.edgeimpulse.com/docs/cli-run-impulse) - show the impulse running on your device.
* [edge-impulse-blocks](https://docs.edgeimpulse.com/docs/cli-blocks) - create organizational transformation blocks.
* [eta-flash-tool](https://docs.edgeimpulse.com/docs/cli-eta-flash-tool) - to flash the Eta Compute ECM3532 AI Sensor.
* [himax-flash-tool](https://docs.edgeimpulse.com/docs/cli-himax-flash-tool) - to flash the Himax WE-I Plus development board.

## Installation

1. Install [Node.js](https://nodejs.org/en/) v12 or higher on your host computer.
2. Install the CLI tools via:

    ```
    $ npm install -g edge-impulse-cli
    ```

Afterwards you should have the tools available in your PATH.

## Building from source

If you're making changes to the CLI you can build from source.

1. Clone this repository:

    ```
    $ git clone https://github.com/edgeimpulse/edge-impulse-cli
    ```

1. Install the dependencies:

    ```
    $ npm install
    ```

1. Build and link the application:

    ```
    $ npm run build
    $ npm link
    ```

## Debugging the serial daemon

If you're adding support for a new development board, and you want to debug how the serial daemon implements [serial protocol](https://docs.edgeimpulse.com/reference#remote-mgmt-serial-protocol) or what raw data the data forwarder sees, you can enable logging.

* For the data forwarder, uncomment: [1](https://github.com/edgeimpulse/edgeimpulse/blob/d4168023478e7ad6b3808687e7a9c02961ec4be9/serial-daemon/cli/data-forwarder.ts#L113).
* For the serial daemon, uncomment these lines [1](https://github.com/edgeimpulse/edgeimpulse/blob/d4168023478e7ad6b3808687e7a9c02961ec4be9/studio/shared/daemon/ei-serial-protocol.ts#L768), [2](https://github.com/edgeimpulse/edgeimpulse/blob/d4168023478e7ad6b3808687e7a9c02961ec4be9/studio/shared/daemon/ei-serial-protocol.ts#L786).

Then build from source.

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
