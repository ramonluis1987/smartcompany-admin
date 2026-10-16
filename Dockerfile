# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=http://localhost:4000
ARG VITE_WEB_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL VITE_WEB_URL=$VITE_WEB_URL
RUN npx vite build

# static single-page app
FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.inc /etc/nginx/conf.d/security-headers.inc
COPY --from=build /app/dist/client /usr/share/nginx/html
EXPOSE 3000
