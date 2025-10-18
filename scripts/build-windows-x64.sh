#!/bin/bash

os=windows-x64
outdir=../dist/$os
ext=.exe
target=bun-windows-x64

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