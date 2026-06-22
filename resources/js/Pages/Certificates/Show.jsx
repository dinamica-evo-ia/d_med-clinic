import { Link, router } from '@inertiajs/react';
const typeLabels = {
    medical_certificate: 'Atestado Médico',
    attendance_declaration: 'Declaração de Comparecimento',
    medical_report: 'Relatório Médico',
    other: 'Outro',
};

export default function Show({ certificate }) {
    const { patient, doctor, type, cid_code, description, days, valid_from, valid_until, created_at } = certificate;

    function handleDelete() {
        if (confirm('Tem certeza que deseja excluir este atestado?')) {
            router.delete(`/certificates/${certificate.id}`);
        }
    }

    return (
        <>
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Detalhes do Atestado</h1>
                    <div className="flex gap-2">
                        <Link href={`/certificates/${certificate.id}/print`}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition">
                            Imprimir
                        </Link>
                        <Link href="/certificates"
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Voltar
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <span className="inline-block px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-700">
                            {typeLabels[type] || type}
                        </span>
                        <span className="ml-3 text-sm text-gray-500">
                            {new Date(created_at).toLocaleDateString('pt-BR')}
                        </span>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Paciente</label>
                                <p className="mt-1 text-lg font-medium text-gray-900">{patient?.name}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Médico</label>
                                <p className="mt-1 text-lg font-medium text-gray-900">{doctor?.name}</p>
                            </div>
                            {cid_code && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">CID</label>
                                    <p className="mt-1 font-medium text-gray-900">{cid_code}</p>
                                </div>
                            )}
                            {days !== null && days !== '' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Dias de Afastamento</label>
                                    <p className="mt-1 font-medium text-gray-900">{days} dia(s)</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Início</label>
                                <p className="mt-1 text-gray-900">{new Date(valid_from).toLocaleDateString('pt-BR')}</p>
                            </div>
                            {valid_until && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Fim</label>
                                    <p className="mt-1 text-gray-900">{new Date(valid_until).toLocaleDateString('pt-BR')}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Descrição</label>
                            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {description}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button onClick={handleDelete} className="text-sm text-red-600 hover:text-red-800 font-medium">
                        Excluir atestado
                    </button>
                </div>
            </div>
        </>
    );
}
