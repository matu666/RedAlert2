#!/usr/bin/env bash

# rename_js_to_ts.sh
# Usage: ./rename_js_to_ts.sh <target_directory>
# This script recursively renames all files ending in .js to .ts within the specified directory.
# It only changes the file extension; file contents remain untouched.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <target_directory>" >&2
  exit 1
fi

TARGET_DIR="$1"

if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: $TARGET_DIR is not a directory or does not exist." >&2
  exit 1
fi

# Find all .js files and rename them to .ts, skipping if the .ts already exists.
find "$TARGET_DIR" -type f -name '*.js' | while IFS= read -r file; do
  ts_file="${file%.js}.ts"
  if [ -e "$ts_file" ]; then
    echo "Skip: $ts_file already exists."
  else
    mv "$file" "$ts_file"
    echo "Renamed: $file -> $ts_file"
  fi
done 