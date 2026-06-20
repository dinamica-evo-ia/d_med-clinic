<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\TransactionCategory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FinancialReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $tab = $request->get('tab', 'relatorios');

        // Summary cards
        $month = now()->month;
        $year = now()->year;

        $monthIncome = Invoice::where('status', 'paid')
            ->whereMonth('paid_at', $month)
            ->whereYear('paid_at', $year)
            ->sum('amount');

        $monthExpense = Expense::where('status', 'paid')
            ->whereMonth('paid_at', $month)
            ->whereYear('paid_at', $year)
            ->sum('amount');

        $pendingIncome = Invoice::where('status', 'pending')->sum('amount');
        $pendingExpense = Expense::where('status', 'pending')->sum('amount');

        return Inertia::render('Financial/Index', [
            'tab' => $tab,
            'summary' => [
                'balance' => $monthIncome - $monthExpense,
                'month_income' => $monthIncome,
                'month_expense' => $monthExpense,
                'pending_income' => $pendingIncome,
                'pending_expense' => $pendingExpense,
            ],
            'categories' => TransactionCategory::orderBy('type')->orderBy('name')->get(['id', 'name', 'type', 'color']),
            'patients' => Patient::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function chartData()
    {
        $year = now()->year;

        // Monthly revenue vs expenses (last 12 months)
        $monthly = [];
        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $m = $date->month;
            $y = $date->year;

            $monthly[] = [
                'month' => $date->translatedFormat('M'),
                'ano' => (string) $y,
                'receita' => (float) Invoice::where('status', 'paid')
                    ->whereMonth('paid_at', $m)->whereYear('paid_at', $y)->sum('amount'),
                'despesa' => (float) Expense::where('status', 'paid')
                    ->whereMonth('paid_at', $m)->whereYear('paid_at', $y)->sum('amount'),
            ];
        }

        // Category breakdown (current year)
        $incomeCategories = TransactionCategory::income()->withSum(['invoices' => function ($q) {
            $q->where('status', 'paid')->whereYear('paid_at', now()->year);
        }], 'amount')->get()->map(fn($c) => [
            'name' => $c->name,
            'color' => $c->color,
            'total' => (float) ($c->invoices_sum_amount ?? 0),
        ])->filter(fn($c) => $c['total'] > 0)->values();

        $expenseCategories = TransactionCategory::expense()->withSum(['expenses' => function ($q) {
            $q->where('status', 'paid')->whereYear('paid_at', now()->year);
        }], 'amount')->get()->map(fn($c) => [
            'name' => $c->name,
            'color' => $c->color,
            'total' => (float) ($c->expenses_sum_amount ?? 0),
        ])->filter(fn($c) => $c['total'] > 0)->values();

        return response()->json([
            'monthly' => $monthly,
            'incomeByCategory' => $incomeCategories,
            'expenseByCategory' => $expenseCategories,
        ]);
    }
}
