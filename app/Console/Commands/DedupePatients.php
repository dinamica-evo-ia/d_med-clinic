<?php

namespace App\Console\Commands;

use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Console\Command;

/*
 * Remove pacientes duplicados (mantém o mais antigo de cada grupo). Usa a MESMA chave
 * da importação (Patient::dedupeKey): CPF > nome+nascimento > nome+telefone > nome.
 * Soft-delete (recuperável). Roda em todos os tenants, ou num só via --tenant=<slug|id>.
 *
 *   php artisan patients:dedupe --dry      (só conta, não apaga)
 *   php artisan patients:dedupe            (limpa)
 */
class DedupePatients extends Command
{
    protected $signature = 'patients:dedupe {--tenant= : slug ou id de uma clínica (default: todas)} {--dry : só mostra, não apaga}';
    protected $description = 'Remove pacientes duplicados (mantém o mais antigo de cada grupo).';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry');

        $ref = $this->option('tenant');
        $tenants = $ref
            ? Tenant::where('data->slug', $ref)->get()->whenEmpty(fn () => Tenant::where('id', $ref)->get())
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('Nenhuma clínica encontrada.');
            return self::FAILURE;
        }

        $total = 0;
        foreach ($tenants as $t) {
            tenancy()->initialize($t);

            $patients = Patient::orderBy('created_at')->orderBy('id')
                ->get(['id', 'name', 'document', 'birth_date', 'phone']);

            $seen = [];
            $remove = [];
            foreach ($patients as $p) {
                $key = Patient::dedupeKey($p->name, $p->document, $p->birth_date?->toDateString(), $p->phone);
                if (isset($seen[$key])) {
                    $remove[] = $p->id;
                } else {
                    $seen[$key] = true;
                }
            }

            $n = count($remove);
            if ($n > 0 && ! $dry) {
                Patient::whereIn('id', $remove)->delete();
            }
            tenancy()->end();

            if ($n > 0) {
                $this->line(sprintf('  %s: %d duplicado(s) %s (de %d)', $t->name, $n, $dry ? '[dry]' : 'removido(s)', $patients->count()));
            }
            $total += $n;
        }

        $this->info(($dry ? '[DRY] ' : '') . "Total: {$total} duplicado(s) em {$tenants->count()} clínica(s).");
        return self::SUCCESS;
    }
}
