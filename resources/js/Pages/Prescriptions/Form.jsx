import { useState, useEffect } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
export default function Form({ prescription, patients, doctors, prefill }) {
    const { flash } = usePage().props;
    const isEditing = !!prescription;
    const fromStudio = !isEditing && (prefill?.medicines?.length ?? 0) > 0;

    const { data, setData, post, put, errors, processing } = useForm({
        patient_id: prescription?.patient_id || prefill?.patient_id || '',
        doctor_id: prescription?.doctor_id || prefill?.doctor_id || '',
        medicines: prescription?.medicines || prefill?.medicines || [
            { medication: '', dosage: '', route: '', frequency: '', duration: '', quantity: '', notes: '' },
        ],
        notes: prescription?.notes || '',
        print: false,
    });

    function addMedicine() {
        setData('medicines', [
            ...data.medicines,
            { medication: '', dosage: '', route: '', frequency: '', duration: '', quantity: '', notes: '' },
        ]);
    }

    function removeMedicine(index) {
        if (data.medicines.length <= 1) return;
        const updated = data.medicines.filter((_, i) => i !== index);
        setData('medicines', updated);
    }

    function updateMedicine(index, field, value) {
        const updated = data.medicines.map((m, i) =>
            i === index ? { ...m, [field]: value } : m
        );
        setData('medicines', updated);
    }

    // Insere uma fórmula da biblioteca como um item da receita (nome + composição/posologia).
    function insertFormula(f) {
        const mande = (String(f.content || '').match(/mande[:\s]*([^\n<]+)/i) || [])[1] || '';
        const row = {
            medication: f.name || 'Fórmula manipulada', dosage: '', route: f.route || '',
            frequency: '', duration: '', quantity: mande.trim(), notes: String(f.content || '').trim(),
        };
        const meds = data.medicines;
        const last = meds[meds.length - 1];
        const lastEmpty = last && !last.medication && !last.notes;
        setData('medicines', lastEmpty ? [...meds.slice(0, -1), row] : [...meds, row]);
    }

    function onDropFormula(e) {
        e.preventDefault();
        try { const f = JSON.parse(e.dataTransfer.getData('application/json')); if (f) insertFormula(f); } catch { /* ignora drop inválido */ }
    }

    function handleSubmit(e) {
        e.preventDefault();
        post('/prescriptions');
    }

    function handleSaveAndPrint(e) {
        e.preventDefault();
        setData('print', true);
        // Need to submit after state update — use a small delay
        setTimeout(() => {
            post('/prescriptions', {
                data: { ...data, print: true },
                preserveScroll: true,
            });
        }, 50);
    }

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Editar Receita' : 'Nova Receita Avulsa'}
                    </h1>
                    <Link href="/prescriptions" className="text-sm text-gray-600 hover:text-gray-800">
                        &larr; Voltar
                    </Link>
                </div>

                {flash?.success && (
                    <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
                        {flash.success}
                    </div>
                )}

                {fromStudio && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 text-sm">
                        💊 Receita <strong>pré-preenchida</strong> com os medicamentos que a IA identificou na consulta gravada.
                        Revise cada item — dose, via e duração — antes de salvar. Campos vazios não foram verbalizados pelo médico.
                    </div>
                )}

                <div className="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    {/* Patient & Doctor */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                            <select
                                value={data.patient_id}
                                onChange={e => setData('patient_id', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                disabled={isEditing}
                            >
                                <option value="">Selecione um paciente</option>
                                {patients?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {errors.patient_id && <p className="text-red-500 text-xs mt-1">{errors.patient_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
                            <select
                                value={data.doctor_id}
                                onChange={e => setData('doctor_id', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                disabled={isEditing}
                            >
                                <option value="">Selecione um médico</option>
                                {doctors?.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                            {errors.doctor_id && <p className="text-red-500 text-xs mt-1">{errors.doctor_id}</p>}
                        </div>
                    </div>

                    {/* Medicines */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold text-gray-800">Medicamentos</h2>
                            <button
                                type="button"
                                onClick={addMedicine}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                + Adicionar medicamento
                            </button>
                        </div>

                        {errors.medicines && <p className="text-red-500 text-xs mb-2">{errors.medicines}</p>}

                        <div onDragOver={e => e.preventDefault()} onDrop={onDropFormula}
                            className="rounded-lg border-2 border-dashed border-transparent hover:border-blue-200 transition-colors p-0.5">
                        {data.medicines.map((medicine, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-600">Medicamento #{index + 1}</span>
                                    {data.medicines.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeMedicine(index)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remover
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Medicamento *</label>
                                        <input
                                            type="text"
                                            value={medicine.medication}
                                            onChange={e => updateMedicine(index, 'medication', e.target.value)}
                                            placeholder="Nome do medicamento"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                        {errors[`medicines.${index}.medication`] && (
                                            <p className="text-red-500 text-xs mt-1">{errors[`medicines.${index}.medication`]}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Dosagem</label>
                                        <input
                                            type="text"
                                            value={medicine.dosage}
                                            onChange={e => updateMedicine(index, 'dosage', e.target.value)}
                                            placeholder="Ex: 500mg"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Via</label>
                                        <input
                                            type="text"
                                            value={medicine.route}
                                            onChange={e => updateMedicine(index, 'route', e.target.value)}
                                            placeholder="Ex: Oral"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Frequência</label>
                                        <input
                                            type="text"
                                            value={medicine.frequency}
                                            onChange={e => updateMedicine(index, 'frequency', e.target.value)}
                                            placeholder="Ex: 8/8h"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Duração</label>
                                        <input
                                            type="text"
                                            value={medicine.duration}
                                            onChange={e => updateMedicine(index, 'duration', e.target.value)}
                                            placeholder="Ex: 7 dias"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
                                        <input
                                            type="text"
                                            value={medicine.quantity}
                                            onChange={e => updateMedicine(index, 'quantity', e.target.value)}
                                            placeholder="Ex: 30 comprimidos"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Observações / composição</label>
                                        <textarea
                                            value={medicine.notes}
                                            onChange={e => updateMedicine(index, 'notes', e.target.value)}
                                            rows={medicine.notes && medicine.notes.length > 60 ? 6 : 2}
                                            placeholder="Instruções adicionais... (fórmulas magistrais entram aqui: composição + posologia)"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 whitespace-pre-wrap"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                    </div>

                    {/* General notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações Gerais</label>
                        <textarea
                            value={data.notes}
                            onChange={e => setData('notes', e.target.value)}
                            rows={3}
                            placeholder="Informações adicionais para a receita..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {processing ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAndPrint}
                            disabled={processing}
                            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition"
                        >
                            {processing ? 'Salvando...' : 'Salvar e Imprimir'}
                        </button>
                        <Link
                            href="/prescriptions"
                            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            Cancelar
                        </Link>
                    </div>
                </form>
                <FormulaPanel onInsert={insertFormula} />
                </div>
            </div>
        </>
    );
}

function FormulaPanel({ onInsert }) {
    const [q, setQ] = useState('');
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        const t = setTimeout(() => {
            fetch(`/formulas/search?q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } })
                .then(r => r.ok ? r.json() : [])
                .then(d => { if (active) { setList(Array.isArray(d) ? d : []); setLoading(false); } })
                .catch(() => { if (active) setLoading(false); });
        }, 300);
        return () => { active = false; clearTimeout(t); };
    }, [q]);

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 lg:sticky lg:top-4">
            <h3 className="text-sm font-semibold text-gray-800">Fórmulas magistrais</h3>
            <p className="text-[11px] text-gray-400 mb-2">Arraste para a receita, ou clique em “inserir”.</p>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar fórmula…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <div className="space-y-2 max-h-[62vh] overflow-y-auto">
                {loading && <p className="text-xs text-gray-400">Buscando…</p>}
                {!loading && list.length === 0 && <p className="text-xs text-gray-400">Nenhuma fórmula.</p>}
                {list.map(f => (
                    <div key={f.id} draggable
                        onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(f))}
                        className="border border-gray-200 rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:bg-blue-50/40 transition">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-gray-800 leading-snug">{f.name}</span>
                            <button type="button" onClick={() => onInsert(f)} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0">+ inserir</button>
                        </div>
                        {(f.form || f.route) && (
                            <div className="mt-1 flex gap-1">
                                {f.form && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{f.form}</span>}
                                {f.route && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{f.route}</span>}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
