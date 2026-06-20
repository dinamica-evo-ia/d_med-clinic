<?php

namespace Tests\Traits;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

trait TenantSetup
{
    protected ?Tenant $tenant = null;
    protected ?User $user = null;

    protected function setUpTenant(array $options = []): void
    {
        // Tear down previous tenant if setUpTenant is called again within same test
        if ($this->tenant) {
            $this->tearDownTenant();
        }

        $role = $options['role'] ?? 'admin';

        // Ensure central tables exist and clean previous data for test isolation
        DB::connection('sqlite')->unprepared('
            CREATE TABLE IF NOT EXISTS tenants (
                id VARCHAR(255) PRIMARY KEY NOT NULL,
                data TEXT,
                settings TEXT,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        ');
        DB::connection('sqlite')->unprepared('
            CREATE TABLE IF NOT EXISTS tenant_user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tenant_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                role VARCHAR(255) DEFAULT "doctor",
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(tenant_id, user_id)
            )
        ');
        DB::connection('sqlite')->unprepared('
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY NOT NULL,
                name VARCHAR(255),
                email VARCHAR(255) UNIQUE,
                phone VARCHAR(255),
                password VARCHAR(255),
                remember_token VARCHAR(100),
                email_verified_at TIMESTAMP,
                created_at TIMESTAMP,
                updated_at TIMESTAMP
            )
        ');
        DB::connection('sqlite')->unprepared('DELETE FROM tenant_user');
        DB::connection('sqlite')->unprepared('DELETE FROM tenants');
        DB::connection('sqlite')->unprepared('DELETE FROM users');

        // Create tenant
        $this->tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'slug' => 'test-clinic',
            'name' => 'Test Clinic',
            'email' => 'clinic@test.com',
            'plan' => 'professional',
            'settings' => json_encode([
                'timezone' => 'America/Sao_Paulo',
                'currency' => 'BRL',
            ]),
        ]);

        // Create tenant database
        $this->tenant->database()->manager()->createDatabase($this->tenant);

        // Initialize tenancy
        tenancy()->initialize($this->tenant);

        // Run tenant migrations
        $migrationFiles = glob(database_path('migrations/tenant/*.php'));
        sort($migrationFiles);
        foreach ($migrationFiles as $file) {
            $migration = require $file;
            $migration->up();
        }

        // Switch back to central connection for user creation
        tenancy()->central(function () use ($role) {
            $this->user = User::create([
                'name' => 'Dr. Test',
                'email' => 'test@test.com',
                'password' => bcrypt('password'),
                'phone' => '(11) 99999-8888',
            ]);

            $this->user->tenants()->attach($this->tenant->id, [
                'role' => $role,
                'is_active' => true,
            ]);
        });

        // Login user
        auth()->login($this->user);
        session(['tenant_slug' => $this->tenant->slug ?? 'test-clinic']);

        // Re-initialize tenancy so it picks up the full context
        tenancy()->initialize($this->tenant);
    }

    protected function tearDownTenant(): void
    {
        if ($this->tenant && tenancy()->initialized) {
            tenancy()->end();
        }

        if ($this->tenant) {
            $dbName = $this->tenant->database()->getName();
            $dbPath = database_path($dbName);
            if (file_exists($dbPath)) {
                unlink($dbPath);
            }
        }

        $this->tenant = null;
        $this->user = null;
    }
}
