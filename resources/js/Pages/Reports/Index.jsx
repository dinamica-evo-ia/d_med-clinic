import { useState } from 'react';
export default function Index() {
    const [patientSearch, setPatientSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [finDateFrom, setFinDateFrom] = useState('');
    const [finDateTo, setFinDateTo] = useState('');

    return (
        <>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Patients */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Pacientes</h2>
                        <p className="text-sm text-gray-500 mb-4">Exportar lista de pacientes cadastrados em CSV.</p>
                        <div className="space-y-3">
                            <input type="text" placeholder="Filtrar por nome..." value={patientSearch}
                                onChange={e => setPatientSearch(e.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                            <a href={`/reports/patients?search=${encodeURIComponent(patientSearch)}`}
                                className="block text-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                                Exportar CSV
                            </a>
                        </div>
                    </div>

                    {/* Appointments */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Consultas</h2>
                        <p className="text-sm text-gray-500 mb-4">Exportar consultas por período em CSV.</p>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">De</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Até</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                            </div>
                            <a href={`/reports/appointments?date_from=${dateFrom}&date_to=${dateTo}`}
                                className="block text-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                                Exportar CSV
                            </a>
                        </div>
                    </div>

                    {/* Financial */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Financeiro</h2>
                        <p className="text-sm text-gray-500 mb-4">Exportar contas a receber por período em CSV.</p>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">De</label>
                                    <input type="date" value={finDateFrom} onChange={e => setFinDateFrom(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Até</label>
                                    <input type="date" value={finDateTo} onChange={e => setFinDateTo(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                                </div>
                            </div>
                            <a href={`/reports/financial?date_from=${finDateFrom}&date_to=${finDateTo}`}
                                className="block text-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                                Exportar CSV
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
