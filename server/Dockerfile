# HoodLust Survivor backend — production image.
FROM node:20-alpine
# pg_dump/psql for backups + restore.
RUN apk add --no-cache postgresql-client tini
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
# Health check hits the public health endpoint.
HEALTHCHECK --interval=30s --timeout=4s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","src/index.js"]
