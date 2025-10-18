#!/bin/bash

os=linux-arm64
outdir=../dist/$os
ext=
target=bun-linux-arm64

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