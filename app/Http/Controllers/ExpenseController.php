<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $query = Expense::with(['category:id,name,color']);

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($month = $request->get('month')) {
            $query->whereMonth('due_date', $month);
        }

        if ($category = $request->get('category_id')) {
            $query->where('category_id', $category);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('supplier', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'expenses' => $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString(),
            'totals' => [
                'pending' => (clone $query)->where('status', 'pending')->sum('amount'),
                'paid' => (clone $query)->where('status', 'paid')->sum('amount'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'category_id' => 'nullable|exists:transaction_categories,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|in:credit,debit,pix,boleto,cash',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        Expense::create($validated);

        return redirect()->route('financeiro.dashboard', ['tab' => 'pagar'])
            ->with('success', 'Conta a pagar registrada com sucesso.');
    }

    public function update(Request $request, Expense $expense)
    {
        $validated = $request->validate([
            'supplier' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:500',
            'category_id' => 'nullable|exists:transaction_categories,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|in:credit,debit,pix,boleto,cash',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $expense->update($validated);

        return redirect()->route('financeiro.dashboard', ['tab' => 'pagar'])
            ->with('success', 'Conta atualizada com sucesso.');
    }

    public function destroy(Expense $expense)
    {
        $expense->delete();

        return redirect()->route('financeiro.dashboard', ['tab' => 'pagar'])
            ->with('success', 'Conta removida com sucesso.');
    }

    public function markAsPaid(Expense $expense)
    {
        $expense->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return back()->with('success', 'Conta marcada como paga.');
    }

    public function cancel(Expense $expense)
    {
        $expense->update(['status' => 'cancelled']);

        return back()->with('success', 'Conta cancelada.');
    }
}
