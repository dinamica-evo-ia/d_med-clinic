import { Link, router } from '@inertiajs/react';
import DataTable from '../../Components/shared/DataTable';
import SearchInput from '../../Components/shared/SearchInput';

export default function Index({ patients, filters }) {
    const columns = [
        { key: 'name', label: 'Nome', render: (row) => (
            <Link href={`/patients/${row.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                {row.name}
            </Link>
        )},
        { key: 'email', label: 'Email', className: 'text-gray-500' },
        { key: 'phone', label: 'Telefone', className: 'text-gray-500' },
        { key: 'document', label: 'CPF', className: 'text-gray-500' },
        { key: 'created_at', label: 'Cadastro', render: (row) => new Date(row.created_at).toLocaleDateString('pt-BR'), className: 'text-gray-500' },
        { key: 'actions', label: 'Ações', render: (row) => (
            <div className="flex gap-2">
                <Link href={`/patients/${row.id}/edit`} className="text-blue-600 hover:text-blue-800 text-sm">Editar</Link>
                <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 text-sm">Remover</button>
            </div>
        )},
    ];

    const handleDelete = (id) => {
        if (confirm('Tem certeza que deseja remover este paciente?')) {
            router.delete(`/patients/${id}`);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
                <Link href="/patients/create" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    + Novo Paciente
                </Link>
            </div>

            <div className="mb-4 max-w-md">
                <SearchInput placeholder="Buscar por nome, email, telefone ou CPF..." url="/patients" />
            </div>

            <DataTable columns={columns} data={patients} />
        </div>
    );
}
