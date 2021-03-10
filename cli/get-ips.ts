'use strict';

import os from 'os';
const ifaces = os.networkInterfaces();

let ret: { ifname: string, address: string, mac: string }[] = [];
Object.keys(ifaces).forEach(ifname => {
    let alias = 0;

    let f = ifaces[ifname];
    if (!f) return;

    f.forEach(iface => {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            ret.push({ ifname: ifname + ':' + alias, address: iface.address, mac: iface.mac });
        } else {
            // this interface has only one ipv4 adress
            ret.push({ ifname: ifname, address: iface.address, mac: iface.mac });
        }

        alias++;
    });
});

export let ips = ret;
