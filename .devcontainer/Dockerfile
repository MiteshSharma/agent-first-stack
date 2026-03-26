FROM mcr.microsoft.com/devcontainers/javascript-node:22

# Install tools
RUN apt-get update && apt-get install -y \
    postgresql-client redis-tools jq ripgrep iptables iproute2 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm + global tools
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g turbo typescript tsx @anthropic-ai/claude-code

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

WORKDIR /workspace
