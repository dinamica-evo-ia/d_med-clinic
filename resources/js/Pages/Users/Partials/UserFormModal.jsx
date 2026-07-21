import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

const PERMISSION_LABELS = {
    financeiro: 'Financeiro (contas a pagar/receber)',
};

export default function UserFormModal({ show, onClose, user, grantablePermissions = [] }) {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'doctor',
        permissions: [],
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (show) {
            if (user) {
                setForm({
                    name: user.name || '',
                    email: user.email || '',
                    password: '',
                    role: user.role || 'doctor',
                    permissions: user.permissions || [],
                });
            } else {
                setForm({ name: '', email: '', password: '', role: 'doctor', permissions: [] });
            }
            setSaving(false);
            setErrors({});
        }
    }, [show, user]);

    const togglePermission = (key) => {
        setForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(key)
                ? prev.permissions.filter(p => p !== key)
                : [...prev.permissions, key],
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        const opts = {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (errs) => setErrors(errs || {}),
            onFinish: () => setSaving(false),
        };

        if (user) {
            router.put(`/users/${user.id}`, {
                name: form.name,
                email: form.email,
                role: form.role,
                is_active: true,
                permissions: form.permissions,
            }, opts);
        } else {
            router.post('/users', {
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
                permissions: form.permissions,
            }, opts);
        }
    };

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    if (!show) return null;

    const errorList = Object.values(errors).filter(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {user ? 'Editar Usuário' : 'Novo Usuário'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                {errorList.length > 0 && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                        <ul className="space-y-1 text-sm text-red-700">
                            {errorList.map((msg, i) => (
                                <li key={i} className="flex gap-1.5">
                                    <span aria-hidden>•</span>
                                    <span>{msg}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Nome e Email agora aparecem TAMBÉM na edição (antes só na criação). */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                        <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                            placeholder="Nome completo"
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`} required />
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                        {user && <p className="mt-1 text-xs text-gray-400">Se este for um médico, o nome na receita também é atualizado.</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                            placeholder="email@exemplo.com"
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-400' : 'border-gray-300'}`} required />
                        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                    </div>
                    {/* Senha só na criação — trocar senha de outro usuário é fluxo à parte. */}
                    {!user && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                            <input type="password" value={form.password} onChange={e => update('password', e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-400' : 'border-gray-300'}`} required minLength={6} />
                            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
                        <select value={form.role} onChange={e => update('role', e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.role ? 'border-red-400' : 'border-gray-300'}`}>
                            <option value="admin">Admin</option>
                            <option value="doctor">Médico</option>
                            <option value="receptionist">Secretária</option>
                        </select>
                        {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role}</p>}
                    </div>

                    {form.role === 'receptionist' && grantablePermissions.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Acesso extra liberado pelo médico</label>
                            <div className="space-y-1.5">
                                {grantablePermissions.map((key) => (
                                    <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                                        <input type="checkbox" checked={form.permissions.includes(key)} onChange={() => togglePermission(key)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        {PERMISSION_LABELS[key] || key}
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Por padrão, secretária não acessa essas áreas — marque pra liberar especificamente pra essa pessoa.</p>
                        </div>
                    )}

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
