import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function ExpenseFormModal({ show, onClose, categories, expense }) {
    const [form, setForm] = useState({
        supplier: '',
        description: '',
        category_id: '',
        amount: '',
        payment_method: '',
        due_date: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) {
            if (expense) {
                setForm({
                    supplier: expense.supplier || '',
                    description: expense.description || '',
                    category_id: expense.category_id || '',
                    amount: String(expense.amount || ''),
                    payment_method: expense.payment_method || '',
                    due_date: expense.due_date || '',
                    notes: expense.notes || '',
                });
            } else {
                setForm({
                    supplier: '',
                    description: '',
                    category_id: '',
                    amount: '',
                    payment_method: '',
                    due_date: '',
                    notes: '',
                });
            }
            setSaving(false);
        }
    }, [show, expense]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = {
            ...form,
            amount: parseFloat(form.amount) || 0,
            due_date: form.due_date || null,
            payment_method: form.payment_method || null,
            category_id: form.category_id || null,
        };

        if (expense) {
            router.put(`/financeiro/pagar/${expense.id}`, payload, {
                onSuccess: () => onClose(),
                onError: () => setSaving(false),
            });
        } else {
            router.post('/financeiro/pagar', payload, {
                onSuccess: () => onClose(),
                onError: () => setSaving(false),
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
                        {expense ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                        <input type="text" value={form.supplier} onChange={e => update('supplier', e.target.value)}
                            placeholder="Ex: Distribuidora de Medicamentos Ltda"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                        <input type="text" value={form.description} onChange={e => update('description', e.target.value)}
                            placeholder="Ex: Compra de materiais"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
                            <input type="number" step="0.01" min="0" value={form.amount} onChange={e => update('amount', e.target.value)}
                                placeholder="0,00"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                            <input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                            <select value={form.category_id} onChange={e => update('category_id', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecione...</option>
                                {categories.filter(c => c.type === 'expense').map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
                            <select value={form.payment_method} onChange={e => update('payment_method', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Selecione...</option>
                                <option value="credit">Cartão de Crédito</option>
                                <option value="debit">Cartão de Débito</option>
                                <option value="pix">Pix</option>
                                <option value="boleto">Boleto</option>
                                <option value="cash">Dinheiro</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                            {saving ? 'Salvando...' : expense ? 'Atualizar' : 'Criar Conta'}
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
