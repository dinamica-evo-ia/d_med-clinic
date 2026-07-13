import { Link, router } from '@inertiajs/react';
export default function Show({ prescription }) {
    const { patient, doctor, medicines, notes, created_at } = prescription;

    function handleDelete() {
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
            router.delete(`/prescriptions/${prescription.id}`);
        }
    }

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Detalhes da Receita</h1>
                    <div className="flex gap-2">
                        <Link
                            href={`/prescriptions/${prescription.id}/print`}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                        >
                            Imprimir / Compartilhar
                        </Link>
                        <Link
                            href="/prescriptions"
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Voltar
                        </Link>
                    </div>
                </div>

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
