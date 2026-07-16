#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
out_dir="${root_dir}/dist"
staging_dir="$(mktemp -d)"
trap 'rm -rf -- "${staging_dir}"' EXIT

command -v gnome-extensions >/dev/null || {
    echo "gnome-extensions is required to build Compact Capture" >&2
    exit 1
}

mkdir -p "${out_dir}"
cp -a "${root_dir}/src/." "${staging_dir}/"
cp "${root_dir}/LICENSE" "${root_dir}/ATTRIBUTION.md" "${staging_dir}/"

gnome-extensions pack "${staging_dir}" \
    --force \
    --out-dir="${out_dir}"
