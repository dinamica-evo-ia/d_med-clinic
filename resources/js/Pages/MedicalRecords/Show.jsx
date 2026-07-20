import { Link } from '@inertiajs/react';
import { useState } from 'react';

// Labels PT-BR para as chaves do JSON `anamnesis` (que o Studio Med do EVO
// preenche com hda/medicines/allergies/...). Chaves não listadas caem no
// fallback — key humanizada.
const ANAMNESE_LABELS = {
  hda: 'Queixa principal e história da doença atual',
  antecedentes_pessoais: 'Antecedentes pessoais',
  family_history: 'Antecedentes familiares',
  medicines: 'Medicamentos em uso',
  allergies: 'Alergias',
  habitos_de_vida: 'Hábitos de vida',
  revisao_de_sistemas: 'Revisão de sistemas',
  hipoteses_diagnosticas: 'Hipóteses diagnósticas',
  conduta: 'Conduta',
  anamnese_importada: 'Anamnese (importada do sistema anterior)',
};
const CHAVES_META = new Set(['resumo', 'alertas', '_terceira_voz_alerta', '_template_nome', '_identificacao_por_voz', '_anamnese_falhou']); // meta, exibidas à parte

// Fase 2: campos "<key>_fontes" são metadados de rastreabilidade — não são exibidos como campos.
const isFonteMeta = (k) => k.endsWith('_fontes');

