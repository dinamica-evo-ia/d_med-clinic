<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index()
    {
        return Inertia::render('Reports/Index');
    }

    public function exportPatients(Request $request)
    {
        $search = $request->get('search');
        $query = Patient::query()->orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $patients = $query->get();
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="pacientes.csv"',
        ];

        $callback = function () use ($patients) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Nome', 'Email', 'Telefone', 'CPF', 'Data Nascimento', 'Gênero', 'Cadastro']);

            foreach ($patients as $p) {
                fputcsv($handle, [
                    $p->name,
                    $p->email,
                    $p->phone,
                    $p->document,
                    $p->birth_date?->format('d/m/Y'),
                    $p->gender === 'male' ? 'Masculino' : ($p->gender === 'female' ? 'Feminino' : ''),
                    $p->created_at?->format('d/m/Y'),
                ]);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportAppointments(Request $request)
    {
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $query = Appointment::with(['patient:id,name', 'doctor:id,name'])
            ->orderBy('starts_at');

        if ($dateFrom) $query->whereDate('starts_at', '>=', $dateFrom);
        if ($dateTo) $query->whereDate('starts_at', '<=', $dateTo);

        $appointments = $query->get();
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="consultas.csv"',
        ];

        $callback = function () use ($appointments) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Paciente', 'Médico', 'Data', 'Horário', 'Tipo', 'Status']);

            foreach ($appointments as $a) {
                fputcsv($handle, [
                    $a->patient?->name,
                    $a->doctor?->name,
                    $a->starts_at?->format('d/m/Y'),
                    $a->starts_at?->format('H:i'),
                    $a->type,
                    $a->status,
                ]);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportFinancial(Request $request)
    {
        $dateFrom = $request->get('date_from');
        $dateTo = $request->get('date_to');

        $query = Invoice::with('patient:id,name')
            ->orderBy('due_date');

        if ($dateFrom) $query->whereDate('due_date', '>=', $dateFrom);
        if ($dateTo) $query->whereDate('due_date', '<=', $dateTo);

        $invoices = $query->get();
        $headers = [
            'Content-Type' => 'text/csv; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="financeiro.csv"',
        ];

        $callback = function () use ($invoices) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Paciente', 'Descrição', 'Valor', 'Vencimento', 'Pagamento', 'Status']);

            foreach ($invoices as $inv) {
                fputcsv($handle, [
                    $inv->patient?->name,
                    $inv->description,
                    number_format($inv->amount, 2, ',', '.'),
                    $inv->due_date?->format('d/m/Y'),
                    $inv->paid_at?->format('d/m/Y'),
                    $inv->status === 'paid' ? 'Pago' : ($inv->status === 'cancelled' ? 'Cancelado' : 'Pendente'),
                ]);
            }
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
