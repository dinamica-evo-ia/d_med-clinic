import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Show({ prescription }) {
    const { patient, doctor, medicines, notes, created_at } = prescription;
    const [envio, setEnvio] = useState('idle'); // idle | enviando | enviado
    const [erro, setErro] = useState(null);

    function handleDelete() {
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
            router.delete(`/prescriptions/${prescription.id}`);
        }
    }

    function enviarPdf() {
        if (envio === 'enviando') return;
        const tel = patient?.whatsapp || patient?.phone;
        if (!tel) {
            setErro('O paciente não tem WhatsApp/telefone no cadastro.');
            return;
        }
        if (!window.confirm(`Enviar a receita em PDF para o WhatsApp do paciente (${tel})?`)) return;
        setEnvio('enviando');
        setErro(null);
        window.axios
            .post(`/prescriptions/${prescription.id}/enviar-pdf`)
            .then(() => setEnvio('enviado'))
            .catch((e) => {
                setEnvio('idle');
                setErro(e?.response?.data?.error || 'Falha ao enviar. Tente de novo.');
            });
    }

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Detalhes da Receita</h1>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/prescriptions/${prescription.id}/print`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9V3h12v6M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
                            Imprimir
                        </Link>
                        <a
                            href={`/prescriptions/${prescription.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                            Baixar PDF
                        </a>
                        <button
                            onClick={enviarPdf}
                            disabled={envio === 'enviando' || envio === 'enviado'}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                            {envio === 'enviando' ? 'Enviando...' : envio === 'enviado' ? 'PDF enviado ✓' : 'Enviar PDF ao paciente'}
                        </button>
                        <Link
                            href="/prescriptions"
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Voltar
                        </Link>
                    </div>
                </div>

                {erro && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{erro}</div>
                )}
                {envio === 'enviado' && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">Receita enviada para o WhatsApp do paciente.</div>
                )}

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    {/* Header info */}
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <p className="text-sm text-gray-500">
                            Emitida em {new Date(created_at).toLocaleDateString('pt-BR')} às {new Date(created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Patient & Doctor */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</label>
                                <p className="mt-1 text-lg font-medium text-gray-900">{patient?.name}</p>
                                {patient?.document && (
                                    <p className="text-sm text-gray-500">Doc: {patient.document}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Médico</label>
                                <p className="mt-1 text-lg font-medium text-gray-900">{doctor?.name}</p>
                            </div>
                        </div>

                        {/* Corpo da receita (texto livre) OU medicamentos estruturados (retrocompat) */}
                        {prescription.body && prescription.body.trim() ? (
                            <div>
                                {prescription.title && <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{prescription.title}</h2>}
                                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-200 rounded-lg p-4">{prescription.body}</div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Medicamentos</h2>
                                <div className="space-y-3">
                                    {medicines?.map((med, i) => (
                                        <div key={i} className="border border-gray-200 rounded-lg p-4">
                                            <p className="font-semibold text-gray-900">
                                                {i + 1}. {med.medication}{med.dosage ? ` — ${med.dosage}` : ''}
                                            </p>
                                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                                                {med.route && <p><span className="font-medium">Via:</span> {med.route}</p>}
                                                {med.frequency && <p><span className="font-medium">Frequência:</span> {med.frequency}</p>}
                                                {med.duration && <p><span className="font-medium">Duração:</span> {med.duration}</p>}
                                                {med.quantity && <p><span className="font-medium">Quantidade:</span> {med.quantity}</p>}
                                                {med.notes && <p className="col-span-full"><span className="font-medium">Obs:</span> {med.notes}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {notes && (
                            <div>
                                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Observações</h2>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm">{notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete */}
                <div className="flex justify-end">
                    <button
                        onClick={handleDelete}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                        Excluir receita
                    </button>
                </div>
            </div>
        </>
    );
}
