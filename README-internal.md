# Serial daemon (internal only)

## How to run locally

Build this application via:

```
$ npm install
$ ./node_modules/.bin/tsc -p .
$ npm link
```

## Updating SDKs

```
sh build-sdk.sh
```

## Publishing to npm

Remember to bump the app version in the `package.json` (or use `npm version <type>`) before . After that, run `npm install` and commit changes in `package.json` and `package-lock.json`.
The publishing to the [NPM registry](https://npmjs.com/) is automated and done on every release (see `publish-node-serial-daemon` step in CI/CD).

If you have enough permissions, you can publish from local build:

```
rm -rf build
$ ./node_modules/.bin/tsc -p .
$ npm publish
```

You can use `npm pack` to see what would go in a package.

## Developer mode

To connect to non-production instances of Edge Impulse, use the `--dev` flag. This will prompt you to select a server.

### Setting a custom host

You can override the studio host via the `EI_HOST` environmental variable. E.g. on Windows from a VM:

```
$ set EI_HOST=192.168.187.1
$ edge-impulse-daemon
```

You need to run the application in developer mode for this to function.

## AT Commands versioning

`daemon` requires a specific version of the AT commands in the device to run. There is a core set of commands (in the `required` section in `firmware-sdk/at-server/ei_at_command_set.h`). If you change any of these commands, make sure to bump the major or minor version in the `AT_COMMAND_VERSION` define AND update the `connectLogic` in `daemon.ts` and `run-impulse.ts`.
The same work in the other diretion. If you have added any new functions to `daemon` or `run-impulse` that REQUIRES specific AT command in all devices, then add this command and bump the AT command version.
