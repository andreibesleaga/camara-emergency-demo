FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY frontend ./frontend
COPY backend ./backend
COPY tsconfig.json vite.config.js ./
RUN npm run build:full

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY .env.example ./
EXPOSE 8080
CMD ["node", "backend/dist/server.js"]
