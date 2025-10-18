#!/bin/bash

outdir=../dist/unknown
ext=
target=bun

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