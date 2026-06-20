import { Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layouts/AppLayout';

export default function Index({ prescriptions, filters }) {
    const { flash } = usePage().props;
    const { data, meta } = prescriptions;

    function handleSearch(e) {
        const value = e.target.value;
        router.get('/prescriptions', { search: value }, {
            preserveState: true,
            replace: true,
        });
    }

    function handleDelete(id) {
        if (confirm('Tem certeza que deseja excluir esta receita?')) {
            router.delete(`/prescriptions/${id}`);
        }
    }

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Receituário Avulso</h1>
                    <Link
                        href="/prescriptions/create"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                    >
                        + Nova Receita
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                        {flash.success}
                    </div>
                )}

                {/* Search */}
                <div>
                    <input
                        type="text"
                        placeholder="Buscar por paciente..."
                        defaultValue={filters?.search || ''}
                        onChange={handleSearch}
                        className="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                {/* Table */}
                {data.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500 text-lg">Nenhuma receita encontrada</p>
                        <p className="text-gray-400 text-sm mt-1">Crie a primeira receita avulsa clicando no botão acima.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Médico</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Medicamentos</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data.map((prescription) => (
                                    <tr key={prescription.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {prescription.patient?.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {prescription.doctor?.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {prescription.medicines?.length} item(ns)
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(prescription.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm space-x-2">
                                            <Link
                                                href={`/prescriptions/${prescription.id}`}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                Ver
                                            </Link>
                                            <Link
                                                href={`/prescriptions/${prescription.id}/print`}
                                                className="text-gray-600 hover:text-gray-800 font-medium"
                                            >
                                                Imprimir
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(prescription.id)}
                                                className="text-red-600 hover:text-red-800 font-medium"
                                            >
                                                Excluir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {meta?.last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3">
                                <span className="text-sm text-gray-600">
                                    Página {meta.current_page} de {meta.last_page}
                                </span>
                                <div className="flex gap-2">
                                    {meta.links?.filter(l => l.url).map((link, i) => (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            className={`px-3 py-1 text-sm rounded border ${
                                                link.active
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                            }`}
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
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
