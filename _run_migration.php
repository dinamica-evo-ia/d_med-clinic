<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();
$tenant = \App\Models\Tenant::find('576ca455-91ec-45e6-a1e0-6fb22b27fac1');
$tenant->run(function () {
    require base_path('database/migrations/tenant/2024_01_01_000010_create_prescriptions_table.php');
    echo 'Migration executada com sucesso!'.PHP_EOL;
});

