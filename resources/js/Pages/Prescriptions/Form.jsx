import { useState, useEffect, useRef } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';

// Converte medicamentos estruturados (prefill do Studio / receita antiga) em texto livre.
function medsToText(meds) {
    return (meds || []).map((m, i) => {
        const line = [m.medication, m.dosage, m.route, m.frequency, m.duration, m.quantity].filter(Boolean).join(' — ');
        return `${i + 1}. ${line}${m.notes ? `\n   ${m.notes}` : ''}`;
    }).join('\n');
}

export default function Form({ prescription, patients, doctors, prefill }) {
    const { flash } = usePage().props;
    const isEditing = !!prescription;
    const bodyRef = useRef(null);
    const fromStudio = !isEditing && (prefill?.medicines?.length ?? 0) > 0;

    const initialBody = prescription?.body
        || (prescription?.medicines?.length ? medsToText(prescription.medicines) : '')
        || (prefill?.medicines?.length ? medsToText(prefill.medicines) : '');

    const { data, setData, post, errors, processing } = useForm({
        patient_id: prescription?.patient_id || prefill?.patient_id || '',
        doctor_id: prescription?.doctor_id || prefill?.doctor_id || '',
        title: prescription?.title || '',
        body: initialBody,
        print: false,
    });

    // Insere texto no cursor do editor (ou no fim).
    function insertText(text) {
        const el = bodyRef.current;
        const cur = data.body || '';
        if (el && typeof el.selectionStart === 'number') {
            const s = el.selectionStart, e = el.selectionEnd;
            const sep = s > 0 && cur[s - 1] !== '\n' ? '\n\n' : '';
            const next = cur.slice(0, s) + sep + text + '\n' + cur.slice(e);
            setData('body', next);
            requestAnimationFrame(() => { el.focus(); const p = s + sep.length + text.length + 1; el.setSelectionRange(p, p); });
        } else {
            setData('body', (cur ? cur + '\n\n' : '') + text);
        }
    }
    function insertFormula(f) {
        const raw = String(f.content || '').trim();
        if (!raw) return;
        // Tira o cabeçalho genérico "---------- Fórmula ----------" (artefato da importação)
        // e usa a finalidade (pra que serve) como título — igual aparece na biblioteca.
        const composition = raw.replace(/^\s*-{3,}\s*Fórmula\s*-{3,}\s*/i, '').trim();
        const header = String(f.purpose || f.name || '').trim();
        insertText(header ? `${header}\n${composition}` : composition);
        if (header && !String(data.title || '').trim()) setData('title', header);
    }
    function onDropFormula(e) {
        e.preventDefault();
        try { const f = JSON.parse(e.dataTransfer.getData('application/json')); if (f) insertFormula(f); } catch { /* drop inválido */ }
    }

    function handleSubmit(e) { e.preventDefault(); post('/prescriptions'); }
    function handleSaveAndPrint(e) {
        e.preventDefault();
        setData('print', true);
        setTimeout(() => post('/prescriptions', { data: { ...data, print: true }, preserveScroll: true }), 50);
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Editar Receita' : 'Nova Receita'}</h1>
                <Link href="/prescriptions" className="text-sm text-gray-600 hover:text-gray-800">← Voltar</Link>
            </div>

            {flash?.success && <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">{flash.success}</div>}
            {fromStudio && <div className="rounded-lg bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 text-sm">💊 Receita pré-preenchida com o que a IA identificou na consulta gravada. Revise antes de salvar.</div>}

            <div className="grid lg:grid-cols-[1fr_20rem] gap-6 items-start">
                <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente *</label>
                            <select value={data.patient_id} onChange={e => setData('patient_id', e.target.value)} disabled={isEditing}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <option value="">Selecione um paciente</option>
                                {patients?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {errors.patient_id && <p className="text-red-500 text-xs mt-1">{errors.patient_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Médico *</label>
                            <select value={data.doctor_id} onChange={e => setData('doctor_id', e.target.value)} disabled={isEditing}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                <option value="">Selecione um médico</option>
                                {doctors?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {errors.doctor_id && <p className="text-red-500 text-xs mt-1">{errors.doctor_id}</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                        <input value={data.title} onChange={e => setData('title', e.target.value)} placeholder="Opcional — ex.: Fórmula manipulada / Receita"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Receita</label>
                        <textarea ref={bodyRef} value={data.body} onChange={e => setData('body', e.target.value)}
                            onDragOver={e => e.preventDefault()} onDrop={onDropFormula} rows={16}
                            placeholder="Escreva a receita aqui — ou arraste uma fórmula do painel ao lado →"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono" />
                        {errors.body && <p className="text-red-500 text-xs mt-1">{errors.body}</p>}
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button type="submit" disabled={processing} className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">{processing ? 'Salvando...' : 'Salvar'}</button>
                        <button type="button" onClick={handleSaveAndPrint} disabled={processing} className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition">Salvar e Imprimir</button>
                        <Link href="/prescriptions" className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">Cancelar</Link>
                    </div>
                </form>

                <FormulaPanel onInsert={insertFormula} />
            </div>
        </div>
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
            <div className="space-y-2 max-h-[64vh] overflow-y-auto">
                {loading && <p className="text-xs text-gray-400">Buscando…</p>}
                {!loading && list.length === 0 && <p className="text-xs text-gray-400">Nenhuma fórmula.</p>}
                {list.map(f => (
                    <div key={f.id} draggable
                        onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify(f))}
                        className="border border-gray-200 rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:bg-blue-50/40 transition">
                        <div className="text-xs font-semibold text-gray-800 leading-snug">{f.purpose || f.name}</div>
                        {f.purpose && <div className="text-[10px] text-gray-400 truncate mt-0.5">{f.name}</div>}
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1 min-w-0">
                                {f.form && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">{f.form}</span>}
                                {f.route && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{f.route}</span>}
                            </div>
                            <button type="button" onClick={() => onInsert(f)} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 shrink-0 ml-auto">+ inserir</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
