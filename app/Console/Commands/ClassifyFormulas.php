<?php

namespace App\Console\Commands;

use App\Models\Formula;
use App\Models\Tenant;
use App\Support\Claude;
use Illuminate\Console\Command;

/*
 * Classifica as fórmulas em MANIPULADO x INDUSTRIALIZADO usando IA.
 * Necessário porque import vindo de export de RECEITAS mistura os dois (o médico prescreve
 * manipulado e medicamento de marca no mesmo lugar) — e o seed inicial marca tudo como
 * 'manipulado'. Rode sempre com --dry primeiro e confira a lista.
 *
 * Uso: php artisan formulas:classify <tenantId> [--dry] [--batch=20]
 */
class ClassifyFormulas extends Command
{
    protected $signature = 'formulas:classify {tenant} {--dry : Só mostra, não altera} {--batch=20}';

    protected $description = 'Classifica as fórmulas em manipulado x industrializado via IA';

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
        $todas = Formula::orderBy('name')->get();
        $this->info("Fórmulas: {$todas->count()}");

        $manip = [];
        $indus = [];
        foreach ($todas->chunk(max(1, (int) $this->option('batch'))) as $chunk) {
            $payload = $chunk->map(fn ($f) => [
                'id' => $f->id,
                'nome' => $f->name,
                'composicao' => mb_strimwidth((string) $f->content, 0, 260, '…'),
            ])->values()->all();

            try {
                $res = $this->classify($payload);
            } catch (\Throwable $e) {
                $this->warn('  batch falhou ('.$e->getMessage().')');
                continue;
            }

            $byId = collect($res)->keyBy('id');
            foreach ($chunk as $f) {
                $c = $byId->get($f->id);
                $cat = ($c['category'] ?? '') === 'industrializado' ? 'industrializado' : 'manipulado';
                $linha = ['f' => $f, 'motivo' => $c['reason'] ?? ''];
                if ($cat === 'industrializado') {
                    $indus[] = $linha;
                } else {
                    $manip[] = $linha;
                }
                if (! $dry && $f->category !== $cat) {
                    $f->update(['category' => $cat]);
                }
            }
            $this->line('  processadas: '.(count($manip) + count($indus)));
        }

        $this->newLine();
        $this->line('<fg=cyan>=== INDUSTRIALIZADOS ('.count($indus).') ===</>');
        foreach ($indus as $l) {
            $this->line('  '.str_pad(mb_substr($l['f']->name, 0, 46), 48).' | '.$l['motivo']);
        }
        $this->newLine();
        $this->line('<fg=green>=== MANIPULADOS ('.count($manip).') ===</>');
        foreach ($manip as $l) {
            $this->line('  '.str_pad(mb_substr($l['f']->name, 0, 46), 48).' | '.$l['motivo']);
        }

        $this->newLine();
        $this->info(($dry ? '[DRY — nada foi alterado] ' : '')
            .'Manipulados: '.count($manip).' · Industrializados: '.count($indus));
        tenancy()->end();

        return 0;
    }

    private function classify(array $items): array
    {
        $system = <<<'TXT'
Você classifica itens da biblioteca de um consultório médico brasileiro em duas categorias:

- "manipulado": fórmula feita sob medida por farmácia de manipulação. Sinais: vários ativos
  combinados com concentrações, veículo/QSP, "Mande: X cápsulas", ativos avulsos (vitaminas,
  minerais, fitoterápicos, aminoácidos, probióticos, hormônios manipulados, cremes/géis/tinturas
  com base). Também conta ativo isolado manipulado (ex.: "Ácido Alfa Lipoico 300mg" em cápsula).
- "industrializado": medicamento pronto, de marca/laboratório, comprado na farmácia comum.
  Sinais: nome comercial registrado (ex.: Mounjaro, Losartana, Citalopram, Flancox, Deposteron,
  Bepantol, Tandrilax, Keflex, Zyad, Noripurum, Deca Durabolin), apresentação em caixa/ampola
  pronta, dose padronizada de fabricante.

Na dúvida entre os dois, olhe se é algo que se compra pronto (industrializado) ou que a farmácia
precisa preparar (manipulado).

Para cada item devolva a categoria e um motivo CURTO (até 5 palavras, em português).
Responda APENAS com um array JSON: [{"id":N,"category":"manipulado|industrializado","reason":"..."}]
TXT;

        $res = Claude::messages([
            'max_tokens' => 3000,
            'system' => $system,
            'messages' => [[
                'role' => 'user',
                'content' => 'Classifique:'."\n".json_encode($items, JSON_UNESCAPED_UNICODE),
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
