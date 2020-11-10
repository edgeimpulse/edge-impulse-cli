# Edge Impulse Blocks

The blocks CLI tool creates [transformation blocks](https://docs.edgeimpulse.com/docs/creating-a-transformation-block) that can be used to transform large sets of data efficiently. With the blocks CLI tool you can create new transformation blocks, and push them to Edge Impulse. Transformation blocks can be written in any language, and are based on Docker containers, but you don't need to have any Docker tooling installed - building the containers happens in Edge Impulse.

For a tutorial on transformation blocks see: [Docs: Creating a transformation block](https://docs.edgeimpulse.com/docs/creating-a-transformation-block).

You create a new transformation block by running:

```
$ edge-impulse-blocks init
? What is your user name or e-mail address (edgeimpulse.com)? jan@edgeimpulse.com
? What is your password? [hidden]
? In which organization do you want to create this block? EdgeImpulse Inc.
Attaching block to organization 'EdgeImpulse Inc.'
? Choose a type of block Transformation block
? Choose an option Create a new block
? Enter the name of your block Extract voice
? Enter the description of your block Extracts voice from video files
Creating block with config: {
  name: 'Extract voice',
  type: 'transform',
  description: 'Extracts voice from video files',
  organizationId: 4
}
? Would you like to download and load the example repository (Python)? yes
Template repository fetched!
Your new block 'Extract voice' has been created in '/Users/janjongboom/repos/custom-transform-block'.
When you have finished building your transformation block, run "edge-impulse-blocks push" to update the block in Edge Impulse.
```

When you're done developing the block you can push it to Edge Impulse via:

```
$ edge-impulse-blocks push
Archiving 'custom-transform-block'...
Archiving 'custom-transform-block' OK (2 KB)

Uploading block 'Extract voice' to organization 'EdgeImpulse Inc.'...
Uploading block 'Extract voice' to organization 'EdgeImpulse Inc.' OK

Building transformation block 'Extract voice'...
INFO[0000] Retrieving image manifest python:3.7.5-stretch
INFO[0000] Retrieving image python:3.7.5-stretch

...

Building transformation block 'Extract voice' OK

Your block has been updated, go to https://studio.edgeimpulse.com/organization/4/data to run a new transformation
```

The metadata about the block (which organization it belongs to, block ID) is saved in `.ei-block-config`, which you should commit.

## Block structure

Transformation blocks use Docker containers, a virtualization technique which lets developers package up an application with all dependencies in a single package. Thus, every block needs at least a `Dockerfile`. This is a file describing how to build the container that powers the block, and it has information about the dependencies for the block - like a list of Python packages your block needs. This `Dockerfile` needs to declare an `ENTRYPOINT`: a command that needs to run when the container starts.

An example of a Python container is:

```
FROM python:3.7.5-stretch

WORKDIR /app

# Python dependencies
COPY requirements.txt ./
RUN pip3 --no-cache-dir install -r requirements.txt

COPY . ./

ENTRYPOINT [ "python3",  "transform.py" ]
```

Which takes a base-image with Python 3.7.5, then installs all dependencies listed in `requirements.txt`, and finally starts a script called `transform.py`.

**Note:** Do not use a WORKDIR under /home! The /home path will be mounted in by Edge Impulse, making your files inaccessible.

**Note**: If you use a different programming language, make sure to use `ENTRYPOINT` to specify the application to execute, rather than `RUN` or `CMD`.

Besides your `Dockerfile` you'll also need the application files, in the example above `transform.py` and `requirements.txt`. You can place these in the same folder.

## Excluding files

When pushing a new block all files in your folder are archived and sent to Edge Impulse, where the container is built. You can exclude files by creating a file called `.ei-ignore` in the root folder of your block. You can either set absolute paths here, or use wildcards to exclude many files. For example:

```
a-large-folder/*
some-path-to-a-text-file.txt
```

### Clearing configuration

To clear the configuration, run:

```
$ edge-impulse-blocks --clean
```

This resets the CLI configuration and will prompt you to log in again.

### API Key

You can use an API key to authenticate with:

```
$ edge-impulse-blocks --api-key ei_...
```

Note that this resets the CLI configuration and automatically configures your organization.

### Other options

* `--dev` - lists development servers, use in conjunction with `--clean`.
