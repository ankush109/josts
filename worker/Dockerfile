# Puppeteer needs Chrome dependencies — use the official Node image (Debian-based, not Alpine)
# Alpine is missing glibc which Chrome requires
FROM node:22-slim

# Chrome system dependencies
RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Puppeteer caches Chrome under $HOME/.cache by default — pin it inside /app
# so the non-root user we switch to below can read it.
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false

COPY package*.json ./
RUN npm install --production

COPY . .

# Hand ownership to the built-in `node` user and drop privileges. Chrome refuses
# to run as root without --no-sandbox; running as non-root keeps its sandbox on.
RUN chown -R node:node /app
USER node

CMD ["node", "index.js"]
