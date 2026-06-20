import { useState } from 'react';
import CidAutocomplete from '@/Components/shared/CidAutocomplete';
import AiPrescriptionSuggester from '@/Components/shared/AiPrescriptionSuggester';

export default function SOAPEditor({ data, setData, errors, patientId }) {
    const addDiagnosis = (item) => {
        const current = [...(data.diagnosis || [])];
        current.push({ type: 'principal', code: item.code, description: item.description, notes: '' });
        setData('diagnosis', current);
    };

    const removeDiagnosis = (index) => {
        setData('diagnosis', (data.diagnosis || []).filter((_, i) => i !== index));
    };

    const addPrescription = () => {
        const current = [...(data.prescriptions || [])];
        current.push({
            medication: '', dosage: '', route: 'oral',
            frequency: '', duration: '', quantity: '', notes: '', ai_suggested: false,
        });
        setData('prescriptions', current);
    };

    return (
        <div className="space-y-6">
            {/* S - Subjective */}
            <Section title="S - Subjetivo (Anamnese)">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Queixa Principal</label>
                    <textarea
                        value={data.chief_complaint || ''}
                        onChange={e => setData('chief_complaint', e.target.value)}
                        rows={2}
                        placeholder="Descreva a queixa principal do paciente..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">História da Doença Atual</label>
                        <textarea
                            value={data.anamnesis?.hda || ''}
                            onChange={e => setData('anamnesis', { ...(data.anamnesis || {}), hda: e.target.value })}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Medicamentos em Uso</label>
                        <textarea
                            value={data.anamnesis?.medicines || ''}
                            onChange={e => setData('anamnesis', { ...(data.anamnesis || {}), medicines: e.target.value })}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Alergias</label>
                        <textarea
                            value={data.anamnesis?.allergies || ''}
                            onChange={e => setData('anamnesis', { ...(data.anamnesis || {}), allergies: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">História Familiar</label>
                        <textarea
                            value={data.anamnesis?.family_history || ''}
                            onChange={e => setData('anamnesis', { ...(data.anamnesis || {}), family_history: e.target.value })}
                            rows={2}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </Section>

            {/* O - Objective */}
            <Section title="O - Objetivo (Exame Físico)">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {['PA', 'FC', 'FR', 'Temp', 'SpO2', 'Peso', 'Altura', 'IMC'].map((field) => (
                        <div key={field}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{field}</label>
                            <input
                                type="text"
                                value={data.physical_exam?.[field] || ''}
                                onChange={e => setData('physical_exam', { ...(data.physical_exam || {}), [field]: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    ))}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exame Físico (descrição)</label>
                    <textarea
                        value={data.physical_exam?.description || ''}
                        onChange={e => setData('physical_exam', { ...(data.physical_exam || {}), description: e.target.value })}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </Section>

            {/* A - Assessment */}
            <Section title="A - Avaliação (Diagnóstico)">
                <div className="mb-3">
                    <label className="block text-xs text-gray-500 mb-1">CID-10 (busque pelo código ou descrição)</label>
                    <CidAutocomplete
                        onSelect={addDiagnosis}
                        placeholder="Digite o código ou nome do diagnóstico..."
                    />
                </div>
                {(data.diagnosis || []).length > 0 && (
                    <div className="space-y-2 mb-3">
                        {(data.diagnosis || []).map((d, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                                <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-bold rounded">{d.code}</span>
                                <span className="flex-1 text-sm text-gray-900">{d.description}</span>
                                <button type="button" onClick={() => removeDiagnosis(i)}
                                    className="text-red-500 hover:text-red-700 text-sm">✕</button>
                            </div>
                        ))}
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observações do Diagnóstico</label>
                    <textarea
                        value={data.diagnosis_notes || ''}
                        onChange={e => setData('diagnosis_notes', e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </Section>

            {/* P - Plan / Prescriptions */}
            <Section title="P - Prescrições">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                        {data.prescriptions?.length || 0} medicamento(s) adicionado(s)
                    </span>
                    <AiPrescriptionSuggester
                        patientId={patientId}
                        chiefComplaint={data.chief_complaint}
                        hda={data.anamnesis?.hda}
                        medicines={data.anamnesis?.medicines}
                        allergies={data.anamnesis?.allergies}
                        physicalExamDescription={data.physical_exam?.description}
                        diagnoses={data.diagnosis}
                        diagnosisNotes={data.diagnosis_notes}
                        onApplySuggestion={(s) => setData('prescriptions', [...(data.prescriptions || []), { ...s, ai_suggested: true }])}
                        disabled={!patientId}
                    />
                </div>
                {(data.prescriptions || []).map((p, i) => (
                    <div key={i} className="p-3 border border-gray-200 rounded-lg mb-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Medicamento</label>
                                <input type="text" value={p.medication} onChange={e => {
                                    const updated = [...data.prescriptions]; updated[i] = { ...updated[i], medication: e.target.value }; setData('prescriptions', updated);
                                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Dosagem</label>
                                <input type="text" value={p.dosage} onChange={e => {
                                    const updated = [...data.prescriptions]; updated[i] = { ...updated[i], dosage: e.target.value }; setData('prescriptions', updated);
                                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Via</label>
                                <select value={p.route} onChange={e => {
                                    const updated = [...data.prescriptions]; updated[i] = { ...updated[i], route: e.target.value }; setData('prescriptions', updated);
                                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="oral">Oral</option>
                                    <option value="sublingual">Sublingual</option>
                                    <option value="topico">Tópico</option>
                                    <option value="inalatorio">Inalatório</option>
                                    <option value="intramuscular">Intramuscular</option>
                                    <option value="endovenoso">Endovenoso</option>
                                    <option value="subcutaneo">Subcutâneo</option>
                                    <option value="retal">Retal</option>
                                    <option value="otologico">Otológico</option>
                                    <option value="oftalmico">Oftálmico</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Frequência</label>
                                <input type="text" value={p.frequency} onChange={e => {
                                    const updated = [...data.prescriptions]; updated[i] = { ...updated[i], frequency: e.target.value }; setData('prescriptions', updated);
                                }} placeholder="Ex: 8/8h, 1x ao dia"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Duração</label>
                                <input type="text" value={p.duration} onChange={e => {
                                    const updated = [...data.prescriptions]; updated[i] = { ...updated[i], duration: e.target.value }; setData('prescriptions', updated);
                                }} placeholder="Ex: 7 dias, 30 dias"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                                <input type="text" value={p.quantity} onChange={e => {
                                    const updated = [...data.prescriptions]; updated[i] = { ...updated[i], quantity: e.target.value }; setData('prescriptions', updated);
                                }} placeholder="Ex: 1 caixa, 30 comp"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                                <input type="text" value={p.notes} onChange={e => {
                                    const updated = [...data.prescriptions]; updated[i] = { ...updated[i], notes: e.target.value }; setData('prescriptions', updated);
                                }} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        <button type="button" onClick={() => setData('prescriptions', (data.prescriptions || []).filter((_, idx) => idx !== i))}
                            className="mt-2 text-xs text-red-500 hover:text-red-700">Remover</button>
                    </div>
                ))}
                <button type="button" onClick={addPrescription}
                    className="px-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:border-blue-400 hover:text-blue-600 w-full">
                    + Adicionar Medicamento
                </button>
            </Section>

            {/* Exam Requests */}
            <Section title="P - Exames">
                <textarea
                    value={data.exam_requests ? data.exam_requests.map(e => e.name).join('\n') : ''}
                    onChange={e => setData('exam_requests', e.target.value.split('\n').filter(Boolean).map(name => ({ name })))}
                    rows={3}
                    placeholder="Digite os exames solicitados (um por linha)..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </Section>

            {/* Certificates */}
            <Section title="Atestados">
                <textarea
                    value={data.certificates ? data.certificates.map(c => `${c.type} - ${c.days} dias - ${c.notes || ''}`).join('\n') : ''}
                    onChange={e => setData('certificates', e.target.value.split('\n').filter(Boolean).map(line => {
                        const parts = line.split(' - ');
                        return { type: 'atestado', cid_code: '', days: parseInt(parts[1]) || 1, notes: parts.slice(2).join(' - ') || line };
                    }))}
                    rows={2}
                    placeholder="atestado - 3 dias - Repouso (um por linha)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </Section>

            {/* General Notes */}
            <Section title="Observações Gerais">
                <textarea
                    value={data.notes || ''}
                    onChange={e => setData('notes', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </Section>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
            {children}
        </div>
    );
}
