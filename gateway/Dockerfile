# Multi-stage Dockerfile for Self-Contained TOEIC Flow Gateway

# Stage 1: Build React Frontend from source
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy dependency manifests
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Hardened Nginx Gateway
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy built frontend assets
COPY --from=frontend-builder /app/dist ./

# Copy gateway configuration
COPY gateway/nginx.conf /etc/nginx/nginx.conf
COPY gateway/proxy_params /etc/nginx/proxy_params

EXPOSE 8088

STOPSIGNAL SIGQUIT

CMD ["nginx", "-g", "daemon off;"]
