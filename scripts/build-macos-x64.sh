#!/bin/bash

outdir=../dist/macos-x64
ext=
target=bun-darwin-x64

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