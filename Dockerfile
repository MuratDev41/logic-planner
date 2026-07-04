FROM node:24-alpine AS builder
WORKDIR /app
COPY client/package*.json client/
RUN cd client && npm ci
COPY client/ client/
RUN cd client && npm run build

FROM node:24-alpine
WORKDIR /app
COPY server/package*.json server/
RUN cd server && npm ci
COPY server/ server/
COPY --from=builder /app/client/dist /app/client/dist
RUN mkdir -p /app/server/data /app/server/uploads
EXPOSE 3001
CMD ["npx", "tsx", "server/src/index.ts"]
