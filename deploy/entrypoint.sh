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

# Run migrations
echo "Running central migrations..."
php artisan migrate --force

echo "Running tenant migrations..."
php artisan tenants:migrate --force

echo "Optimizing Laravel..."
php artisan optimize
php artisan view:cache
php artisan event:cache

echo "Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor.d/laravel.conf
