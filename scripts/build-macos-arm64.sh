#!/bin/bash

os=macos-arm64
outdir=../dist/$os
ext=
target=bun-darwin-arm64

rm -rf "$outdir"
mkdir -p "$outdir"
cd ../src

bun build \
    --compile \
    --production \
    --target=$target \
    --external="./config.json" \
    --external="./secrets.json" \
    --outfile="$outdir/tidalwave-$os$ext" \
    ./index.js