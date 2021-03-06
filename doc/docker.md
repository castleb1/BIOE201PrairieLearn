
# Docker

## Building the container

In the base `PrairieLearn` directory run:

    docker build -t prairielearn .

## Running the container

See [the installation page](installing.md).

## `docker run` primer

Here's what the various parts of the `docker run` commands mean.

The basic format is `docker run [OPTIONS] IMAGE [COMMAND]`, with the parts in
brackets being optional.

### Options

- `-it` means "run this container interactively."
- `--rm` means "delete this container when I'm done with it." Unless you have a
  reason to keep a container, you should always use this flag.
- `-p 3000:3000` means "forward port 3000 on the host to port 3000 in the container."
- `-v /path/to/course:/course` means "mount `/path/to/course` on the host as `/course` in the container."
- `--name pl` gives the container a human-friendly name.

## Useful commands

In all of these commands, `IMAGE` refers to a docker image; if you built the
image manually (with `docker build`), then you should use `prairielearn`. If
you downloaded it (following the installation guide), use
`prairielearn/prairielearn`.

Most of these should be run from the root of your course directory.

- List running containers:

        docker ps

- Run a specific command in the container:

        docker run -it --rm -p 3000:3000 -v /path/to/course:/course IMAGE COMMAND

    E.g.,

        docker run -it --rm -p 3000:3000 -v /path/to/course:/course IMAGE ls -lah /course

- Start an interactive shell session:

        docker run -it --rm -p 3000:3000 -v /path/to/course:/course IMAGE /bin/bash

- Run a command in an existing container:

        docker exec -it CONTAINER_NAME COMMAND

    E.g., to start a shell in a container started with `--name pl`:

        docker exec -it pl /bin/bash

## Docker Hub

Docker Hub automatically (re)builds the `prairielearn/prairielearn` image
whenever a commit is pushed to `master`.

If you need to publish a local build, here's how:

### Pushing to Docker Hub

List images:

    docker images

Tag the correct one by ID:

    docker tag 7d9495d03763 prairielearn/prairielearn:latest

Login to Docker Hub:

    docker login

Push the image:

    docker push prairielearn/prairielearn

### Checking a push was successful

Delete all local versions:

    docker rmi -f 7d9495d03763

Pull and run the new version:

    docker run -it -p 3000:3000 -v ~/git/pl-tam212:/course prairielearn/prairielearn
