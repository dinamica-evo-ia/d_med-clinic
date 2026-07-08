<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TenantApiKey;
use Illuminate\Console\Command;

/*
 * Gera uma chave de API (token dmk_) pra uma clínica chamar a API /api/agent/*.
 * O token em claro é mostrado UMA vez; depois só fica o hash. Vira UI no Master depois.
 *
 *   php artisan tenant:api-key medhealth
 *   php artisan tenant:api-key <uuid> --name="D_Agent Atende" --scopes=agenda:read,agenda:write,pacientes:write
 */
class GenerateTenantApiKey extends Command
{
    protected $signature = 'tenant:api-key
        {clinica : slug ou id da clínica}
        {--name=D_Agent Atende : rótulo da chave}
        {--scopes=agenda:read,agenda:write,pacientes:write : escopos separados por vírgula}';

    protected $description = 'Gera token de API (dmk_) pra uma clínica usar a API /api/agent/*';

    public function handle(): int
    {
        $ref = $this->argument('clinica');
        $tenant = Tenant::where('data->slug', $ref)->first() ?? Tenant::find($ref);

        if (! $tenant) {
            $this->error("Clínica não encontrada: {$ref}");
            return self::FAILURE;
        }

        $scopes = array_values(array_filter(array_map('trim', explode(',', (string) $this->option('scopes')))));
        [$key, $token] = TenantApiKey::issue($tenant->id, (string) $this->option('name'), $scopes);

        $this->info("Chave criada para: {$tenant->name} ({$tenant->id})");
        $this->line('Escopos: ' . implode(', ', $scopes));
        $this->newLine();
        $this->warn('TOKEN (copie agora — não será mostrado de novo):');
        $this->line($token);

        return self::SUCCESS;
    }
}
