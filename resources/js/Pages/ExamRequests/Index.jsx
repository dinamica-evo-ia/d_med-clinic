import { Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layouts/AppLayout';

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

export default function Index({ examRequests, filters }) {
    const { flash } = usePage().props;
    const { data, meta } = examRequests;

    function handleSearch(e) {
        router.get('/exam-requests', { search: e.target.value, status: filters?.status }, {
            preserveState: true, replace: true,
        });
    }

    function handleStatusFilter(e) {
        router.get('/exam-requests', { search: filters?.search, status: e.target.value }, {
            preserveState: true, replace: true,
        });
    }

    function handleDelete(id) {
        if (confirm('Tem certeza que deseja excluir esta solicitação?')) {
            router.delete(`/exam-requests/${id}`);
        }
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Solicitação de Exames</h1>
                    <Link href="/exam-requests/create"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                        + Nova Solicitação
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                        {flash.success}
                    </div>
                )}

                <div className="flex gap-3">
                    <input type="text" placeholder="Buscar por paciente..."
                        defaultValue={filters?.search || ''} onChange={handleSearch}
                        className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    <select value={filters?.status || ''} onChange={handleStatusFilter}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <option value="">Todos os status</option>
                        <option value="requested">Solicitado</option>
                        <option value="performed">Realizado</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>

                {data.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-lg">Nenhuma solicitação encontrada</p>
                        <p className="text-gray-400 text-sm mt-1">Crie a primeira solicitação clicando no botão acima.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Médico</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Exames</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data.map((req) => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.patient?.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{req.doctor?.name}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{req.items?.length} exame(s)</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${statusColors[req.status]}`}>
                                                {statusLabels[req.status]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(req.requested_date).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm space-x-2">
                                            <Link href={`/exam-requests/${req.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Ver</Link>
                                            <Link href={`/exam-requests/${req.id}/print`} className="text-gray-600 hover:text-gray-800 font-medium">Imprimir</Link>
                                            <button onClick={() => handleDelete(req.id)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {meta?.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
                                <span className="text-sm text-gray-600">Página {meta.current_page} de {meta.last_page}</span>
                                <div className="flex gap-2">
                                    {meta.links?.filter(l => l.url).map((link, i) => (
                                        <Link key={i} href={link.url}
                                            className={`px-3 py-1 text-sm rounded border ${link.active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                            preserveState dangerouslySetInnerHTML={{ __html: link.label }} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
