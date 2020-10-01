# Edge Impulse Data Forwarder

The data forwarder is used to easily relay data from any device to Edge Impulse over serial. Devices write sensor values over a serial connection, and the data forwarder collects the data, signs the data and sends the data to the ingestion service. The data forwarder is useful to quickly enable data collection from a wide variety of development boards without having to port the full [remote management protocol](https://docs.edgeimpulse.com/reference#remote-management) and [serial protocol](https://docs.edgeimpulse.com/reference#remote-mgmt-serial-protocol), but only supports collecting data at relatively low frequencies.

To use the data forwarder, load an application (examples for Arduino and Mbed OS below) on your development board, and run:

```
$ edge-impulse-data-forwarder
```

The data forwarder will ask you for the server you want to connect to, prompt you to log in, and then configure the device.

This is an example of the output of the forwarder:

```
Edge Impulse data forwarder v1.5.0
? What is your user name or e-mail address (edgeimpulse.com)? jan@edgeimpulse.com
? What is your password? [hidden]
Endpoints:
    Websocket: wss://remote-mgmt.edgeimpulse.com
    API:       https://studio.edgeimpulse.com
    Ingestion: https://ingestion.edgeimpulse.com

[SER] Connecting to /dev/tty.usbmodem401203
[SER] Serial is connected
[WS ] Connecting to wss://remote-mgmt.edgeimpulse.com
[WS ] Connected to wss://remote-mgmt.edgeimpulse.com
? To which project do you want to add this device? accelerometer-demo-1
? 3 sensor axes detected. What do you want to call them? Separate the names with ',': accX, accY, accZ
? What name do you want to give this device? Jan's DISCO-L475VG
[WS ] Authenticated
```

> **Note:** Your credentials are never stored. When you log in these are exchanged for a token. This token is used to further authenticate requests.

### Clearing configuration

To clear the configuration, run:

```
$ edge-impulse-data-forwarder --clean
```

### Overriding the frequency

To override the frequency, use:

```
$ edge-impulse-data-forwarder --frequency 100
```

## Protocol

The protocol is very simple. The device should send data on baud rate 115,200 with one line per reading, and individual sensor data should be split with either a `,` or a `TAB`. For example, this is data from a 3-axis accelerometer:

```
-0.12,-6.20,7.90
-0.13,-6.19,7.91
-0.14,-6.20,7.92
-0.13,-6.20,7.90
-0.14,-6.20,7.91
```

The data forwarder will automatically determine the sampling rate and the number of sensors based on the output. If you load a new application where the sampling frequency or the number of axes changes, the data forwarder will automatically be reconfigured.

## Example (Arduino)

This is an example of a sketch that reads data from an accelerometer (tested on the Arduino Nano 33 BLE):

```
#include <Arduino_LSM9DS1.h>

#define CONVERT_G_TO_MS2    9.80665f
#define FREQUENCY_HZ        50
#define INTERVAL_MS         (1000 / (FREQUENCY_HZ + 1))

void setup() {
    Serial.begin(115200);
    Serial.println("Started");

    if (!IMU.begin()) {
        Serial.println("Failed to initialize IMU!");
        while (1);
    }
}

void loop() {
    static unsigned long last_interval_ms = 0;
    float x, y, z;

    if (millis() > last_interval_ms + INTERVAL_MS) {
        last_interval_ms = millis();

        IMU.readAcceleration(x, y, z);

        Serial.print(x * CONVERT_G_TO_MS2);
        Serial.print('\t');
        Serial.print(y * CONVERT_G_TO_MS2);
        Serial.print('\t');
        Serial.println(z * CONVERT_G_TO_MS2);
    }
}
```

## Example (Mbed OS)

This is an example of an Mbed OS application that reads data from an accelerometer (tested on the ST IoT Discovery Kit):

```
#include "mbed.h"
#include "stm32l475e_iot01_accelero.h"

int main()
{
    Serial pc(USBTX, USBRX, 115200);
    int16_t pDataXYZ[3] = {0};

    BSP_ACCELERO_Init();

    while(1) {
        BSP_ACCELERO_AccGetXYZ(pDataXYZ);
        pc.printf("%d\t%d\t%d\n", pDataXYZ[0], pDataXYZ[1], pDataXYZ[2]);

        ThisThread::sleep_for(1);
    }
}
```

There's also a complete example that samples data from both the accelerometer and the gyroscope here: [edgeimpulse/example-dataforwarder-mbed](https://github.com/edgeimpulse/example-dataforwarder-mbed).
