'use strict';

import os from 'os';
const ifaces = os.networkInterfaces();

let ret: { ifname: string, address: string }[] = [];
Object.keys(ifaces).forEach(ifname => {
    let alias = 0;

    ifaces[ifname].forEach(iface => {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            return;
        }

        if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            ret.push({ ifname: ifname + ':' + alias, address: iface.address });
        } else {
            // this interface has only one ipv4 adress
            ret.push({ ifname: ifname, address: iface.address });
        }

        alias++;
    });
});

export let ips = ret;
