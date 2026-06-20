import { useState } from 'react';

export default function AiPrescriptionSuggester({
    patientId,
    chiefComplaint,
    hda,
    medicines,
    allergies,
    physicalExamDescription,
    diagnoses,
    diagnosisNotes,
    onApplySuggestion,
    disabled,
}) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [error, setError] = useState(null);

    const fetchSuggestions = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await window.axios.post('/api/prescriptions/suggest', {
                patient_id: patientId,
                chief_complaint: chiefComplaint || null,
                hda: hda || null,
                medicines: medicines || null,
                allergies: allergies || null,
                physical_exam_description: physicalExamDescription || null,
                diagnoses: diagnoses || [],
                diagnosis_notes: diagnosisNotes || null,
            });
            setSuggestions(data.suggestions);
            setOpen(true);
        } catch (err) {
            setError(
                err.response?.data?.message || 'Erro de conexão ao serviço de IA'
            );
            setSuggestions([]);
            setOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const applyAll = () => {
        suggestions.forEach(onApplySuggestion);
        handleClose();
    };

    const applyOne = (suggestion) => {
        onApplySuggestion(suggestion);
    };

    const handleClose = () => {
        setOpen(false);
        setSuggestions([]);
        setError(null);
    };

    return (
        <>
            <button
                type="button"
                onClick={fetchSuggestions}
                disabled={disabled || loading}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {loading ? 'Sugerindo...' : 'Sugerir Prescrição com IA'}
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={handleClose}>
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto p-6"
                        onClick={(e) => e.stopPropagation()}>

                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Sugestões de Prescrição
                            </h3>
                            <button onClick={handleClose}
                                className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                        </div>

                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <svg className="animate-spin h-8 w-8 text-purple-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="ml-3 text-sm text-gray-500">Consultando IA...</span>
                            </div>
                        )}

                        {error && !loading && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
                                {error}
                            </div>
                        )}

                        {!loading && !error && suggestions.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8">
                                Nenhuma sugestão foi gerada. Verifique os dados do paciente e tente novamente.
                            </p>
                        )}

                        {!loading && suggestions.length > 0 && (
                            <div className="space-y-3">
                                {suggestions.map((s, i) => (
                                    <div key={i} className="p-3 border border-purple-100 bg-purple-50 rounded-lg">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 truncate">{s.medication} {s.dosage}</p>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
                                                    <p><span className="text-gray-400">Via:</span> {s.route}</p>
                                                    <p><span className="text-gray-400">Frequência:</span> {s.frequency}</p>
                                                    <p><span className="text-gray-400">Duração:</span> {s.duration}</p>
                                                    <p><span className="text-gray-400">Quantidade:</span> {s.quantity}</p>
                                                </div>
                                                {s.notes && <p className="mt-1 text-xs text-gray-500">{s.notes}</p>}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => applyOne(s)}
                                                className="shrink-0 ml-2 px-2.5 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                                            >
                                                Adicionar
                                            </button>
                                        </div>
                                        <span className="mt-1.5 inline-block px-1.5 py-0.5 bg-purple-200 text-purple-700 text-[10px] font-medium rounded-full">
                                            Sugerido por IA
                                        </span>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={applyAll}
                                    className="w-full mt-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                    Adicionar Todos
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
