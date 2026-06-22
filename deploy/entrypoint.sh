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

# Run migrations
echo "Running central migrations..."
su -s /bin/sh www-data -c "php artisan migrate --force"

echo "Running tenant migrations..."
su -s /bin/sh www-data -c "php artisan tenants:migrate --force"

echo "Optimizing Laravel..."
su -s /bin/sh www-data -c "php artisan optimize"
su -s /bin/sh www-data -c "php artisan view:cache"
su -s /bin/sh www-data -c "php artisan event:cache"

echo "Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor.d/laravel.conf
