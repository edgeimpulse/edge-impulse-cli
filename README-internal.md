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
