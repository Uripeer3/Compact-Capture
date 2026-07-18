#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
archive="${1:-${root_dir}/dist/compact-capture@uripeer3.github.io.shell-extension.zip}"

[[ -f "${archive}" ]] || {
    echo "Package not found: ${archive}" >&2
    exit 1
}

mapfile -t entries < <(unzip -Z1 "${archive}" | LC_ALL=C sort)
((${#entries[@]})) || {
    echo "Package is empty: ${archive}" >&2
    exit 1
}

required=(
    ATTRIBUTION.md
    LICENSE
    extension.js
    metadata.json
    stylesheet.css
)

for required_entry in "${required[@]}"; do
    printf '%s\n' "${entries[@]}" | grep -Fqx -- "${required_entry}" || {
        echo "Package is missing ${required_entry}" >&2
        exit 1
    }
done

for entry in "${entries[@]}"; do
    case "${entry}" in
        */|ATTRIBUTION.md|LICENSE|extension.js|metadata.json|stylesheet.css)
            ;;
        core/*.js|shell/*.js|ui/*.js|icons/*.svg)
            ;;
        locale/*/LC_MESSAGES/compact-capture.mo)
            ;;
        *)
            echo "Unexpected package entry: ${entry}" >&2
            exit 1
            ;;
    esac
done

echo "Verified ${#entries[@]} package entries in ${archive}"
