# Eta Compute flash tool

The Eta Compute flash tool uploads new binaries to the [Eta Compute ECM3532 AI Sensor](https://docs.edgeimpulse.com/docs/eta-compute-ecm3532-ai-sensor) over a serial connection. The AI Sensor needs to run a bootloader (comes on the device by default) in order for this to work.

You upload a new binary via:

```
$ eta-flash-tool -f path/to/a/firmware.bin
```

This will yield a response like this:

```
[ETA] Connecting to /dev/tty.usbserial-AB0JQE62...
[ETA] Connected, restarting into bootloader...
[ETA] Restarting into bootloader OK
[ETA] Restarted into bootloader. Device is running version 1.0.2
[ETA] Firmware is 416336 bytes (102 blocks)
 ████████████████████████████████████████ 100% | ETA: 0s | 102/102
[ETA] Finalizing update...
[ETA] Update complete, rebooting into application
[ETA] Update completed
```

### Other options

* `--baud-rate <n>` - sets the baud rate of the bootloader. This should only be used during development.
* `--serial-write-pacing` - enables write pacing on the serial bus. Useful for debugging.
* `--verbose` - enable debug logs, including all communication received from the device.