export default function Show({ patient, record, pdfModeloConfigurado = true }) {
    const isStudio = record.origem === 'studio_med';
    const transcricao = Array.isArray(record.transcricao) ? record.transcricao : [];
    const anamnesis = record.anamnesis && typeof record.anamnesis === 'object' ? record.anamnesis : null;
    const resumo = anamnesis?.resumo?.trim() || null;
    const alertas = Array.isArray(anamnesis?.alertas) ? anamnesis.alertas.filter(Boolean) : [];
    const acompanhante = record.acompanhante_snapshot && typeof record.acompanhante_snapshot === 'object'
        ? record.acompanhante_snapshot : null;
    const terceiraVozAlerta = !!anamnesis?._terceira_voz_alerta;
    const identificacaoPorVoz = !!anamnesis?._identificacao_por_voz;
    const anamneseFalhou = !!anamnesis?._anamnese_falhou;
    const templateNome = anamnesis?._template_nome || null;

    // Envio do resumo em PDF pro WhatsApp do paciente
    const [envioResumo, setEnvioResumo] = useState('idle'); // idle | enviando | enviado
    const [erroEnvio, setErroEnvio] = useState(null);

    function enviarResumo() {
        if (envioResumo === 'enviando') return;
        const tel = patient.whatsapp || patient.phone;
        if (!tel) {
            setErroEnvio('O paciente não tem WhatsApp/telefone no cadastro.');
            return;
        }
        if (!window.confirm(`Enviar o resumo em PDF para o WhatsApp do paciente (${tel})?`)) return;
        setEnvioResumo('enviando');
        setErroEnvio(null);
        window.axios
            .post(`/patients/${patient.id}/records/${record.id}/enviar-resumo`)
            .then(() => setEnvioResumo('enviado'))
            .catch((e) => {
                setEnvioResumo('idle');
                setErroEnvio(e?.response?.data?.error || 'Falha ao enviar. Tente de novo.');
            });
    }

    // N1 — turnos sociais colapsados por padrão (transcrição nunca é apagada)
    const [showSocial, setShowSocial] = useState(false);
    const socialCount = transcricao.filter((t) => t.tipo === 'social').length;

    // N2 — prescrições que a IA extraiu da fala do médico (rascunho)
    const prescricoesIa = (record.prescriptions || []).filter((p) => p.ai_suggested);

    // Mapa de labels: prioriza o snapshot do template usado nessa consulta
    // (garante que gravações antigas continuam legíveis, e as novas usam o template escolhido)
    const snapshotLabels = Array.isArray(record.anamnese_template_snapshot)
        ? Object.fromEntries(record.anamnese_template_snapshot.map((f) => [f.key, f.label]))
        : {};

    // campos "principais" da anamnese (fora resumo/alertas/_fontes)
    // Cada entrada: [label, valor, fontes[]] — fontes vem de anamnesis[key + '_fontes']
    const camposAnamnese = anamnesis
        ? Object.entries(anamnesis)
              .filter(([k, v]) => !CHAVES_META.has(k) && !isFonteMeta(k) && v !== null && v !== undefined && String(v).trim() !== '')
              .map(([k, v]) => {
                  const fontes = Array.isArray(anamnesis[`${k}_fontes`]) ? anamnesis[`${k}_fontes`] : [];
                  return [snapshotLabels[k] || ANAMNESE_LABELS[k] || humanize(k), v, fontes, k];
              })
        : [];

    return (
        <div>
            <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <Link href={`/patients/${patient.id}/records`} className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar ao prontuário</Link>
                    <h1 className="text-2xl font-bold text-gray-900">Prontuário - {patient.name}</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {new Date(record.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })} - {record.doctor?.name}
                        {isStudio && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                                🎙️ Studio Med
                            </span>
                        )}
                    </p>
                    {templateNome && (
                        <p className="text-xs text-gray-400 mt-0.5">Modelo de anamnese: <span className="font-medium text-gray-600">{templateNome}</span></p>
                    )}
                </div>
                {resumo && (
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={enviarResumo}
                            disabled={envioResumo === 'enviando'}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg ${
                                envioResumo === 'enviado'
                                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60'
                            }`}
                            title="Gera o PDF do resumo e envia pro WhatsApp do paciente"
                        >
                            {envioResumo === 'enviando' ? '⏳ Enviando…'
                                : envioResumo === 'enviado' ? '✓ Resumo enviado no WhatsApp'
                                : '📤 Enviar Resumo ao Paciente'}
                        </button>
                        <div className="flex items-center gap-3">
                            {!pdfModeloConfigurado && (
                                <Link href="/account/settings/print" className="text-xs font-semibold text-amber-700 hover:text-amber-900">
                                    ⚙️ Configurar modelo de PDF
                                </Link>
                            )}
                            <a
                                href={`/patients/${patient.id}/records/${record.id}/patient-summary`}
                                target="_blank"
                                rel="noopener"
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                🖨️ Imprimir
                            </a>
                        </div>
                        {erroEnvio && (
                            <p className="text-xs text-rose-600 max-w-xs text-right">{erroEnvio}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Camada 5: alerta se EVO detectou 3+ vozes sem acompanhante informado */}
            {terceiraVozAlerta && !acompanhante && (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900 mb-1">⚠ Detectamos uma 3ª voz nesta gravação</p>
                    <p className="text-sm text-amber-800">
                        Nenhum acompanhante foi informado antes da gravação, mas a IA identificou 3+ vozes distintas.
                        Se houver um acompanhante nesta consulta, revise a anamnese com atenção — parte do que foi
                        atribuído ao paciente pode ter sido dito por outra pessoa.
                    </p>
                    <p className="text-xs text-amber-700 mt-2 italic">
                        Dica: da próxima vez, marque <strong>"Há acompanhante nesta consulta?"</strong> no Studio Med
                        antes de gravar — a IA separa as vozes com mais precisão.
                    </p>
                </div>
            )}

            {/* Card do Acompanhante — se houver */}
            {acompanhante && (
                <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-200 text-purple-800 grid place-items-center text-sm font-semibold">👥</div>
                    <div className="text-sm text-purple-900">
                        <span className="font-semibold">{acompanhante.nome}</span>
                        <span className="text-purple-700"> · {acompanhante.vinculo}</span>
                        <span className="ml-2 text-xs text-purple-600 italic">acompanhou esta consulta</span>
                    </div>
                </div>
            )}

            {/* Alertas clínicos (topo, se houver) */}
            {alertas.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="mb-1 text-sm font-semibold text-amber-800">⚠ Pontos de atenção</p>
                    <ul className="list-disc pl-5 text-sm text-amber-800">
                        {alertas.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                </div>
            )}

            {/* N2 — Prescrições identificadas pela IA na fala do médico (rascunho) */}
            {prescricoesIa.length > 0 && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-sm font-semibold text-blue-900 mb-2">
                                💊 A IA identificou {prescricoesIa.length} medicamento(s) prescritos na consulta
                            </p>
                            <ul className="space-y-1">
                                {prescricoesIa.map((p, i) => (
                                    <li key={i} className="text-sm text-blue-900 flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{p.medication}</span>
                                        {p.frequency && <span className="text-blue-700">· {p.frequency}</span>}
                                        {p.duration && <span className="text-blue-700">· {p.duration}</span>}
                                        {!p.frequency && <span className="text-amber-700 text-xs italic">(posologia não verbalizada)</span>}
                                        <ConfiancaBadge confianca={p.confianca} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="shrink-0">
                            <Link
                                href={`/prescriptions/create?patient_id=${patient.id}&from_record=${record.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
                            >
                                Revisar e emitir receita →
                            </Link>
                            <p className="text-[11px] text-blue-700 mt-1 text-center">Nada é emitido sem sua revisão.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {/* Degradação: transcrição preservada, anamnese não gerada pela IA */}
                {anamneseFalhou && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <p className="font-semibold text-amber-900">⚠️ A IA não conseguiu gerar o resumo e a anamnese desta consulta</p>
                        <p className="mt-1 text-sm text-amber-800">
                            A transcrição foi preservada integralmente logo abaixo — <strong>nada do que foi dito se perdeu</strong>.
                            Os campos da anamnese ficaram em branco: preencha manualmente a partir da transcrição.
                        </p>
                    </div>
                )}

                {/* 1) TRANSCRIÇÃO — protagonista no topo pra consultas gravadas */}
                {isStudio && transcricao.length > 0 && (
                    <SOAPSection title="Transcrição da consulta" icon="🎙️" subtitle="O que foi dito, palavra por palavra — base de tudo que a IA gerou abaixo.">
                        {identificacaoPorVoz && (
                            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-medium text-teal-700">
                                🎤 Médico identificado por biometria de voz
                            </div>
                        )}
                        {socialCount > 0 && (
                            <div className="mb-3 flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                                <p className="text-xs text-gray-500">
                                    A IA identificou <strong>{socialCount}</strong> turno(s) de conversa paralela (não-clínica).
                                    Foram ignorados no resumo e na anamnese — mas nada foi apagado.
                                </p>
                                <button type="button" onClick={() => setShowSocial((v) => !v)}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 ml-3">
                                    {showSocial ? 'ocultar' : 'mostrar'}
                                </button>
                            </div>
                        )}
                        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-2 text-sm leading-relaxed">
                            {transcricao.map((t, i) => {
                                const isSocial = t.tipo === 'social';
                                const isAdmin = t.tipo === 'administrativo';

                                if (isSocial && !showSocial) {
                                    // colapsa runs contíguos num único marcador discreto
                                    const prevSocial = i > 0 && transcricao[i - 1].tipo === 'social';
                                    if (prevSocial) return null;
                                    let run = 0;
                                    for (let j = i; j < transcricao.length && transcricao[j].tipo === 'social'; j++) run++;
                                    return (
                                        <button key={i} type="button" onClick={() => setShowSocial(true)}
                                            className="block w-full text-left text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 hover:text-gray-600">
                                            ⋯ {run} turno(s) de conversa paralela — clique para ver
                                        </button>
                                    );
                                }

                                const papel = t.papel ?? t.falante ?? '';
                                let cor = 'text-gray-500';
                                if (papel === 'Médico') cor = 'text-teal-700';
                                else if (papel === 'Paciente') cor = 'text-indigo-600';
                                else if (papel === 'Acompanhante') cor = 'text-purple-700';
                                return (
                                    <p key={i} className={`leading-relaxed ${isSocial ? 'opacity-50 italic' : ''}`}>
                                        {papel && <span className={`mr-1 font-semibold ${cor}`}>{papel}:</span>}
                                        <span className="text-gray-800 whitespace-pre-wrap">{t.texto}</span>
                                        {isSocial && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 not-italic">conversa paralela</span>}
                                        {isAdmin && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">administrativo</span>}
                                    </p>
                                );
                            })}
                        </div>
                    </SOAPSection>
                )}

                {/* 2) RESUMO da consulta (card próprio, destaque) */}
                {resumo && (
                    <SOAPSection title="Resumo da consulta" icon="📝">
                        <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">{resumo}</p>
                    </SOAPSection>
                )}

                {/* 3) ANAMNESE ESTRUTURADA — com labels PT-BR */}
                {(record.chief_complaint || camposAnamnese.length > 0) && (
                    <SOAPSection title="S - Subjetivo (Anamnese)" icon="🗣️">
                        {record.chief_complaint && (
                            <div className="mb-3">
                                <p className="text-xs text-gray-500 uppercase font-medium mb-1">Queixa Principal</p>
                                <p className="text-sm text-gray-900 whitespace-pre-wrap">{record.chief_complaint}</p>
                            </div>
                        )}
                        {camposAnamnese.length > 0 ? (
                            <div className="space-y-3">
                                {camposAnamnese.map(([label, valor, fontes]) => (
                                    <div key={label}>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                                            <FonteBadge fontes={fontes} acompanhante={acompanhante} />
                                        </div>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{String(valor)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (!record.chief_complaint && <p className="text-sm text-gray-400 italic">Nenhum registro</p>)}
                    </SOAPSection>
                )}

                {/* Objetivo */}
                <SOAPSection title="O - Objetivo (Exame Físico)" icon="🔬">
                    {record.physical_exam ? renderJSONSection(record.physical_exam) : <p className="text-sm text-gray-400 italic">Nenhum registro</p>}
                </SOAPSection>

                {/* Avaliação */}
                <SOAPSection title="A - Avaliação (Diagnóstico)" icon="📋">
                    {record.diagnosis?.length > 0 ? (
                        <div className="space-y-2">
                            {record.diagnosis.map((d, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                                    {d.code && <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-bold rounded">{d.code}</span>}
                                    <div>
                                        <p className="text-sm text-gray-900">{d.description}</p>
                                        {d.notes && <p className="text-xs text-gray-500">{d.notes}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-gray-400 italic">Nenhum diagnóstico registrado</p>}
                </SOAPSection>

                {/* Plano - Prescrições */}
                {record.prescriptions?.length > 0 && (
                    <SOAPSection title="P - Prescrições" icon="💊">
                        <div className="space-y-3">
                            {record.prescriptions.map((p, i) => (
                                <div key={i} className="p-3 border border-gray-200 rounded-lg">
                                    <p className="font-medium text-gray-900">{p.medication} {p.dosage}</p>
                                    <div className="grid grid-cols-2 gap-2 mt-1 text-sm text-gray-600">
                                        {p.route && <p><span className="text-gray-400">Via:</span> {p.route}</p>}
                                        {p.frequency && <p><span className="text-gray-400">Frequência:</span> {p.frequency}</p>}
                                        {p.duration && <p><span className="text-gray-400">Duração:</span> {p.duration}</p>}
                                        {p.quantity && <p><span className="text-gray-400">Quantidade:</span> {p.quantity}</p>}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        {p.ai_suggested && <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Sugerido por IA</span>}
                                        {p.ai_suggested && <ConfiancaBadge confianca={p.confianca} />}
                                    </div>
                                    {p.notes && <p className="mt-1 text-xs text-gray-500">{p.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </SOAPSection>
                )}

                {/* Plano - Exames */}
                {record.exam_requests?.length > 0 && (
                    <SOAPSection title="P - Exames Solicitados" icon="🩺">
                        <div className="space-y-2">
                            {record.exam_requests.map((e, i) => (
                                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                    <span className="text-sm text-gray-900">{e.name}</span>
                                    {e.lab && <span className="text-xs text-gray-500">- {e.lab}</span>}
                                </div>
                            ))}
                        </div>
                    </SOAPSection>
                )}

                {/* Atestados */}
                {record.certificates?.length > 0 && (
                    <SOAPSection title="Atestados" icon="📄">
                        <div className="space-y-2">
                            {record.certificates.map((c, i) => (
                                <div key={i} className="p-2 border border-gray-200 rounded-lg">
                                    <p className="text-sm text-gray-900">
                                        {c.type === 'atestado' ? 'Atestado' : 'Declaração'} - {c.days} dias
                                    </p>
                                    {c.cid_code && <p className="text-xs text-gray-500">CID: {c.cid_code}</p>}
                                    {c.notes && <p className="text-xs text-gray-500">{c.notes}</p>}
                                </div>
                            ))}
                        </div>
                    </SOAPSection>
                )}

                {record.notes && (
                    <SOAPSection title="Observações / Conduta" icon="📝">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.notes}</p>
                    </SOAPSection>
                )}

                {/* Fallback: se NÃO for Studio Med mas tiver transcrição, mostra no fim (retrocompatível). */}
                {!isStudio && transcricao.length > 0 && (
                    <SOAPSection title="Transcrição" icon="🎙️">
                        <div className="space-y-3">
                            {transcricao.map((t, i) => (
                                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs font-medium text-gray-500 uppercase">{t.papel ?? t.falante}</span>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{t.texto}</p>
                                </div>
                            ))}
                        </div>
                    </SOAPSection>
                )}
            </div>
        </div>
    );
}

function SOAPSection({ title, icon, subtitle, children }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">{icon} {title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
            {!subtitle && <div className="mb-3" />}
            {children}
        </div>
    );
}

// Renderiza um JSON (ex.: physical_exam) mostrando pares chave: valor.
// Se a chave for 'description' e o valor for string longa, mostra o valor puro.
function renderJSONSection(data) {
    if (!data) return null;
    if (typeof data === 'string') return <p className="text-sm text-gray-700 whitespace-pre-wrap">{data}</p>;
    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '');
    if (entries.length === 0) return <p className="text-sm text-gray-400 italic">Nenhum registro</p>;
    return (
        <div className="space-y-2">
            {entries.map(([key, value]) => (
                <div key={key}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">{humanize(key)}</p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                </div>
            ))}
        </div>
    );
}

// Badge que mostra a origem clínica de um campo (Fase 2 — rastreabilidade).
// Só aparece quando há acompanhante na consulta e a fonte NÃO é só "paciente".
function FonteBadge({ fontes, acompanhante }) {
    if (!Array.isArray(fontes) || fontes.length === 0) return null;
    if (!acompanhante) return null;
    // Se só o paciente relatou, não polui a UI
    if (fontes.length === 1 && fontes[0] === 'paciente') return null;
    const nome = `${acompanhante.nome} (${acompanhante.vinculo})`;
    if (fontes.includes('acompanhante') && fontes.includes('paciente')) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Paciente + <span className="text-purple-700">{nome}</span>
            </span>
        );
    }
    if (fontes.includes('ambos')) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Paciente + <span className="text-purple-700">{nome}</span>
            </span>
        );
    }
    if (fontes.includes('acompanhante')) {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Relatado por {nome}
            </span>
        );
    }
    return null;
}

// N2 — indica quão segura a IA está sobre a prescrição extraída.
// "alta" não pinta nada (resultado limpo); média/baixa pedem revisão explícita.
function ConfiancaBadge({ confianca }) {
    if (!confianca || confianca === 'alta') return null;
    const estilo = confianca === 'media'
        ? 'bg-amber-100 text-amber-800 border border-amber-200'
        : 'bg-rose-100 text-rose-800 border border-rose-200';
    const rotulo = confianca === 'media' ? 'confiança média — revisar' : 'confiança baixa — REVISAR';
    return (
        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${estilo}`}>
            {rotulo}
        </span>
    );
}

function humanize(key) {
    return String(key)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
