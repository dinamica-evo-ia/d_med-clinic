import { Link } from '@inertiajs/react';

export default function Show({ patient, record }) {
    return (
        <div>
            <div className="mb-6">
                <Link href={`/patients/${patient.id}/records`} className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">← Voltar ao prontuário</Link>
                <h1 className="text-2xl font-bold text-gray-900">Prontuário - {patient.name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                    {new Date(record.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })} - {record.doctor?.name}
                    {record.origem === 'studio_med' && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">
                            🎙️ Studio Med
                        </span>
                    )}
                </p>
            </div>

            <div className="space-y-4">
                {/* Subjetivo */}
                <SOAPSection title="S - Subjetivo (Anamnese)" icon="🗣️">
                    {record.chief_complaint && (
                        <div className="mb-3">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Queixa Principal</p>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{record.chief_complaint}</p>
                        </div>
                    )}
                    {record.anamnesis && renderJSONSection(record.anamnesis, 'Anamnese')}
                    {!record.chief_complaint && !record.anamnesis && <p className="text-sm text-gray-400 italic">Nenhum registro</p>}
                </SOAPSection>

                {/* Objetivo */}
                <SOAPSection title="O - Objetivo (Exame Físico)" icon="🔬">
                    {record.physical_exam ? renderJSONSection(record.physical_exam, 'Exame Físico') : <p className="text-sm text-gray-400 italic">Nenhum registro</p>}
                </SOAPSection>

                {/* Avaliação */}
                <SOAPSection title="A - Avaliação (Diagnóstico)" icon="📋">
                    {record.diagnosis?.length > 0 ? (
                        <div className="space-y-2">
                            {record.diagnosis.map((d, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                                    <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-bold rounded">{d.code}</span>
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
                                        <p><span className="text-gray-400">Via:</span> {p.route}</p>
                                        <p><span className="text-gray-400">Frequência:</span> {p.frequency}</p>
                                        <p><span className="text-gray-400">Duração:</span> {p.duration}</p>
                                        {p.quantity && <p><span className="text-gray-400">Quantidade:</span> {p.quantity}</p>}
                                    </div>
                                    {p.ai_suggested && <span className="mt-1 inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Sugerido por IA</span>}
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
                                    <p className="text-xs text-gray-500">{c.notes}</p>
                                </div>
                            ))}
                        </div>
                    </SOAPSection>
                )}

                {record.notes && (
                    <SOAPSection title="Observações" icon="📝">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{record.notes}</p>
                    </SOAPSection>
                )}

                {record.transcricao?.length > 0 && (
                    <SOAPSection title="Transcrição da Consulta" icon="🎙️">
                        <div className="space-y-3">
                            {record.transcricao.map((t, i) => (
                                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs font-medium text-gray-500 uppercase">{t.papel}</span>
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

function SOAPSection({ title, icon, children }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-3">{icon} {title}</h2>
            {children}
        </div>
    );
}

function renderJSONSection(data, label) {
    if (!data) return null;
    if (typeof data === 'string') return <p className="text-sm text-gray-700">{data}</p>;
    return (
        <div className="space-y-1">
            {Object.entries(data).map(([key, value]) => (
                <div key={key}>
                    <p className="text-xs text-gray-500 uppercase">{key}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{String(value)}</p>
                </div>
            ))}
        </div>
    );
}
