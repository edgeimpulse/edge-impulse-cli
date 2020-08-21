# Edge Impulse Impulse runner

The impulse runner shows the results of your impulse running on your development board. This only applies to ready-to-go binaries built from the studio.

You start the impulse via:

```
$ edge-impulse-run-impulse
```

This will sample data from your real sensors, classify the data, then print the results. E.g.:

```
edge-impulse-run-impulse
Edge Impulse impulse runner v1.7.3
[SER] Connecting to /dev/tty.usbmodem401103
[SER] Serial is connected, trying to read config...
[SER] Retrieved configuration
[SER] Device is running AT command version 1.3.0
[SER] Started inferencing...
Inferencing settings:
        Interval: 16.00 ms.
        Frame size: 375
        Sample length: 2000 ms.
        No. of classes: 4
Starting inferencing, press 'b' to break
Sampling... Storing in file name: /fs/device-classification.4
Predictions (DSP: 16 ms., Classification: 1 ms., Anomaly: 2 ms.):
    idle: 0.91016
    snake: 0.08203
    updown: 0.00391
    wave: 0.00391
    anomaly score: -0.067
Finished inferencing, raw data is stored in '/fs/device-classification.4'. Use AT+UPLOADFILE to send back to Edge Impulse.
```

### Other options

* `--debug` - run the impulse in debug mode, this will print the intermediate DSP results.
* `--continuous` - run the impulse in continuous mode (not available on all platforms).
* `--raw` - just acts as a serial passthrough, does not control the device.
