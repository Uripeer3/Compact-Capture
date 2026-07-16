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

extra_sources=()
for source in "${staging_dir}"/*; do
    filename="${source##*/}"
    case "${filename}" in
        extension.js|metadata.json|prefs.js|stylesheet*.css)
            continue
            ;;
    esac
    extra_sources+=("--extra-source=${filename}")
done

gnome-extensions pack \
    --force \
    --out-dir="${out_dir}" \
    "${extra_sources[@]}" \
    "${staging_dir}"
