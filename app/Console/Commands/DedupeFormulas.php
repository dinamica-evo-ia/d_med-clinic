<?php

namespace App\Console\Commands;

use App\Models\Formula;
use App\Models\Tenant;
use Illuminate\Console\Command;

/*
 * Segunda etapa da limpeza (roda depois de formulas:tidy):
 *  - remove entradas que não são fórmula (notas/encaminhamentos hospitalares)
 *  - deduplica por nome (mesma composição receitada várias vezes) mantendo o conteúdo mais completo
 *  - normaliza o casing do nome ("De/Do/Da/E" em minúsculo)
 *  - varre PII residual e reporta
 *
 * Uso: php artisan formulas:dedupe <tenantId> [--dry]
 */
class DedupeFormulas extends Command
{
    protected $signature = 'formulas:dedupe {tenant} {--dry} {--junk= : IDs (separados por vírgula) que não são fórmula — ex.: notas/encaminhamentos}';

    protected $description = 'Remove não-fórmulas, deduplica por nome e reporta PII residual';

    public function handle(): int
    {
        $tenant = Tenant::find($this->argument('tenant'));
        if (! $tenant) {
            $this->error('Tenant não encontrado.');
            return 1;
        }
        tenancy()->initialize($tenant);
        $dry = (bool) $this->option('dry');

        // IDs que não são fórmula (notas, encaminhamentos) — variam por importação, por isso
        // vêm por parâmetro. Confira antes com --dry.
        $junkIds = array_filter(array_map('trim', explode(',', (string) $this->option('junk'))), fn ($v) => $v !== '');

        // 1) remove não-fórmulas
        $removedJunk = 0;
        foreach (Formula::whereIn('id', $junkIds)->get() as $f) {
            $this->line("  <fg=red>não-fórmula</> #{$f->id} {$f->name}");
            if (! $dry) {
                $f->delete();
                $removedJunk++;
            }
        }

        // 2) dedup por nome normalizado — mantém o de conteúdo mais completo
        $norm = fn ($s) => preg_replace('/\s+/', ' ', mb_strtolower(trim((string) $s)));
        $groups = Formula::orderBy('id')->get()
            ->reject(fn ($f) => in_array((string) $f->id, $junkIds, true))
            ->groupBy(fn ($f) => $norm($f->name));

        $removedDup = 0;
        foreach ($groups as $g) {
            if ($g->count() <= 1) {
                continue;
            }
            $keep = $g->sortByDesc(fn ($f) => mb_strlen((string) $f->content))->first();
            foreach ($g as $f) {
                if ($f->id !== $keep->id) {
                    $this->line("  <fg=yellow>dup</> #{$f->id} {$f->name}  (mantém #{$keep->id})");
                    if (! $dry) {
                        $f->delete();
                        $removedDup++;
                    }
                }
            }
        }

        // 3) normaliza casing dos nomes que sobraram
        $fixCase = fn ($name) => preg_replace_callback('/\b(De|Do|Da|Das|Dos|E|Com|Ou)\b/u', fn ($m) => mb_strtolower($m[1]), (string) $name);
        if (! $dry) {
            foreach (Formula::all() as $f) {
                $nn = $fixCase($f->name);
                if ($nn !== $f->name) {
                    $f->update(['name' => $nn]);
                }
            }
        }

        // 4) varredura de PII residual (só reporta)
        $markers = ['CPF', 'CID ', 'CRM', 'PACIENTE', 'ENDEREÇO', 'TELEFONE', ' RUA ', 'INTERNAR', 'AO PS'];
        $pii = [];
        foreach (Formula::all() as $f) {
            $blob = mb_strtoupper($f->name.' '.$f->content);
            $hit = preg_match('/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/', (string) $f->content);
            foreach ($markers as $m) {
                if (str_contains($blob, $m)) {
                    $hit = true;
                    break;
                }
            }
            if ($hit) {
                $pii[] = $f->id;
            }
        }

        $this->info(($dry ? '[DRY] ' : '')."Não-fórmulas: {$removedJunk} · Dups: {$removedDup} · Final: ".Formula::count().' · PII suspeito: '.count($pii).($pii ? ' ('.implode(',', $pii).')' : ''));
        tenancy()->end();

        return 0;
    }
}
