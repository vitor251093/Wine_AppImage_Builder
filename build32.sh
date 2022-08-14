#!/bin/bash

DIR="$(dirname "${BASH_SOURCE[0]}")"
DIR="$(realpath "${DIR}")"
cd "$DIR"

export REPO_ARCH="i386"
./build.sh "$@"
