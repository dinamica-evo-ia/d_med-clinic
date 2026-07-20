<?php

namespace App\Http\Controllers;

use App\Models\Formula;
use Illuminate\Http\Request;
use Inertia\Inertia;

/*
 * Biblioteca de fórmulas magistrais (manipulados). O médico busca, escolhe e insere na
 * receita. Acesso clínico (admin/doctor). Ver docs/MODULO_PRONTUARIO.md.
 */
class FormulaController extends Controller
{
    public function index(Request $request)
    {
        $search = (string) $request->query('search', '');
        $category = in_array($request->query('category'), ['manipulado', 'industrializado'], true) ? $request->query('category') : null;

        return Inertia::render('Formulas/Index', [
            'formulas' => Formula::when($category, fn ($q) => $q->where('category', $category))
                ->search($search)->orderBy('name')->paginate(30)->withQueryString(),
            'filters' => ['search' => $search, 'category' => $category],
            'counts' => [
                'manipulado' => Formula::where('category', 'manipulado')->count(),
                'industrializado' => Formula::where('category', 'industrializado')->count(),
            ],
            'total' => Formula::count(),
        ]);
    }

    /** Busca JSON — usada pelo painel de fórmulas dentro do formulário de receita. */
    public function apiSearch(Request $request)
    {
        $category = $request->query('category') === 'industrializado' ? 'industrializado' : 'manipulado';

        return response()->json(
            Formula::where('category', $category)
                ->search((string) $request->query('q', ''))
                ->orderByRaw('purpose is null, purpose')->orderBy('name')->limit(40)
                ->get(['id', 'name', 'purpose', 'content', 'form', 'route', 'category'])
        );
    }

    public function store(Request $request)
    {
        Formula::create($this->validated($request) + ['is_active' => true]);

        return back()->with('success', 'Fórmula adicionada à biblioteca.');
    }

    public function update(Request $request, Formula $formula)
    {
        $formula->update($this->validated($request));

        return back()->with('success', 'Fórmula atualizada.');
    }

    public function destroy(Formula $formula)
    {
        $formula->delete();

        return back()->with('success', 'Fórmula removida.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'purpose' => 'nullable|string|max:255',
            'content' => 'required|string',
            'form' => 'nullable|string|max:80',
            'route' => 'nullable|string|max:80',
            // Obrigatório: é o que separa a biblioteca em duas e o que a receita usa pra
            // saber com o que está lidando. Deixar cair no default 'manipulado' classificaria
            // industrializado errado sem ninguém perceber.
            'category' => 'required|in:manipulado,industrializado',
        ], [
            'category.required' => 'Escolha se é Manipulado ou Industrializado.',
            'category.in' => 'Escolha se é Manipulado ou Industrializado.',
        ]);
    }
}
