# Stage 1 — Build frontend assets
FROM node:24-alpine AS node-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — PHP runtime
FROM php:8.3-fpm-alpine

# System dependencies
RUN apk add --no-cache \
    curl \
    git \
    unzip \
    nginx \
    supervisor

# PHP extensions
RUN docker-php-ext-install pdo_sqlite bcmath

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# App
WORKDIR /app
COPY . .

# Install PHP dependencies (no dev)
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy built assets from node stage
COPY --from=node-build /app/public/build /app/public/build

# Configuration files
COPY deploy/nginx.conf /etc/nginx/http.d/default.conf
COPY deploy/supervisor.conf /etc/supervisor.d/laravel.conf
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Production env
RUN cp .env.production.example .env && \
    php artisan key:generate --force && \
    php artisan storage:link --force

# Volumes
VOLUME ["/app/database", "/app/storage"]

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
