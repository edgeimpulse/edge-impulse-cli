# Edge Impulse Uploader

The uploader signs local files and uploads them to the [ingestion service](https://docs.edgeimpulse.com/reference/data-ingestion/new-ingestion-api). This is useful to upload existing data sets, or to migrate data between Edge Impulse instances. The uploader currently handles these type of files:

1. `.cbor` - Files in the Edge Impulse Data Acquisition format. The uploader will not resign these files, only upload them.
2. `.json` - Files in the Edge Impulse Data Acquisition format. The uploader will not resign these files, only upload them.
3. `.wav` - Lossless audio files. It's recommended to use the same frequency for all files in your data set, as signal processing output might be dependent on the frequency.
4. `.jpg` - Image files. It's recommended to use the same ratio for all files in your data set.

You upload files via:

```
$ edge-impulse-uploader path/to/a/file.wav
```

You can upload multiple files in one go via:

```
$ edge-impulse-uploader path/to/many/*.wav
```

The first time you'll be prompted for a server, and your login credentials (see [Edge Impulse Daemon](https://docs.edgeimpulse.com/docs/cli-daemon) for more information).

### Category

Files are automatically uploaded to the `training` category, but you can override the category with the `--category` option. E.g.:

```
$ edge-impulse-uploader --category testing path/to/a/file.wav
```

Or set the category to `split` to automatically split data between training and testing sets. This is based on the hash of the file, so this is a deterministic process.

### Labeling

A label is automatically inferred from the file name, see the [Ingestion service documentation](https://docs.edgeimpulse.com/reference/data-ingestion/new-ingestion-api). You can override this with the `--label` option. E.g.:

```
$ edge-impulse-uploader --label noise path/to/a/file.wav
```

### Uploading datasets

You can upload a directory (containing `training` and `testing` data) with the `--directory` option. E.g.:

```
$ edge-impulse-uploader --directory path/to/a/directory
```

We support uploading image datasets in a range of different formats. If your data directory contains labels in one of these supported formats, we'll try to automatically detect the format of this directory and convert it to a format supported by the Studio on upload. You can also manually specify the format of your dataset with the `--dataset-format` option. E.g.:

```
$ edge-impulse-uploader --directory path/to/a/directory --dataset-format yolov5
```

### Clearing configuration

To clear the configuration, run:

```
$ edge-impulse-uploader --clean
```

This resets the uploader configuration and will prompt you to log in again.

### API Key

You can use an API key to authenticate with:

```
$ edge-impulse-uploader --api-key ei_...
```

Note that this resets the uploader configuration and automatically configures the uploader's account and project.

### Upload data from OpenMV datasets

The uploader data in the OpenMV dataset format. Pass in the option `--format-openmv` and pass the folder of your dataset in to automatically upload data. Data is automatically split between testing and training sets. E.g.:

```
$ edge-impulse-uploader --format-openmv path/to/your-openmv-dataset
```

### Other options

* `--silent` - omits information on startup. Still prints progress information.
* `--dev` - lists development servers, use in conjunction with `--clean`.
* `--hmac-key <key>` - set the HMAC key, only used for files that need to be signed such as `wav` files.
* `--concurrency <count>` - number of files to uploaded in parallel (default: 20).
* `--progress-start-ix <index>` - when set, the progress index will start at this number. Useful to split up large uploads in multiple commands while the user still sees this as one command.
* `--progress-end-ix <index>` - when set, the progress index will end at this number. Useful to split up large uploads in multiple commands while the user still sees this as one command.
* `--progress-interval <interval>` - when set, the uploader will not print an update for every line, but every `interval` period (in ms.).
* `--allow-duplicates` - to avoid pollution of your dataset with duplicates, the hash of a file is checked before uploading against known files in your dataset. Enable this flag to skip this check.
