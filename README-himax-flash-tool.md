# Himax flash tool

The Himax flash tool uploads new binaries to the [Himax WE-I Plus](https://docs.edgeimpulse.com/docs/himax-we-i-plus) over a serial connection.

You upload a new binary via:

```
$ himax-flash-tool -f path/to/a/firmware.img
```

This will yield a response like this:

```
[HMX] Connecting to /dev/tty.usbserial-DT04551Q...
[HMX] Connected, press the **RESET** button on your Himax WE-I now
[HMX] Restarted into bootloader. Sending file.
[HMX] Sending 2964 blocks
 ████████████████████████████████████████ 100% | ETA: 0s | 2964/2964
[HMX] Firmware update complete
[HMX] Press **RESET** to start the application

Flashed your Himax WE-I Plus development board.
To set up your development with Edge Impulse, run 'edge-impulse-daemon'
To run your impulse on your development board, run 'edge-impulse-run-impulse'
```

### Other options

* `--baud-rate <n>` - sets the baud rate of the bootloader. This should only be used during development.
* `--verbose` - enable debug logs, including all communication received from the device.
