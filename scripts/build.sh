#!/bin/bash

os="${1:-unknown}"
target="${2:-bun}"
file_ext="$3"
archive_ext="${4:-.zip}"

dist_dir=../dist
bin_dir=../bin
out_dir=$dist_dir/$os
filename=tidalwave
archive_name=tidalwave-$os

rm -rf "$out_dir"
mkdir -p "$out_dir"
cd ../src

bun build \
    --compile \
    --production \
    --target=$target \
    --external="./config.json" \
    --external="./secrets.json" \
    --define="__filename=process.execPath" \
    --outfile="$out_dir/$filename$file_ext" \
    ./index.js

cp ./default.config.json "$out_dir/config.json"
cp ../README.md "$out_dir/README.md"
cp -r "$bin_dir/$os" "$out_dir/bin"
chmod +x "$out_dir/$filename$file_ext"

cp -r "$out_dir" "$dist_dir/$archive_name"
if [[ "$archive_ext" == ".tar.gz" ]]; then
    7z a "$dist_dir/$archive_name.tar" "$dist_dir/$archive_name" -bso0
    7z a "$dist_dir/$archive_name.tar.gz" "$dist_dir/$archive_name.tar" -bso0
else
    7z a "$dist_dir/$archive_name$archive_ext" "$dist_dir/$archive_name" -bso0
fi
rm -rf "$dist_dir/$archive_name"