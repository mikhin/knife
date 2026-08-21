FROM node:24-slim

ARG VALE_VERSION=3.18.0
# Filled in by BuildKit; a default here would silently pin the wrong binary.
ARG TARGETARCH

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

RUN pip3 install --break-system-packages --no-cache-dir proselint==0.14.0

RUN case "${TARGETARCH}" in \
      arm64) VALE_ARCH="arm64" ;; \
      *) VALE_ARCH="64-bit" ;; \
    esac \
  && curl -sfL "https://github.com/errata-ai/vale/releases/download/v${VALE_VERSION}/vale_${VALE_VERSION}_Linux_${VALE_ARCH}.tar.gz" \
     -o /tmp/vale.tar.gz \
  && tar -xzf /tmp/vale.tar.gz -C /usr/local/bin vale \
  && rm /tmp/vale.tar.gz

# Off-the-shelf rules only: no style of our own, no word list of our own.
RUN npm install -g --no-fund --no-audit \
      textlint@15.2.1 \
      textlint-rule-write-good@2.0.0 \
      textlint-rule-no-todo@2.0.1

WORKDIR /app
COPY .vale.ini .textlintrc.json server.mjs ./
RUN vale sync || true

ENV PORT=8081
EXPOSE 8081
CMD ["node", "server.mjs"]
