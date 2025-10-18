#!/bin/bash

outdir=../dist/linux-arm64
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
    --outfile="$outdir/tidalwave$ext" \
    ./index.js