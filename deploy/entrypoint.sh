#!/bin/sh
set -e

# Wait for DB file to be present (volume mount)
if [ "$DB_CONNECTION" = "sqlite" ]; then
    db_path="${DB_DATABASE:-/app/database/database.sqlite}"
    db_dir="$(dirname "$db_path")"
    if [ ! -f "$db_path" ]; then
        echo "Creating SQLite database at $db_path"
        touch "$db_path"
    fi
fi

# Permissoes (php-fpm = www-data)
chown -R www-data:www-data /app/storage /app/bootstrap/cache /app/database 2>/dev/null || true

# Run migrations (nao deve derrubar o container se ja estiver migrado/seedado)
echo "Running central migrations..."
su -s /bin/sh www-data -c "php artisan migrate --force" || echo "WARN: central migrate falhou (seguindo)"

echo "Running tenant migrations..."
su -s /bin/sh www-data -c "php artisan tenants:migrate --force" || echo "WARN: tenants migrate falhou (seguindo)"

echo "Optimizing Laravel..."
su -s /bin/sh www-data -c "php artisan optimize:clear" || true

echo "Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor.d/laravel.conf
