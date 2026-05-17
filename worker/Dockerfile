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

COPY package*.json ./

# postinstall script downloads Chrome automatically
RUN npm install --production

COPY . .

# Tell Puppeteer not to download Chrome again at runtime (already done above)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
# Run Chrome in no-sandbox mode (required inside Docker)
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox"

CMD ["node", "index.js"]
