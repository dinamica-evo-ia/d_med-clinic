import { Link } from '@inertiajs/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TZ = 'America/Sao_Paulo';
const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hhmm = (s) => new Date(String(s).replace(' ', 'T')).toLocaleTimeString('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const dm = (s) => new Date(String(s).replace(' ', 'T')).toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: 'short' });

export default function Dashboard({ appointments = [], upcoming = [], stats = {}, series = [] }) {
    const saldo = (stats.month_revenue || 0) - (stats.month_expense || 0);
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Consultas hoje" value={stats.today_appointments ?? 0} sub={`${stats.completed_today ?? 0} concluídas`} accent="blue" />
                <StatCard title="Consultas no mês" value={stats.month_appointments ?? 0} accent="indigo" />
                <StatCard title="Pacientes" value={stats.total_patients ?? 0} accent="violet" />
                <StatCard title="Receita do mês" value={brl(stats.month_revenue)} accent="green" />
                <StatCard title="Despesa do mês" value={brl(stats.month_expense)} accent="rose" />
                <StatCard title="Saldo do mês" value={brl(saldo)} accent={saldo >= 0 ? 'green' : 'rose'} />
                <StatCard title="A receber" value={brl(stats.pending_invoices)} accent="amber" />
                <StatCard title="A pagar" value={brl(stats.pending_expenses)} accent="slate" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Receita × Despesa (6 meses)</h2>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <BarChart data={series} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={70}
                                    tickFormatter={(v) => 'R$ ' + (v / 1000).toFixed(0) + 'k'} />
                                <Tooltip formatter={(v) => brl(v)} />
                                <Legend />
                                <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="despesa" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Agenda de hoje */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-slate-900">Agenda de hoje</h2>
                        <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver agenda →</Link>
                    </div>
                    {appointments.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            <p>Sem consultas para hoje.</p>
                            <Link href="/appointments/create" className="mt-2 inline-block text-blue-600 hover:text-blue-800 font-medium">+ Agendar</Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 max-h-72 overflow-auto">
                            {appointments.map((apt) => (
                                <div key={apt.id} className="flex items-center gap-3 py-2.5">
                                    <div className="text-sm font-semibold text-slate-700 w-12">{hhmm(apt.starts_at)}</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{apt.patient?.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{apt.doctor?.name}</p>
                                    </div>
                                    <StatusBadge status={apt.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Próximos compromissos */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Próximos 7 dias</h2>
                    <Link href="/appointments" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todos →</Link>
                </div>
                {upcoming.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4">Nenhum compromisso nos próximos dias.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {upcoming.map((apt) => (
                            <Link key={apt.id} href={`/appointments/${apt.id}`}
                                className="block p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition">
                                <p className="text-xs text-slate-500">{dm(apt.starts_at)} · {hhmm(apt.starts_at)}</p>
                                <p className="text-sm font-medium text-slate-900 truncate">{apt.patient?.name}</p>
                                <p className="text-xs text-slate-500 truncate">{apt.doctor?.name}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, sub, accent }) {
    const ring = {
        blue: 'text-blue-700', indigo: 'text-indigo-700', violet: 'text-violet-700',
        green: 'text-emerald-700', rose: 'text-rose-700', amber: 'text-amber-700', slate: 'text-slate-700',
    }[accent] || 'text-slate-700';
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{title}</p>
            <p className={`text-xl font-bold ${ring}`}>{value}</p>
            {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function StatusBadge({ status }) {
    const labels = {
        scheduled: 'Agendado', confirmed: 'Confirmado', in_progress: 'Em andamento',
        completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Faltou',
    };
    const colors = {
        scheduled: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700',
        in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-gray-100 text-gray-700',
        cancelled: 'bg-red-100 text-red-700', no_show: 'bg-purple-100 text-purple-700',
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
            {labels[status] || status}
        </span>
    );
}
