FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/code-runner-contracts/package.json packages/code-runner-contracts/package.json
COPY apps/code-runner-gateway/package.json apps/code-runner-gateway/package.json
RUN npm ci --workspace apps/code-runner-gateway --workspace packages/code-runner-contracts

COPY packages/code-runner-contracts packages/code-runner-contracts
COPY apps/code-runner-gateway apps/code-runner-gateway
RUN npm run build --workspace packages/code-runner-contracts && npm run build --workspace apps/code-runner-gateway

USER node
EXPOSE 4100
CMD ["node", "apps/code-runner-gateway/dist/main.js"]
