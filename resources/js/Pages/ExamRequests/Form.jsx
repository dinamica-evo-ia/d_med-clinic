import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
export default function Form({ examRequest, patients, doctors, examTypes }) {
    const { data, setData, post, errors, processing } = useForm({
        patient_id: '',
        doctor_id: '',
        items: [{ exam_type_id: '', observation: '' }],
        notes: '',
        requested_date: new Date().toISOString().split('T')[0],
    });

    const groupedTypes = examTypes?.reduce((acc, t) => {
        const cat = t.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(t);
        return acc;
    }, {}) || {};

    function addItem() {
        setData('items', [...data.items, { exam_type_id: '', observation: '' }]);
    }

    function removeItem(index) {
        if (data.items.length <= 1) return;
        setData('items', data.items.filter((_, i) => i !== index));
    }

    function updateItem(index, field, value) {
        const updated = data.items.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        );
        setData('items', updated);
    }

    function handleSubmit(e) {
        e.preventDefault();
        post('/exam-requests');
    }

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Nova Solicitação de Exames</h1>
                    <Link href="/exam-requests" className="text-sm text-gray-600 hover:text-gray-800">&larr; Voltar</Link>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                            <select value={data.patient_id} onChange={e => setData('patient_id', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <option value="">Selecione</option>
                                {patients?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {errors.patient_id && <p className="text-red-500 text-xs mt-1">{errors.patient_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
                            <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <option value="">Selecione</option>
                                {doctors?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {errors.doctor_id && <p className="text-red-500 text-xs mt-1">{errors.doctor_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                            <input type="date" value={data.requested_date}
                                onChange={e => setData('requested_date', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            {errors.requested_date && <p className="text-red-500 text-xs mt-1">{errors.requested_date}</p>}
                        </div>
                    </div>

                    {/* Exam items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-800">Exames</h2>
                            <button type="button" onClick={addItem}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                                + Adicionar exame
                            </button>
                        </div>
                        {errors.items && <p className="text-red-500 text-xs mb-2">{errors.items}</p>}

                        {data.items.map((item, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">Exame #{index + 1}</span>
                                    {data.items.length > 1 && (
                                        <button type="button" onClick={() => removeItem(index)}
                                            className="text-red-500 hover:text-red-700 text-sm">Remover</button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Exame *</label>
                                        <select value={item.exam_type_id}
                                            onChange={e => updateItem(index, 'exam_type_id', e.target.value)}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                            <option value="">Selecione...</option>
                                            {Object.entries(groupedTypes).map(([category, types]) => (
                                                <optgroup key={category} label={category}>
                                                    {types.map(t => (
                                                        <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        {errors[`items.${index}.exam_type_id`] && (
                                            <p className="text-red-500 text-xs mt-1">{errors[`items.${index}.exam_type_id`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
                                        <input type="text" value={item.observation}
                                            onChange={e => updateItem(index, 'observation', e.target.value)}
                                            placeholder="Ex: Jejum de 8h"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações Gerais</label>
                        <textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                            rows={3} placeholder="Informações adicionais..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing}
                            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                            {processing ? 'Salvando...' : 'Salvar'}
                        </button>
                        <Link href="/exam-requests"
                            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </>
    );
}
