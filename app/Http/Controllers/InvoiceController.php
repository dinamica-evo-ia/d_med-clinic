<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\TransactionCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['patient:id,name', 'category:id,name,color']);

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
                $q->whereHas('patient', fn($p) => $p->where('name', 'like', "%{$search}%"))
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json([
            'invoices' => $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString(),
            'totals' => [
                'pending' => (clone $query)->where('status', 'pending')->sum('amount'),
                'paid' => (clone $query)->where('status', 'paid')->sum('amount'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'description' => 'nullable|string|max:500',
            'category_id' => 'nullable|exists:transaction_categories,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|in:credit,debit,pix,boleto,cash,insurance',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        Invoice::create($validated);

        return redirect()->route('financeiro.dashboard', ['tab' => 'receber'])
            ->with('success', 'Conta a receber registrada com sucesso.');
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['patient:id,name,phone', 'appointment', 'doctor:id,name', 'category:id,name,color']);
        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
        ]);
    }

    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'description' => 'nullable|string|max:500',
            'category_id' => 'nullable|exists:transaction_categories,id',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'nullable|string|in:credit,debit,pix,boleto,cash,insurance',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:1000',
        ]);

        $invoice->update($validated);

        return redirect()->route('financeiro.dashboard', ['tab' => 'receber'])
            ->with('success', 'Conta atualizada com sucesso.');
    }

    public function destroy(Invoice $invoice)
    {
        $invoice->delete();

        return redirect()->route('financeiro.dashboard', ['tab' => 'receber'])
            ->with('success', 'Conta removida com sucesso.');
    }

    public function markAsPaid(Invoice $invoice)
    {
        $invoice->update([
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        return back()->with('success', 'Conta marcada como paga.');
    }

    public function cancel(Invoice $invoice)
    {
        $invoice->update(['status' => 'cancelled']);

        return back()->with('success', 'Conta cancelada.');
    }
}
