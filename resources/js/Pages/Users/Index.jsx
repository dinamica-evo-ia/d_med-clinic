import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import UserFormModal from './Partials/UserFormModal';

const ROLE_LABELS = {
    admin: 'Admin',
    doctor: 'Médico',
    receptionist: 'Secretária',
};

const ROLE_COLORS = {
    admin: 'bg-purple-100 text-purple-700',
    doctor: 'bg-blue-100 text-blue-700',
    receptionist: 'bg-green-100 text-green-700',
};

export default function Index({ users, flash }) {
    const { auth } = usePage().props;
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const openCreate = () => {
        setEditingUser(null);
        setShowModal(true);
    };

    const openEdit = (user) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const handleDelete = (user) => {
        if (confirm(`Remover ${user.name} da clínica?`)) {
            router.delete(`/users/${user.id}`);
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
                    <p className="text-sm text-gray-500 mt-1">Gerencie os usuários e permissões da clínica</p>
                </div>
                <button onClick={openCreate}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    + Novo Usuário
                </button>
            </div>

            {flash?.success && (
                <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">
                    {flash.success}
                </div>
            )}

            {users.data?.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <p className="text-gray-500 mb-4">Nenhum usuário cadastrado nesta clínica.</p>
                    <button onClick={openCreate}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                        + Adicionar Primeiro Usuário
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Papel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.data.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-700'}`}>
                                            {ROLE_LABELS[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 text-sm ${user.is_active ? 'text-green-600' : 'text-red-500'}`}>
                                            <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                                            {user.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => openEdit(user)}
                                                className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                                Editar
                                            </button>
                                            {user.id !== auth.user?.id && (
                                                <button onClick={() => handleDelete(user)}
                                                    className="text-sm text-red-500 hover:text-red-700 font-medium">
                                                    Remover
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {users.links && (
                        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                                Mostrando {users.from || 0} a {users.to || 0} de {users.total || 0}
                            </span>
                            <div className="flex gap-1">
                                {users.links.map((link, i) => (
                                    <Link key={i}
                                        href={link.url || '#'}
                                        disabled={!link.url}
                                        className={`px-3 py-1 text-sm rounded ${link.active ? 'bg-blue-600 text-white' : link.url ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-default'}`}
                                        dangerouslySetInnerHTML={{ __html: link.label }} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <UserFormModal
                show={showModal}
                onClose={() => setShowModal(false)}
                user={editingUser}
            />
        </div>
    );
}
