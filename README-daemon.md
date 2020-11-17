# Edge Impulse Daemon

The daemon is used to onboard new devices, configure upload settings, and acts as a proxy for devices without an IP connection. To use the daemon, connect an Edge Impulse developer kit to your computer and run:

```
$ edge-impulse-daemon
```

The daemon will ask you for the server you want to connect to, prompt you to log in, and then configure the device. If your device does not have the right firmware yet, it will also prompt you to upgrade this.

This is an example of the output of the daemon:

```
Edge Impulse serial daemon v1.1.0
? What is your user name or e-mail address (edgeimpulse.com)? jan@edgeimpulse.com
? What is your password? [hidden]
Endpoints:
    Websocket: wss://remote-mgmt.edgeimpulse.com
    API:       https://studio.edgeimpulse.com
    Ingestion: https://ingestion.edgeimpulse.com

[SER] Connecting to /dev/tty.usbmodem401203
[SER] Serial is connected, trying to read config...
[SER] Retrieved configuration
? To which project do you want to add this device? accelerometer-demo-1
Configuring API key in device... OK
Configuring HMAC key in device... OK
? What name do you want to give this device? Jan's DISCO-L475VG
Setting upload host in device... OK
Configuring remote management settings... OK
? WiFi is not connected, do you want to set up a WiFi network now? Yes
Scanning WiFi networks... OK
? Select WiFi network SSID: edgeimpulse-office, Security: WPA2 (3), RSSI: -60 dBm
? Enter password for network "edgeimpulse-office" 0624710192
Connecting to "edgeimpulse-office"... OK
[SER] Device is connected over WiFi to remote management API, no need to run the daemon. Exiting...
```

> **Note:** Your credentials are never stored. When you log in these are exchanged for a token. This token is used to further authenticate requests.

### Clearing configuration

To clear the configuration, run:

```
$ edge-impulse-daemon --clean
```

This resets both the daemon configuration as well as the on-device configuration. If you still run into issues, you can connect to the device using a serial monitor (on baud rate 115,200) and run `AT+CLEARCONFIG`. This removes all configuration from the device.

### Devices without an IP connection

If your device is not connected to the remote management interface - for example because it does not have an IP connection, or because WiFi is out of range - the daemon will act as a proxy. It will register with Edge Impulse on behalf of the device, and proxy events through over serial. For this to work your device needs to support the Edge Impulse AT command set, please refer to the documentation for more information.

### Silent mode

To skip any wizards (except for the login prompt) you can run the daemon in silent mode via:

```
$ edge-impulse-daemon --silent
```

This is useful in environments where there is no internet connection, as the daemon won't prompt to connect to WiFi.

### Overriding the baud rate

To override the baud rate, use:

```
$ edge-impulse-daemon --baud-rate 460800
```

You'll also need to update the firmware on your device to communicate at this frequency.
