import { Link, useForm } from '@inertiajs/react';
import CidAutocomplete from '@/Components/shared/CidAutocomplete';

const certificateTypes = [
    { value: 'medical_certificate', label: 'Atestado Médico' },
    { value: 'attendance_declaration', label: 'Declaração de Comparecimento' },
    { value: 'medical_report', label: 'Relatório Médico' },
    { value: 'other', label: 'Outro' },
];

export default function Form({ certificate, patients, doctors }) {
    const isEditing = !!certificate;

    const { data, setData, post, errors, processing } = useForm({
        patient_id: certificate?.patient_id || '',
        doctor_id: certificate?.doctor_id || '',
        type: certificate?.type || 'medical_certificate',
        cid_code: certificate?.cid_code || '',
        description: certificate?.description || '',
        days: certificate?.days || '',
        valid_from: certificate?.valid_from || new Date().toISOString().split('T')[0],
        valid_until: certificate?.valid_until || '',
        print: false,
    });

    function handleSubmit(e) {
        e.preventDefault();
        post('/certificates');
    }

    function handleSaveAndPrint(e) {
        e.preventDefault();
        setData('print', true);
        setTimeout(() => post('/certificates', {
            data: { ...data, print: true },
            preserveScroll: true,
        }), 50);
    }

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Editar Atestado' : 'Novo Atestado'}
                    </h1>
                    <Link href="/certificates" className="text-sm text-gray-600 hover:text-gray-800">
                        &larr; Voltar
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                    {/* Patient / Doctor / Type */}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                            <select value={data.type} onChange={e => setData('type', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                                {certificateTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
                        </div>
                    </div>

                    {/* CID / Days / Valid from / Valid until */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CID</label>
                            {data.cid_code ? (
                                <div className="flex items-center gap-2 p-2.5 border border-blue-200 bg-blue-50 rounded-lg">
                                    <span className="px-2 py-0.5 bg-blue-200 text-blue-800 text-xs font-bold rounded">{data.cid_code}</span>
                                    <button type="button" onClick={() => setData('cid_code', '')}
                                        className="ml-auto text-red-500 hover:text-red-700 text-sm">trocar</button>
                                </div>
                            ) : (
                                <CidAutocomplete
                                    onSelect={(item) => setData('cid_code', item.code)}
                                    placeholder="Buscar CID-10 (código ou descrição)"
                                />
                            )}
                            {errors.cid_code && <p className="text-red-500 text-xs mt-1">{errors.cid_code}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dias de Afastamento</label>
                            <input type="number" value={data.days} onChange={e => setData('days', e.target.value)}
                                min="0" max="365"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            {errors.days && <p className="text-red-500 text-xs mt-1">{errors.days}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Início *</label>
                            <input type="date" value={data.valid_from} onChange={e => setData('valid_from', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            {errors.valid_from && <p className="text-red-500 text-xs mt-1">{errors.valid_from}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                            <input type="date" value={data.valid_until} onChange={e => setData('valid_until', e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            {errors.valid_until && <p className="text-red-500 text-xs mt-1">{errors.valid_until}</p>}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição / Corpo do Atestado *</label>
                        <textarea value={data.description} onChange={e => setData('description', e.target.value)}
                            rows={6}
                            placeholder="Descreva o conteúdo do atestado..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing}
                            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
                            {processing ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button type="button" onClick={handleSaveAndPrint} disabled={processing}
                            className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition">
                            {processing ? 'Salvando...' : 'Salvar e Imprimir'}
                        </button>
                        <Link href="/certificates"
                            className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </>
    );
}
