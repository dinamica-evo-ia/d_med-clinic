<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create test user
        $user = User::create([
            'name' => 'Dr. Admin',
            'email' => 'admin@medhealth.com.br',
            'password' => 'password',
            'phone' => '(11) 99999-8888',
        ]);

        // Create tenant - VirtualColumn stores all non-id attrs in 'data' JSON
        $tenant = Tenant::create([
            'id' => (string) Str::uuid(),
            'name' => 'Clínica MedHealth',
            'slug' => 'medhealth',
            'email' => 'contato@medhealth.com.br',
            'phone' => '(11) 3000-1234',
            'document' => '12.345.678/0001-90',
            'plan' => 'professional',
            'settings' => json_encode([
                'timezone' => 'America/Sao_Paulo',
                'currency' => 'BRL',
                'weekday_start' => '08:00',
                'weekday_end' => '18:00',
                'appointment_duration' => 30,
            ]),
        ]);

        // Create domain for tenant
        $tenant->domains()->create([
            'domain' => 'medhealth.localhost',
        ]);

        // Link user to tenant as admin
        $tenant->users()->attach($user->id, [
            'role' => 'admin',
            'is_active' => true,
        ]);

        // Create additional users for different roles
        $doctor = User::create([
            'name' => 'Dra. Carla Souza',
            'email' => 'carla@medhealth.com.br',
            'password' => 'password',
            'phone' => '(11) 98888-7777',
        ]);

        $receptionist = User::create([
            'name' => 'Paula Oliveira',
            'email' => 'paula@medhealth.com.br',
            'password' => 'password',
            'phone' => '(11) 97777-6666',
        ]);

        $tenant->users()->attach($doctor->id, [
            'role' => 'doctor',
            'is_active' => true,
        ]);

        $tenant->users()->attach($receptionist->id, [
            'role' => 'receptionist',
            'is_active' => true,
        ]);

        // Initialize the tenant database
        $tenant->database()->manager()->createDatabase($tenant);

        // Run tenant migrations and seed
        $tenant->run(function () {
            foreach (glob(database_path('migrations/tenant/*.php')) as $file) {
                $migration = require $file;
                $migration->up();
            }
            $this->call(TenantDatabaseSeeder::class);
        });
    }
}
