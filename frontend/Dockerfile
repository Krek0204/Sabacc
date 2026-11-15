# 1️⃣ Сборка фронта
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Серверный образ: статика внутри образа, Node.js в runtime не нужен.
FROM nginx:stable-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html

# Локальный Compose сохраняет прежний build-only target.
FROM alpine:3.20 AS export
WORKDIR /app
COPY --from=build /app/dist /dist



