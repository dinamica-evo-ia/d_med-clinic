import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function UserFormModal({ show, onClose, user }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'doctor',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) {
            if (user) {
                setForm({
                    name: user.name || '',
                    email: user.email || '',
                    password: '',
                    role: user.role || 'doctor',
                });
            } else {
                setForm({ name: '', email: '', password: '', role: 'doctor' });
            }
            setSaving(false);
        }
    }, [show, user]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);

        if (user) {
            router.put(`/users/${user.id}`, {
                role: form.role,
                is_active: true,
            }, {
                onSuccess: () => onClose(),
                onError: () => setSaving(false),
                onFinish: () => setSaving(false),
            });
        } else {
            router.post('/users', {
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
            }, {
                onSuccess: () => onClose(),
                onError: () => setSaving(false),
                onFinish: () => setSaving(false),
            });
        }
    };

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {user ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {!user && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                                    placeholder="Nome completo"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                                    placeholder="email@exemplo.com"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                                <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required minLength={6} />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
                        <select value={form.role} onChange={e => update('role', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="admin">Admin</option>
                            <option value="doctor">Médico</option>
                            <option value="receptionist">Secretária</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Salvando...' : user ? 'Atualizar' : 'Adicionar Usuário'}
                        </button>
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
