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

        return Inertia::render('Formulas/Index', [
            'formulas' => Formula::search($search)->orderBy('name')->paginate(30)->withQueryString(),
            'filters' => ['search' => $search],
            'total' => Formula::count(),
        ]);
    }

    /** Busca JSON — usada pelo painel de fórmulas dentro do formulário de receita. */
    public function apiSearch(Request $request)
    {
        return response()->json(
            Formula::search((string) $request->query('q', ''))
                ->orderBy('name')->limit(40)
                ->get(['id', 'name', 'content', 'form', 'route'])
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
            'content' => 'required|string',
            'form' => 'nullable|string|max:80',
            'route' => 'nullable|string|max:80',
        ]);
    }
}
