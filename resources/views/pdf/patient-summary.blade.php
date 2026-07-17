<!DOCTYPE html>
<html lang="pt-BR">
{{-- PDF do Resumo da Consulta enviado ao WhatsApp do paciente.
     Renderizado pelo dompdf: CSS simples, tabelas no lugar de flex. O cabeçalho
     reusa o modelo de impressão do médico (print_settings) + dados da clínica. --}}
<head>
<meta charset="utf-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; padding: 28px 34px; }
    table { width: 100%; border-collapse: collapse; }
    .header td { vertical-align: middle; padding-bottom: 10px; }
    .logo { max-height: 58px; max-width: 150px; }
    .clinic-name { font-size: 15px; font-weight: bold; color: #111827; }
    .clinic-sub { font-size: 9px; color: #6b7280; margin-top: 2px; }
    .rule { border-bottom: 2px solid #1f2937; margin-bottom: 14px; }
    h1 { font-size: 17px; color: #111827; margin-bottom: 2px; }
    .subtitle { font-size: 9.5px; color: #6b7280; margin-bottom: 14px; }
    .meta td { padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
    .meta .label { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; }
    .meta .value { font-size: 12px; font-weight: bold; color: #111827; margin-top: 1px; }
    .section { margin-top: 16px; }
    .section h2 { font-size: 9px; text-transform: uppercase; letter-spacing: 1.2px; color: #6b7280; margin-bottom: 6px; }
    .section .text { font-size: 11.5px; line-height: 1.55; color: #1f2937; }
    .alertas { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 12px; }
    .alertas h2 { color: #92400e; }
    .alertas li { margin-left: 14px; margin-bottom: 3px; font-size: 11px; }
    .footer { margin-top: 26px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 8.5px; color: #9ca3af; text-align: center; line-height: 1.5; }
</style>
</head>
<body>

    <table class="header">
        <tr>
            @if (!empty($logoAbs))
                <td style="width: 160px;"><img class="logo" src="{{ $logoAbs }}" alt=""></td>
            @endif
            <td>
                <div class="clinic-name">{{ $clinicName }}</div>
                @if (!empty($medicoNome))
                    <div class="clinic-sub">{{ trim(($medicoPrefixo ? $medicoPrefixo.' ' : '').$medicoNome) }}{{ $medicoEspecialidade ? ' · '.$medicoEspecialidade : '' }}</div>
                @endif
                @if (!empty($clinicEndereco))
                    <div class="clinic-sub">{{ $clinicEndereco }}</div>
                @endif
                @if (!empty($clinicFone))
                    <div class="clinic-sub">{{ $clinicFone }}</div>
                @endif
            </td>
            <td style="text-align: right; font-size: 9px; color: #6b7280;">
                {{ $dataConsulta }}<br>{{ $horaConsulta }}
            </td>
        </tr>
    </table>
    <div class="rule"></div>

    <h1>Resumo da Consulta</h1>
    <div class="subtitle">Para o paciente e familiares</div>

    <table class="meta">
        <tr>
            <td style="width: 50%;">
                <div class="label">Paciente</div>
                <div class="value">{{ $pacienteNome }}@if($pacienteIdade !== null) <span style="font-weight: normal; font-size: 10px; color: #6b7280;">— {{ $pacienteIdade }} anos</span>@endif</div>
            </td>
            <td>
                <div class="label">Médico(a)</div>
                <div class="value">{{ $medicoNome ?: '—' }}</div>
            </td>
        </tr>
    </table>

    <div class="section">
        <h2>O que foi conversado</h2>
        <div class="text">{!! nl2br(e($resumo)) !!}</div>
    </div>

    @if (count($alertas))
        <div class="section alertas">
            <h2>Pontos de atenção</h2>
            <ul>
                @foreach ($alertas as $a)
                    <li>{{ $a }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    @if (!empty($conduta))
        <div class="section">
            <h2>Orientações e conduta</h2>
            <div class="text">{!! nl2br(e($conduta)) !!}</div>
        </div>
    @endif

    <div class="footer">
        Documento informativo gerado pela clínica para o paciente — não substitui receita, atestado ou laudo.<br>
        {{ $clinicName }}{{ $clinicFone ? ' · '.$clinicFone : '' }}
    </div>

</body>
</html>
