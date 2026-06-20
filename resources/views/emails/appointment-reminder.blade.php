<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .body { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .info { margin-bottom: 16px; }
        .info strong { display: inline-block; width: 120px; }
        .footer { text-align: center; padding: 16px; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>MedHealth Clínica</h2>
            <p>Lembrete de Consulta</p>
        </div>
        <div class="body">
            <p>Olá <strong>{{ $appointment->patient->name }}</strong>,</p>
            <p>Este é um lembrete da sua consulta agendada:</p>
            <div class="info">
                <p><strong>Data:</strong> {{ \Carbon\Carbon::parse($appointment->starts_at)->format('d/m/Y') }}</p>
                <p><strong>Horário:</strong> {{ \Carbon\Carbon::parse($appointment->starts_at)->format('H:i') }}</p>
                <p><strong>Médico:</strong> {{ $appointment->doctor->name }}</p>
                @if($appointment->notes)
                    <p><strong>Observações:</strong> {{ $appointment->notes }}</p>
                @endif
            </div>
            <p>Por favor, chegue com 15 minutos de antecedência.</p>
            <p>Em caso de imprevistos, entre em contato para remarcar.</p>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} MedHealth Clínica. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
