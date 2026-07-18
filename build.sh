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

po_dir="${COMPACT_CAPTURE_PO_DIR:-${root_dir}/po}"
shopt -s nullglob
po_files=("${po_dir}"/*.po)
shopt -u nullglob
if ((${#po_files[@]})); then
    command -v msgfmt >/dev/null || {
        echo "msgfmt is required when translation catalogs are present" >&2
        exit 1
    }

    for po_file in "${po_files[@]}"; do
        locale="${po_file##*/}"
        locale="${locale%.po}"
        locale_dir="${staging_dir}/locale/${locale}/LC_MESSAGES"
        mkdir -p "${locale_dir}"
        msgfmt \
            --check \
            --output-file="${locale_dir}/compact-capture.mo" \
            "${po_file}"
    done
fi

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
