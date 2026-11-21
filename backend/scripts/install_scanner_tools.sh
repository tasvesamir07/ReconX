#!/usr/bin/env bash
# Installs the optional scanner tools used by the ReconX scan engine into
# ~/.local/bin (no sudo needed). Run inside Kali / WSL or any Linux host:
#
#   bash backend/scripts/install_scanner_tools.sh            # latest Nuclei
#   NUCLEI_VERSION=3.4.10 bash backend/scripts/install_scanner_tools.sh
#
# nmap, dig, whois and openssl come from the distribution, e.g. on Kali/Debian:
#   sudo apt install -y nmap dnsutils whois openssl
set -euo pipefail

BIN_DIR="${HOME}/.local/bin"
mkdir -p "${BIN_DIR}"

case "$(uname -m)" in
  x86_64|amd64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

V="${NUCLEI_VERSION:-latest}"
if [ "${V}" = "latest" ]; then
  V=$(curl -fsSL https://api.github.com/repos/projectdiscovery/nuclei/releases/latest \
      | python3 -c "import sys, json; print(json.load(sys.stdin)['tag_name'].lstrip('v'))")
fi

echo "Installing Nuclei v${V} (${ARCH}) into ${BIN_DIR} ..."
TMP=$(mktemp -d)
curl -fsSL -o "${TMP}/nuclei.zip" "https://github.com/projectdiscovery/nuclei/releases/download/v${V}/nuclei_${V}_linux_${ARCH}.zip"
python3 -c "import zipfile, sys; zipfile.ZipFile(sys.argv[1]).extract('nuclei', sys.argv[2])" "${TMP}/nuclei.zip" "${BIN_DIR}"
chmod +x "${BIN_DIR}/nuclei"
rm -rf "${TMP}"

echo "Downloading Nuclei templates ..."
"${BIN_DIR}/nuclei" -update-templates -silent || true
"${BIN_DIR}/nuclei" -version 2>&1 | head -n 2

for tool in nmap dig whois openssl; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "Note: ${tool} not found. Install it with your package manager for full coverage."
  fi
done
echo "Done. The ReconX engine finds tools in PATH and in ${BIN_DIR} automatically."
