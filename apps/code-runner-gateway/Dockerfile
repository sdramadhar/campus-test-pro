FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/code-runner-contracts/package.json packages/code-runner-contracts/package.json
COPY apps/code-runner-gateway/package.json apps/code-runner-gateway/package.json
RUN npm ci --workspace apps/code-runner-gateway --workspace packages/code-runner-contracts --include-workspace-root=false

COPY packages/code-runner-contracts packages/code-runner-contracts
COPY apps/code-runner-gateway apps/code-runner-gateway
RUN npm run build --workspace packages/code-runner-contracts && npm run build --workspace apps/code-runner-gateway

FROM node:22-alpine AS runner
ARG APP_VERSION=0.1.0
ARG GIT_COMMIT_SHA=local
LABEL org.opencontainers.image.title="campustest-code-runner-gateway" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT_SHA}" \
      org.opencontainers.image.source="https://github.com/sdramadhar/campus-test-pro"

WORKDIR /app
ENV NODE_ENV=production
ENV APP_ENV=production

COPY package.json package-lock.json ./
COPY packages/code-runner-contracts/package.json packages/code-runner-contracts/package.json
COPY apps/code-runner-gateway/package.json apps/code-runner-gateway/package.json
RUN npm ci --omit=dev --workspace apps/code-runner-gateway --workspace packages/code-runner-contracts --include-workspace-root=false

COPY --from=build /app/apps/code-runner-gateway/dist apps/code-runner-gateway/dist
USER node
STOPSIGNAL SIGTERM
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4100/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/code-runner-gateway/dist/main.js"]
