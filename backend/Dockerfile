# ==============================================================================
# ReconX Backend & Autonomous Execution Sandbox
# ==============================================================================
FROM python:3.11-slim-bookworm

# Prevent Python from writing .pyc and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies, security inspection tools, and offensive packages
# Includes nmap, whois, dnsutils (dig/nslookup), curl, and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    whois \
    dnsutils \
    openssl \
    curl \
    iputils-ping \
    ca-certificates \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Nuclei (ProjectDiscovery) for active, non-destructive CVE verification.
# NUCLEI_VERSION=latest resolves the newest release at build time; pin e.g. 3.4.10 for reproducible builds.
# Build with --build-arg INSTALL_NUCLEI=false for a smaller image (the check is then reported as skipped).
ARG INSTALL_NUCLEI=true
ARG NUCLEI_VERSION=latest
RUN if [ "$INSTALL_NUCLEI" = "true" ]; then \
      set -eux; \
      V="$NUCLEI_VERSION"; \
      if [ "$V" = "latest" ]; then \
        V=$(curl -fsSL https://api.github.com/repos/projectdiscovery/nuclei/releases/latest \
            | python3 -c "import sys, json; print(json.load(sys.stdin)['tag_name'].lstrip('v'))"); \
      fi; \
      curl -fsSL -o /tmp/nuclei.zip "https://github.com/projectdiscovery/nuclei/releases/download/v${V}/nuclei_${V}_linux_amd64.zip"; \
      python3 -c "import zipfile; zipfile.ZipFile('/tmp/nuclei.zip').extract('nuclei', '/usr/local/bin')"; \
      chmod +x /usr/local/bin/nuclei; rm /tmp/nuclei.zip; \
      nuclei -update-templates -silent || true; \
    fi

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ ./app/

# Create persistent storage directory for reports and artifacts
RUN mkdir -p /app/storage /app/app/workers/jobs

# Expose FastAPI port
EXPOSE 8000

# Start Uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
