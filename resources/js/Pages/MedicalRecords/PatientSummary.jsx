import { Head, Link } from '@inertiajs/react';

// Página do "Resumo para o paciente" — layout de impressão A4, sem menus.
// Não usa AppLayout: fica limpo pra imprimir/entregar/mandar por email.
export default function PatientSummary({ patient, record, clinic }) {
    const resumo = record?.anamnesis?.resumo?.trim() || null;
    const alertas = Array.isArray(record?.anamnesis?.alertas)
        ? record.anamnesis.alertas.filter(Boolean)
        : [];
    const conduta = record?.notes?.trim() || null;

    const dataConsulta = new Date(record.created_at);
    const nasc = patient.birth_date ? new Date(patient.birth_date) : null;
    const idade = nasc ? calcularIdade(nasc) : null;

    return (
        <div className="min-h-screen bg-gray-100 print:bg-white">
            <Head title={`Resumo — ${patient.name}`} />

            {/* Barra de ações — some na impressão */}
            <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-3">
                    <Link
                        href={`/patients/${patient.id}/records/${record.id}`}
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        ← Voltar ao prontuário
                    </Link>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                        >
                            🖨️ Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {/* Folha A4 */}
            <div className="max-w-3xl mx-auto p-8 print:p-0">
                <div className="bg-white shadow-sm border border-gray-200 print:shadow-none print:border-0 p-10 print:p-8">
                    {/* Cabeçalho */}
                    <header className="border-b-2 border-gray-800 pb-4 mb-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Resumo da Consulta
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">
                                    Para o paciente e familiares
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-gray-900">{clinic?.name || 'Clínica'}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {dataConsulta.toLocaleDateString('pt-BR', {
                                        day: '2-digit', month: 'long', year: 'numeric',
                                    })}
                                </p>
                                <p className="text-xs text-gray-600">
                                    {dataConsulta.toLocaleTimeString('pt-BR', {
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </div>
                    </header>

                    {/* Dados do paciente e médico */}
                    <section className="grid grid-cols-2 gap-6 mb-8 pb-4 border-b border-gray-200 text-sm">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Paciente</p>
                            <p className="text-base font-semibold text-gray-900">{patient.name}</p>
                            {idade !== null && (
                                <p className="text-xs text-gray-600 mt-0.5">{idade} anos</p>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">Médico(a)</p>
                            <p className="text-base font-semibold text-gray-900">{record.doctor?.name || '—'}</p>
                        </div>
                    </section>

                    {/* Resumo — protagonista */}
                    <section className="mb-8">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                            O que foi conversado
                        </h2>
                        {resumo ? (
                            <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">
                                {resumo}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-400 italic">Resumo não disponível.</p>
                        )}
                    </section>

                    {/* Alertas / pontos de atenção */}
                    {alertas.length > 0 && (
                        <section className="mb-8">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-3">
                                Pontos de atenção
                            </h2>
                            <ul className="space-y-1.5 text-sm text-gray-800">
                                {alertas.map((a, i) => (
                                    <li key={i} className="flex gap-2">
                                        <span className="text-amber-700 shrink-0">•</span>
                                        <span>{a}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {/* Conduta */}
                    {conduta && (
                        <section className="mb-8">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                                Orientações e conduta
                            </h2>
                            <p className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap">
                                {conduta}
                            </p>
                        </section>
                    )}

                    {/* Assinatura */}
                    <section className="mt-16 pt-4 border-t border-gray-300 text-center text-sm text-gray-700">
                        <div className="mx-auto w-72 border-b border-gray-400 mb-2 h-8" />
                        <p className="font-semibold">{record.doctor?.name || 'Assinatura do médico(a)'}</p>
                    </section>

                    {/* Rodapé */}
                    <footer className="mt-8 pt-4 border-t border-gray-200 text-[10px] text-gray-500 text-center">
                        Este resumo tem caráter informativo para o paciente e familiares.
                        Prescrições, atestados e laudos são documentos separados. Guarde este documento com sua saúde.
                    </footer>
                </div>
            </div>

            {/* Print CSS — força A4 e esconde o resto */}
            <style>{`
                @media print {
                    @page { size: A4; margin: 15mm; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
}

function calcularIdade(nasc) {
    const hoje = new Date();
    let anos = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
    return anos;
}

// Não usa AppLayout — página limpa pra impressão
PatientSummary.layout = null;
