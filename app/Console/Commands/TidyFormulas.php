<?php

namespace App\Console\Commands;

use App\Models\Formula;
use App\Models\Tenant;
use App\Support\Claude;
use Illuminate\Console\Command;

/*
 * Limpeza da biblioteca de fórmulas magistrais de um tenant.
 * As fórmulas semeadas do CSV vieram com nome-lixo (a linha "USO ORAL:/IM:..." virou nome),
 * texto grudado (nbsp) e PII embutido (nome/CPF/endereço de paciente e do médico, CID).
 * Este comando usa o Claude pra reconstruir: nome = princípios ativos + concentração,
 * conteúdo limpo e SEM dados pessoais, mantém a finalidade, e depois deduplica exatos.
 *
 * Uso: php artisan formulas:tidy <tenantId> [--dry] [--batch=8]
 */
class TidyFormulas extends Command
{
    protected $signature = 'formulas:tidy {tenant} {--dry : Só mostra, não salva} {--batch=8 : Fórmulas por chamada}';

    protected $description = 'Reconstrói nomes/conteúdo das fórmulas magistrais via IA, remove PII e deduplica';

    public function handle(): int
    {
        $tenant = Tenant::find($this->argument('tenant'));
        if (! $tenant) {
            $this->error('Tenant não encontrado.');
            return 1;
        }
        if (! Claude::configured()) {
            $this->error('Claude não configurado (services.anthropic.key).');
            return 1;
        }

        tenancy()->initialize($tenant);

        $formulas = Formula::orderBy('id')->get();
        $this->info("Fórmulas: {$formulas->count()}");
        $dry = (bool) $this->option('dry');
        $batchSize = max(1, (int) $this->option('batch'));

        $updated = 0;
        foreach ($formulas->chunk($batchSize) as $chunk) {
            $payload = $chunk->map(fn ($f) => [
                'id' => $f->id,
                'raw_name' => $f->name,
                'raw_content' => $f->content,
                'purpose_atual' => $f->purpose,
            ])->values();

            try {
                $clean = $this->cleanBatch($payload->all());
            } catch (\Throwable $e) {
                $this->warn('  batch falhou ('.$e->getMessage().') — mantendo original');
                continue;
            }

            $byId = collect($clean)->keyBy('id');
            foreach ($chunk as $f) {
                $c = $byId->get($f->id);
                if (! $c) {
                    continue;
                }
                $name = trim($c['name'] ?? '') ?: $f->name;
                $content = trim($c['content'] ?? '') ?: $f->content;
                $purpose = trim($c['purpose'] ?? '') ?: $f->purpose;
                $form = trim($c['form'] ?? '') ?: null;
                $route = trim($c['route'] ?? '') ?: null;

                if ($dry) {
                    $this->line("  #{$f->id}  <fg=yellow>{$f->name}</>  →  <fg=green>{$name}</>  [{$purpose}]");
                } else {
                    $f->update(compact('name', 'content', 'purpose', 'form', 'route'));
                }
                $updated++;
            }
            $this->line('  '.($dry ? 'analisadas' : 'atualizadas').": {$updated}");
        }

        // Dedup exato (mesmo nome normalizado + mesmo conteúdo) — mantém o menor id
        $removed = 0;
        if (! $dry) {
            $seen = [];
            foreach (Formula::orderBy('id')->get() as $f) {
                $key = mb_strtolower(trim($f->name)).'||'.trim($f->content);
                if (isset($seen[$key])) {
                    $f->delete();
                    $removed++;
                } else {
                    $seen[$key] = $f->id;
                }
            }
        }

        $this->info(($dry ? '[DRY] ' : '')."Concluído. Atualizadas: {$updated} · Removidas (dup): {$removed} · Total final: ".Formula::count());
        tenancy()->end();

        return 0;
    }

    private function cleanBatch(array $items): array
    {
        $system = <<<'TXT'
Você organiza a biblioteca de fórmulas magistrais (manipulados) de um médico brasileiro.
Recebe entradas CRUAS extraídas de receitas: texto bagunçado, com nbsp, palavras grudadas
(ex.: "MGAPLICAR", "CPSTOMAR"), prefixo "USO ORAL:/USO IM:/USO SC:/USO EXTERNO:", e às vezes
DADOS PESSOAIS. Para cada entrada devolva a fórmula limpa.

REGRAS:
1. name: princípios ativos + concentrações, curto e legível. SEM "USO ORAL:", sem posologia,
   sem nº de caixas. Ex.: "Tadalafila 5mg + Testosterona 5mg", "Mounjaro 2,5mg",
   "Vitamina D3 5000UI + Metilcobalamina 1mg". Title Case.
2. content: composição legível — cada ativo com sua concentração; depois quantidade e o modo
   de usar (posologia). Corrija espaços e quebras de linha. Uma informação por linha.
3. REMOVA todo dado pessoal: nome de paciente, CPF, RG, endereço, telefone, CID, e os dados do
   médico (nome, CRM, CPF, endereço, telefone). NADA disso pode sobrar no name nem no content.
4. purpose: finalidade curta ("pra que serve"). Se "purpose_atual" já for boa, mantenha.
5. form: forma farmacêutica (comprimido, cápsula, creme, ampola, solução, sachê…) ou "".
6. route: via (Oral, Subcutânea, Intramuscular, Tópico/Externo, Sublingual, Endovenosa…) ou "".

Responda APENAS com um array JSON: [{"id":N,"name":"","content":"","purpose":"","form":"","route":""}]
Sem comentários, sem texto fora do JSON.
TXT;

        $res = Claude::messages([
            'max_tokens' => 4096,
            'system' => $system,
            'messages' => [[
                'role' => 'user',
                'content' => 'Limpe estas fórmulas:'."\n".json_encode($items, JSON_UNESCAPED_UNICODE),
            ]],
        ]);

        $text = '';
        foreach ($res['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $text .= $block['text'];
            }
        }
        // tira cercas de código se houver
        $text = trim(preg_replace('/^```(json)?|```$/m', '', $text));
        $start = strpos($text, '[');
        $end = strrpos($text, ']');
        if ($start === false || $end === false) {
            throw new \RuntimeException('sem JSON no retorno');
        }
        $json = json_decode(substr($text, $start, $end - $start + 1), true);
        if (! is_array($json)) {
            throw new \RuntimeException('JSON inválido');
        }

        return $json;
    }
}
