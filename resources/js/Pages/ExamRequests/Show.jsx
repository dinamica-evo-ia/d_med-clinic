import { Link, router, useForm } from '@inertiajs/react';
const statusLabels = {
    requested: 'Solicitado',
    performed: 'Realizado',
    cancelled: 'Cancelado',
};

const statusColors = {
    requested: 'bg-yellow-100 text-yellow-700',
    performed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
};

export default function Show({ examRequest }) {
    const { patient, doctor, items, notes, status, requested_date, performed_date, result } = examRequest;

    const { data, setData, patch, processing } = useForm({
        status: status,
        performed_date: performed_date || '',
        result: result || '',
    });

    function handleUpdateStatus(e) {
        e.preventDefault();
        patch(`/exam-requests/${examRequest.id}/status`);
    }

    function handleDelete() {
        if (confirm('Tem certeza que deseja excluir esta solicitação?')) {
            router.delete(`/exam-requests/${examRequest.id}`);
        }
    }

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Detalhes da Solicitação</h1>
                    <div className="flex gap-2">
                        <Link href={`/exam-requests/${examRequest.id}/print`}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition">
                            Imprimir
                        </Link>
                        <Link href="/exam-requests"
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Voltar
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${statusColors[status]}`}>
                            {statusLabels[status]}
                        </span>
                        <span className="text-sm text-gray-500">
                            {new Date(requested_date).toLocaleDateString('pt-BR')}
                        </span>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</label>
                                <p className="mt-1 text-lg font-medium text-gray-900">{patient?.name}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Médico</label>
                                <p className="mt-1 text-lg font-medium text-gray-900">{doctor?.name}</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Exames</h2>
                            <div className="space-y-2">
                                {items?.map((item) => (
                                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {item.exam_type?.code} — {item.exam_type?.name}
                                            </p>
                                            {item.observation && (
                                                <p className="text-sm text-gray-500 mt-1">{item.observation}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {notes && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Observações</label>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3 text-sm">{notes}</p>
                            </div>
                        )}

                        {/* Status update form */}
                        {status !== 'cancelled' && (
                            <div className="border-t border-gray-200 pt-6">
                                <h2 className="text-sm font-semibold text-gray-700 mb-3">Atualizar Status</h2>
                                <form onSubmit={handleUpdateStatus} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select value={data.status} onChange={e => setData('status', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                            <option value="requested">Solicitado</option>
                                            <option value="performed">Realizado</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </div>
                                    {data.status === 'performed' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Realização</label>
                                                <input type="date" value={data.performed_date}
                                                    onChange={e => setData('performed_date', e.target.value)}
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
                                                <textarea value={data.result} onChange={e => setData('result', e.target.value)}
                                                    rows={4} placeholder="Descreva o resultado do exame..."
                                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                        </>
                                    )}
                                    <button type="submit" disabled={processing}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                                        {processing ? 'Atualizando...' : 'Atualizar Status'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {result && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Resultado</label>
                                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap text-sm">
                                    {result}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button onClick={handleDelete} className="text-sm text-red-600 hover:text-red-800 font-medium">
                        Excluir solicitação
                    </button>
                </div>
            </div>
        </>
    );
}
