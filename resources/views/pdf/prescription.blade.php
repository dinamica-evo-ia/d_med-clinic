<!DOCTYPE html>
<html lang="pt-BR">
{{-- PDF da Receita Médica (baixar/enviar ao WhatsApp do paciente).
     Renderizado pelo dompdf: CSS simples, tabelas no lugar de flex. O tamanho do papel
     (A5 paisagem padrão | A4 retrato) é definido no controller via setPaper() a partir de
     PrintSettings::paperFor(). O cabeçalho reusa o modelo de impressão do médico (print_settings).
     A área de assinatura já está montada nos dois modos — hoje sai a linha de caneta;
     quando a assinatura digital (ICP-Brasil/VIDaaS) entrar, é só passar $assinaturaDigital. --}}
<head>
<meta charset="utf-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: DejaVu Sans, sans-serif; color: #1f2937; padding: 4px 6px;
           font-size: {{ $compact ? '10px' : '12px' }}; }
    table { width: 100%; border-collapse: collapse; }

    .header td { vertical-align: top; }
    .doc-nome { font-size: {{ $compact ? '13px' : '15px' }}; font-weight: bold; color: #111827; }
    .doc-sub { color: #475569; line-height: 1.35; }
    .logo { max-height: {{ $compact ? '46px' : '58px' }}; max-width: 150px; }
    .rule { border-bottom: 1.5px solid #1f2937; margin: 6px 0 8px; }

    .titlebar td { vertical-align: baseline; }
    .titulo { font-size: {{ $compact ? '13px' : '15px' }}; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
    .tarja { font-size: {{ $compact ? '9px' : '10px' }}; color: #b45309; font-weight: bold; }
    .data { font-size: {{ $compact ? '10px' : '11px' }}; color: #475569; text-align: right; }

    .paciente { border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 9px; margin: 8px 0;
                font-size: {{ $compact ? '10px' : '11px' }}; line-height: 1.5; }
    .paciente strong { color: #111827; }

    .presc-label { font-weight: bold; margin-bottom: 6px; }
    .med { margin-bottom: {{ $compact ? '7px' : '10px' }}; }
    .med .l1 { font-weight: bold; }
    .med .det { margin-left: 14px; color: #374151; font-size: {{ $compact ? '9.5px' : '11px' }}; }
    .body-livre { white-space: pre-wrap; line-height: 1.5; }
    .obs { font-style: italic; margin-top: 6px; }

    .sig-caneta { margin-top: {{ $compact ? '22px' : '46px' }}; }
    .sig-caneta .box { width: 260px; margin-left: auto; text-align: center; }
    .sig-caneta .linha { border-top: 1px solid #64748b; padding-top: 3px; font-size: {{ $compact ? '10.5px' : '12px' }}; }
    .sig-caneta .conselho { font-size: {{ $compact ? '9.5px' : '10.5px' }}; color: #64748b; }

    .sig-digital { margin-top: 12px; }
    .sig-digital .wrap { border: 1px solid #86efac; background: #f0fdf4; border-radius: 6px; padding: 7px 9px; }
    .sig-digital .qr { width: 66px; vertical-align: middle; }
    .sig-digital .qr img { width: 62px; height: 62px; }
    .sig-digital .txt { vertical-align: middle; font-size: 9px; color: #166534; line-height: 1.45; padding-left: 8px; }
    .sig-digital .txt .s { font-weight: bold; color: #14532d; font-size: 10px; }
    .sig-digital .txt .val { color: #15803d; }

    .footer { margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 5px;
              text-align: center; font-size: {{ $compact ? '8px' : '9px' }}; color: #9ca3af; line-height: 1.4; }
</style>
</head>
<body>

    {{-- cabeçalho do médico --}}
    @if ($h['show_header'])
        <table class="header">
            <tr>
                @if ($logoAbs && !empty($h['logo_left']))
                    <td style="width: 120px;"><img class="logo" src="{{ $logoAbs }}" alt=""></td>
                @endif
                <td>
                    <div class="doc-nome">{{ trim(($prefixo ? $prefixo.' ' : '').($h['name'] ?: $doctorName)) }}</div>
                    <div class="doc-sub">
                        {{ collect([$h['specialty'], $h['rqe'] ? 'RQE: '.$h['rqe'] : null, $h['council_number'] ? ($h['council'] ?? 'CRM').': '.$h['council_number'] : null])->filter()->implode(' · ') }}
                    </div>
                    <div class="doc-sub">
                        {{ collect([$h['cpf'] ? 'CPF: '.$h['cpf'] : null, $h['phones']])->filter()->implode(' · ') }}
                    </div>
                    @if ($endereco)<div class="doc-sub">{{ $endereco }}</div>@endif
                </td>
                @if ($logoAbs && !empty($h['logo_right']))
                    <td style="width: 120px; text-align: right;"><img class="logo" src="{{ $logoAbs }}" alt=""></td>
                @endif
            </tr>
        </table>
    @endif
    <div class="rule"></div>

    {{-- título + tarja + data --}}
    <table class="titlebar">
        <tr>
            <td>
                @if ($showTitle)<span class="titulo">{{ $title }}</span>@endif
                @if (!empty($controlEspecial))<span class="tarja">&nbsp;&nbsp;Controle Especial — Portaria 344/98</span>@endif
            </td>
            <td class="data">{{ $cidadeData }}</td>
        </tr>
    </table>

    {{-- dados do paciente --}}
    @if ($patientEnabled)
        <div class="paciente">
            {!! collect([
                $pf['nome'] ? '<strong>Paciente:</strong> '.e($patient['name'] ?: '—') : null,
                $pf['cpf'] ? '<strong>CPF:</strong> '.e($patient['document'] ?: '—') : null,
                $pf['rg'] ? '<strong>RG:</strong> '.e($patient['rg'] ?: '—') : null,
                $pf['prontuario'] ? '<strong>Nº Prontuário:</strong> '.e($patient['prontuario'] ?: '—') : null,
                $pf['contato'] ? '<strong>Contato:</strong> '.e($patient['contato'] ?: '—') : null,
            ])->filter()->implode(' &nbsp;·&nbsp; ') !!}
            @if ($pf['endereco'] && $patient['endereco'])
                <br><strong>Endereço:</strong> {{ $patient['endereco'] }}
            @endif
        </div>
    @endif

    {{-- corpo da receita --}}
    @if ($bodyLivre)
        <div class="presc-label">{{ $prescTitle ?: 'Prescrição:' }}</div>
        <div class="body-livre">{{ $bodyLivre }}</div>
    @else
        <div class="presc-label">Prescrevo o(s) seguinte(s) medicamento(s):</div>
        @foreach ($medicines as $i => $m)
            <div class="med">
                <div class="l1">{{ $i + 1 }}. {{ $m['medication'] ?? '' }}@if(!empty($m['dosage'])) — {{ $m['dosage'] }}@endif</div>
                @php
                    $det = collect([
                        !empty($m['route']) ? 'Via: '.$m['route'] : null,
                        !empty($m['frequency']) ? 'Frequência: '.$m['frequency'] : null,
                        !empty($m['duration']) ? 'Duração: '.$m['duration'] : null,
                        !empty($m['quantity']) ? 'Quantidade: '.$m['quantity'] : null,
                    ])->filter()->implode(' · ');
                @endphp
                @if ($det)<div class="det">{{ $det }}</div>@endif
                @if (!empty($m['notes']))<div class="det">Obs: {{ $m['notes'] }}</div>@endif
            </div>
        @endforeach
    @endif

    @if ($notes)<div class="obs"><strong>Observações:</strong> {{ $notes }}</div>@endif

    {{-- assinatura --}}
    @if (!empty($assinaturaDigital))
        <div class="sig-digital">
            <div class="wrap">
                <table><tr>
                    <td class="qr"><img src="{{ $assinaturaDigital['qr'] }}" alt=""></td>
                    <td class="txt">
                        <div class="s">Assinado digitalmente — ICP-Brasil</div>
                        <div>{{ $assinaturaDigital['nome'] }}</div>
                        <div class="val">Validar: {{ $assinaturaDigital['url'] }}</div>
                        <div style="color:#64748b">Confira também em validar.iti.gov.br</div>
                    </td>
                </tr></table>
            </div>
        </div>
    @elseif ($signature)
        <div class="sig-caneta">
            <div class="box">
                <div class="linha">{{ trim(($prefixo ? $prefixo.' ' : '').($h['name'] ?: $doctorName)) }}</div>
                @if (!empty($h['council_number']))<div class="conselho">{{ ($h['council'] ?? 'CRM').': '.$h['council_number'] }}</div>@endif
            </div>
        </div>
    @endif

    {{-- rodapé --}}
    @if ($footerText)
        <div class="footer">{{ $footerText }}</div>
    @endif

</body>
</html>
