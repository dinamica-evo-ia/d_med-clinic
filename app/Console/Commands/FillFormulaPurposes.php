<?php

namespace App\Console\Commands;

use App\Models\Formula;
use App\Models\Tenant;
use App\Support\Claude;
use Illuminate\Console\Command;

/*
 * Preenche a FINALIDADE ("pra que serve") das fórmulas que estão sem — é o campo que o médico
 * usa pra buscar na receita e o título do card na biblioteca. A IA infere a partir da composição.
 * Só toca em quem está sem finalidade; nunca sobrescreve uma já preenchida.
 *
 * Uso: php artisan formulas:purposes <tenantId> [--dry] [--batch=15]
 */
class FillFormulaPurposes extends Command
{
    protected $signature = 'formulas:purposes {tenant} {--dry : Só mostra, não salva} {--batch=15}';

    protected $description = 'Preenche via IA a finalidade das fórmulas que estão sem';

    public function handle(): int
    {
        $tenant = Tenant::find($this->argument('tenant'));
        if (! $tenant) {
            $this->error('Tenant não encontrado.');
            return 1;
        }
        if (! Claude::configured()) {
            $this->error('Claude não configurado.');
            return 1;
        }

        tenancy()->initialize($tenant);
        $dry = (bool) $this->option('dry');

        $sem = Formula::where(function ($q) {
            $q->whereNull('purpose')->orWhere('purpose', '');
        })->get();

        $this->info("Sem finalidade: {$sem->count()} (de ".Formula::count().')');
        if ($sem->isEmpty()) {
            tenancy()->end();
            return 0;
        }

        $feitas = 0;
        foreach ($sem->chunk(max(1, (int) $this->option('batch'))) as $chunk) {
            $payload = $chunk->map(fn ($f) => [
                'id' => $f->id,
                'nome' => $f->name,
                'composicao' => mb_strimwidth((string) $f->content, 0, 400, '…'),
            ])->values()->all();

            try {
                $res = $this->askPurposes($payload);
            } catch (\Throwable $e) {
                $this->warn('  batch falhou ('.$e->getMessage().')');
                continue;
            }

            $byId = collect($res)->keyBy('id');
            foreach ($chunk as $f) {
                $p = trim((string) ($byId->get($f->id)['purpose'] ?? ''));
                if ($p === '') {
                    continue;
                }
                if ($dry) {
                    $this->line("  #{$f->id} {$f->name} → <fg=green>{$p}</>");
                } else {
                    $f->update(['purpose' => $p]);
                }
                $feitas++;
            }
            $this->line('  '.($dry ? 'analisadas' : 'preenchidas').": {$feitas}");
        }

        $this->info(($dry ? '[DRY] ' : '')."Concluído. Finalidades preenchidas: {$feitas}. Ainda sem: ".
            Formula::where(fn ($q) => $q->whereNull('purpose')->orWhere('purpose', ''))->count());
        tenancy()->end();

        return 0;
    }

    private function askPurposes(array $items): array
    {
        $system = <<<'TXT'
Você rotula fórmulas magistrais e medicamentos de um consultório brasileiro com a FINALIDADE —
"pra que serve" — que é como o médico busca na hora de prescrever.

REGRAS:
- Curta e direta, 2 a 4 palavras, em português. Ex.: "Sono e ansiedade", "Emagrecimento",
  "Reposição hormonal masculina", "Disfunção erétil", "Imunidade e energia".
- Baseie-se na composição/princípios ativos. Sem inventar indicação que não se sustente.
- É rótulo de busca, não bula: nada de posologia, dose ou texto longo.
- SEMPRE devolva uma finalidade para cada item (nunca vazio).

Responda APENAS com um array JSON: [{"id":N,"purpose":"..."}] — sem texto fora do JSON.
TXT;

        $res = Claude::messages([
            'max_tokens' => 2048,
            'system' => $system,
            'messages' => [[
                'role' => 'user',
                'content' => 'Dê a finalidade de cada uma:'."\n".json_encode($items, JSON_UNESCAPED_UNICODE),
            ]],
        ]);

        $text = '';
        foreach ($res['content'] ?? [] as $b) {
            if (($b['type'] ?? '') === 'text') {
                $text .= $b['text'];
            }
        }
        $s = strpos($text, '[');
        $e = strrpos($text, ']');
        if ($s === false || $e === false) {
            throw new \RuntimeException('sem JSON no retorno');
        }
        $json = json_decode(substr($text, $s, $e - $s + 1), true);
        if (! is_array($json)) {
            throw new \RuntimeException('JSON inválido');
        }

        return $json;
    }
}
