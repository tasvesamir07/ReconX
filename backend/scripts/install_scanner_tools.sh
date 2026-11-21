#!/usr/bin/env bash
# Installs the optional scanner tools used by the ReconX scan engine into
# ~/.local/bin and ./bin (no sudo needed). Works on Linux, macOS, WSL, or cloud containers:
#
#   bash backend/scripts/install_scanner_tools.sh            # latest Nuclei (fallback 3.3.8)
#   NUCLEI_VERSION=3.3.8 bash backend/scripts/install_scanner_tools.sh
#
set -eo pipefail

BIN_DIR="${HOME}/.local/bin"
LOCAL_BIN="$(pwd)/bin"
mkdir -p "${BIN_DIR}" "${LOCAL_BIN}"

case "$(uname -m)" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 0 ;;
esac

V="${NUCLEI_VERSION:-latest}"
if [ "${V}" = "latest" ]; then
  V=$(curl -fsSL --max-time 8 https://api.github.com/repos/projectdiscovery/nuclei/releases/latest 2>/dev/null \
      | python3 -c "import sys, json; print(json.load(sys.stdin).get('tag_name', '').lstrip('v'))" 2>/dev/null || true)
  if [ -z "${V}" ]; then
    V="3.3.8"
    echo "Using default stable Nuclei version v${V}"
  fi
fi

# If already installed and working, skip re-download
if command -v nuclei >/dev/null 2>&1 || [ -x "${BIN_DIR}/nuclei" ] || [ -x "${LOCAL_BIN}/nuclei" ]; then
  echo "Nuclei already installed. Updating templates..."
  "${BIN_DIR}/nuclei" -update-templates -silent 2>/dev/null || "${LOCAL_BIN}/nuclei" -update-templates -silent 2>/dev/null || true
  exit 0
fi

echo "Installing Nuclei v${V} (${ARCH}) into ${BIN_DIR} and ${LOCAL_BIN} ..."
TMP=$(mktemp -d)
DOWNLOAD_URL="https://github.com/projectdiscovery/nuclei/releases/download/v${V}/nuclei_${V}_linux_${ARCH}.zip"

if curl -fsSL --max-time 60 -o "${TMP}/nuclei.zip" "${DOWNLOAD_URL}" 2>/dev/null; then
  python3 -c "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extract('nuclei', sys.argv[2])" "${TMP}/nuclei.zip" "${BIN_DIR}" 2>/dev/null || true
  chmod +x "${BIN_DIR}/nuclei" 2>/dev/null || true
  cp -f "${BIN_DIR}/nuclei" "${LOCAL_BIN}/nuclei" 2>/dev/null || true
  chmod +x "${LOCAL_BIN}/nuclei" 2>/dev/null || true
  echo "Nuclei binary installed successfully."
  echo "Downloading Nuclei templates..."
  "${BIN_DIR}/nuclei" -update-templates -silent 2>/dev/null || "${LOCAL_BIN}/nuclei" -update-templates -silent 2>/dev/null || true
else
  echo "Note: Could not download Nuclei directly (network or rate limit). Scan engine will continue with pure-Python active checks."
fi
rm -rf "${TMP}"

echo "Done. The ReconX engine searches PATH, ~/.local/bin, and ./bin automatically."
