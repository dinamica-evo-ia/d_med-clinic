import { Link, router } from '@inertiajs/react';
import DataTable from '../../Components/shared/DataTable';

export default function Index({ doctors }) {
    const columns = [
        { key: 'name', label: 'Nome', render: (row) => (
            <div>
                <span className="text-gray-900 font-medium">{row.name}</span>
                {row.license_number && <span className="text-gray-400 ml-2 text-xs">CRM {row.license_number}</span>}
            </div>
        )},
        { key: 'specialty', label: 'Especialidade', className: 'text-gray-500' },
        { key: 'email', label: 'Email', className: 'text-gray-500' },
        { key: 'phone', label: 'Telefone', className: 'text-gray-500' },
        { key: 'is_active', label: 'Ativo', render: (row) => row.is_active ? 'Sim' : 'Não', className: 'text-gray-500' },
        { key: 'actions', label: 'Ações', render: (row) => (
            <div className="flex gap-2">
                <Link href={`/doctors/${row.id}/edit`} className="text-blue-600 hover:text-blue-800 text-sm">Editar</Link>
                <button onClick={() => { if (confirm('Remover médico?')) router.delete(`/doctors/${row.id}`); }} className="text-red-600 hover:text-red-800 text-sm">Remover</button>
            </div>
        )},
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Médicos</h1>
                <Link href="/doctors/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    + Novo Médico
                </Link>
            </div>
            <DataTable columns={columns} data={doctors} />
        </div>
    );
}
