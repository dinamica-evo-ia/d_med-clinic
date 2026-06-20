import { useState, useEffect, useCallback } from 'react';
import { router, usePage } from '@inertiajs/react';
import InvoiceFormModal from '@/Components/Financial/InvoiceFormModal';
import ExpenseFormModal from '@/Components/Financial/ExpenseFormModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const TABS = [
    { key: 'relatorios', label: 'Relatórios' },
    { key: 'receber', label: 'Contas a Receber' },
    { key: 'pagar', label: 'Contas a Pagar' },
];

const STATUS_BADGE = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABEL = {
    pending: 'Pendente',
    paid: 'Pago',
    cancelled: 'Cancelado',
};

const FORMAT = (val) => `R$ ${(parseFloat(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const DATE = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
};

export default function Financial({ tab, summary, categories, patients }) {
    const { url } = usePage();
    const activeTab = tab || 'relatorios';

    const [invoiceModal, setInvoiceModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [expenseModal, setExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);

    // Invoice data state
    const [invoiceData, setInvoiceData] = useState(null);
    const [invoiceLoading, setInvoiceLoading] = useState(false);
    const [invoiceError, setInvoiceError] = useState(null);

    // Expense data state
    const [expenseData, setExpenseData] = useState(null);
    const [expenseLoading, setExpenseLoading] = useState(false);
    const [expenseError, setExpenseError] = useState(null);

    // Filter state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);

    // Chart data state
    const [chartData, setChartData] = useState(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [chartError, setChartError] = useState(null);

    const fetchInvoices = useCallback(async (p = 1) => {
        setInvoiceLoading(true);
        setInvoiceError(null);
        try {
            const params = new URLSearchParams({ page: p });
            if (statusFilter) params.set('status', statusFilter);
            if (categoryFilter) params.set('category_id', categoryFilter);
            if (search) params.set('search', search);
            const { data } = await window.axios.get(`/financeiro/receber?${params}`);
            setInvoiceData(data);
        } catch (err) {
            setInvoiceError('Erro ao carregar contas a receber');
        } finally {
            setInvoiceLoading(false);
        }
    }, [statusFilter, categoryFilter, search]);

    const fetchExpenses = useCallback(async (p = 1) => {
        setExpenseLoading(true);
        setExpenseError(null);
        try {
            const params = new URLSearchParams({ page: p });
            if (statusFilter) params.set('status', statusFilter);
            if (categoryFilter) params.set('category_id', categoryFilter);
            if (search) params.set('search', search);
            const { data } = await window.axios.get(`/financeiro/pagar?${params}`);
            setExpenseData(data);
        } catch (err) {
            setExpenseError('Erro ao carregar contas a pagar');
        } finally {
            setExpenseLoading(false);
        }
    }, [statusFilter, categoryFilter, search]);

    const fetchChartData = useCallback(async () => {
        setChartLoading(true);
        setChartError(null);
        try {
            const { data } = await window.axios.get('/financeiro/chart-data');
            setChartData(data);
        } catch (err) {
            setChartError('Erro ao carregar dados dos gráficos');
        } finally {
            setChartLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'receber') fetchInvoices(page);
    }, [activeTab, fetchInvoices, page]);

    useEffect(() => {
        if (activeTab === 'pagar') fetchExpenses(page);
    }, [activeTab, fetchExpenses, page]);

    useEffect(() => {
        if (activeTab === 'relatorios') fetchChartData();
    }, [activeTab, fetchChartData]);

    const switchTab = (key) => {
        router.get(`/financeiro?tab=${key}`, {}, { preserveState: true, preserveScroll: true });
    };

    const openInvoiceCreate = () => {
        setEditingInvoice(null);
        setInvoiceModal(true);
    };

    const openInvoiceEdit = (inv) => {
        setEditingInvoice(inv);
        setInvoiceModal(true);
    };

    const openExpenseCreate = () => {
        setEditingExpense(null);
        setExpenseModal(true);
    };

    const openExpenseEdit = (exp) => {
        setEditingExpense(exp);
        setExpenseModal(true);
    };

    const doAction = (url, callback) => {
        if (!confirm('Tem certeza?')) return;
        router.patch(url, {}, {
            preserveState: true,
            onSuccess: () => callback(),
        });
    };

    const doDelete = (url, callback) => {
        if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
        router.delete(url, {
            preserveState: true,
            onSuccess: () => callback(),
        });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <SummaryCard title="Saldo do Mês" value={FORMAT(summary.balance)} color={summary.balance >= 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'} />
                <SummaryCard title="Recebido no Mês" value={FORMAT(summary.month_income)} color="text-green-700 bg-green-50 border-green-200" />
                <SummaryCard title="Pago no Mês" value={FORMAT(summary.month_expense)} color="text-red-700 bg-red-50 border-red-200" />
                <SummaryCard title="A Receber" value={FORMAT(summary.pending_income)} color="text-yellow-700 bg-yellow-50 border-yellow-200" />
                <SummaryCard title="A Pagar" value={FORMAT(summary.pending_expense)} color="text-orange-700 bg-orange-50 border-orange-200" />
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => switchTab(t.key)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === t.key
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab content */}
            {activeTab === 'relatorios' && (
                chartLoading ? <Loading message="Carregando gráficos..." />
                : chartError ? <Error message={chartError} onRetry={fetchChartData} />
                : !chartData ? <Empty message="Nenhum dado disponível para o período." />
                : <ReportsTab data={chartData} />
            )}

            {activeTab === 'receber' && (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-2 flex-1">
                            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Buscar por paciente ou descrição..."
                                className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Todos status</option>
                                <option value="pending">Pendente</option>
                                <option value="paid">Pago</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Todas categorias</option>
                                {categories.filter(c => c.type === 'income').map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={openInvoiceCreate}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                            + Nova Conta a Receber
                        </button>
                    </div>

                    {invoiceLoading ? <Loading message="Carregando contas..." />
                    : invoiceError ? <Error message={invoiceError} onRetry={() => fetchInvoices(page)} />
                    : !invoiceData?.invoices?.data?.length ? <Empty message="Nenhuma conta a receber encontrada.">
                        <button onClick={openInvoiceCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Criar Primeira Conta</button>
                    </Empty>
                    : (
                        <>
                            <Table
                                columns={[
                                    { key: 'patient', label: 'Paciente', render: (r) => r.patient?.name || '-' },
                                    { key: 'description', label: 'Descrição' },
                                    { key: 'amount', label: 'Valor', render: (r) => FORMAT(r.amount) },
                                    { key: 'due_date', label: 'Vencimento', render: (r) => DATE(r.due_date) },
                                    { key: 'status', label: 'Status', render: (r) => (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {STATUS_LABEL[r.status] || r.status}
                                        </span>
                                    )},
                                    { key: 'actions', label: 'Ações', render: (r) => (
                                        <div className="flex gap-1">
                                            {r.status === 'pending' && (
                                                <button onClick={() => doAction(`/financeiro/receber/${r.id}/pay`, () => fetchInvoices(page))}
                                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Pagar</button>
                                            )}
                                            <button onClick={() => openInvoiceEdit(r)}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Editar</button>
                                            {r.status === 'pending' && (
                                                <button onClick={() => doAction(`/financeiro/receber/${r.id}/cancel`, () => fetchInvoices(page))}
                                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Cancelar</button>
                                            )}
                                            <button onClick={() => doDelete(`/financeiro/receber/${r.id}`, () => fetchInvoices(1))}
                                                className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">Remover</button>
                                        </div>
                                    )},
                                ]}
                                data={invoiceData.invoices}
                            />
                            {invoiceData.invoices?.total > 15 && (
                                <Pagination links={invoiceData.invoices.links} onPage={(p) => { setPage(p); fetchInvoices(p); }} />
                            )}
                        </>
                    )}

                    <InvoiceFormModal
                        show={invoiceModal}
                        onClose={() => { setInvoiceModal(false); setEditingInvoice(null); fetchInvoices(page); }}
                        patients={patients}
                        categories={categories}
                        invoice={editingInvoice}
                    />
                </>
            )}

            {activeTab === 'pagar' && (
                <>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex gap-2 flex-1">
                            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Buscar por fornecedor ou descrição..."
                                className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Todos status</option>
                                <option value="pending">Pendente</option>
                                <option value="paid">Pago</option>
                                <option value="cancelled">Cancelado</option>
                            </select>
                            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Todas categorias</option>
                                {categories.filter(c => c.type === 'expense').map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={openExpenseCreate}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                            + Nova Conta a Pagar
                        </button>
                    </div>

                    {expenseLoading ? <Loading message="Carregando contas..." />
                    : expenseError ? <Error message={expenseError} onRetry={() => fetchExpenses(page)} />
                    : !expenseData?.expenses?.data?.length ? <Empty message="Nenhuma conta a pagar encontrada.">
                        <button onClick={openExpenseCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Criar Primeira Conta</button>
                    </Empty>
                    : (
                        <>
                            <Table
                                columns={[
                                    { key: 'supplier', label: 'Fornecedor', render: (r) => r.supplier || '-' },
                                    { key: 'description', label: 'Descrição' },
                                    { key: 'amount', label: 'Valor', render: (r) => FORMAT(r.amount) },
                                    { key: 'due_date', label: 'Vencimento', render: (r) => DATE(r.due_date) },
                                    { key: 'status', label: 'Status', render: (r) => (
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-800'}`}>
                                            {STATUS_LABEL[r.status] || r.status}
                                        </span>
                                    )},
                                    { key: 'actions', label: 'Ações', render: (r) => (
                                        <div className="flex gap-1">
                                            {r.status === 'pending' && (
                                                <button onClick={() => doAction(`/financeiro/pagar/${r.id}/pay`, () => fetchExpenses(page))}
                                                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Pagar</button>
                                            )}
                                            <button onClick={() => openExpenseEdit(r)}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Editar</button>
                                            {r.status === 'pending' && (
                                                <button onClick={() => doAction(`/financeiro/pagar/${r.id}/cancel`, () => fetchExpenses(page))}
                                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">Cancelar</button>
                                            )}
                                            <button onClick={() => doDelete(`/financeiro/pagar/${r.id}`, () => fetchExpenses(1))}
                                                className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700">Remover</button>
                                        </div>
                                    )},
                                ]}
                                data={expenseData.expenses}
                            />
                            {expenseData.expenses?.total > 15 && (
                                <Pagination links={expenseData.expenses.links} onPage={(p) => { setPage(p); fetchExpenses(p); }} />
                            )}
                        </>
                    )}

                    <ExpenseFormModal
                        show={expenseModal}
                        onClose={() => { setExpenseModal(false); setEditingExpense(null); fetchExpenses(page); }}
                        categories={categories}
                        expense={editingExpense}
                    />
                </>
            )}
        </div>
    );
}

// Sub-components
function SummaryCard({ title, value, color }) {
    return (
        <div className={`rounded-xl border p-4 ${color}`}>
            <p className="text-xs font-medium opacity-75">{title}</p>
            <p className="text-lg font-bold mt-1">{value}</p>
        </div>
    );
}

function Table({ columns, data }) {
    const rows = data?.data || [];
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {columns.map(col => (
                            <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={row.id || i} className="border-b border-gray-100 hover:bg-gray-50">
                            {columns.map(col => (
                                <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                                    {col.render ? col.render(row) : row[col.key] || '-'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Pagination({ links, onPage }) {
    if (!links) return null;
    return (
        <div className="flex items-center justify-center gap-1 mt-4">
            {links.map((link, i) => (
                <button
                    key={i}
                    disabled={!link.url || link.active}
                    onClick={() => link.url && onPage(new URL(link.url).searchParams.get('page') || 1)}
                    className={`px-3 py-1 text-sm rounded-lg ${
                        link.active
                            ? 'bg-blue-600 text-white'
                            : link.url ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' : 'text-gray-400'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

function Loading({ message }) {
    return (
        <div className="flex items-center justify-center py-16">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="ml-3 text-sm text-gray-500">{message}</span>
        </div>
    );
}

function Error({ message, onRetry }) {
    return (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4 flex items-center justify-between">
            <span>{message}</span>
            {onRetry && (
                <button onClick={onRetry} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 shrink-0">
                    Tentar novamente
                </button>
            )}
        </div>
    );
}

function Empty({ message, children }) {
    return (
        <div className="text-center py-16">
            <p className="text-gray-500 text-sm mb-4">{message}</p>
            {children}
        </div>
    );
}

// Reports tab with Recharts
function ReportsTab({ data }) {
    const hasMonthly = data.monthly?.some(m => m.receita > 0 || m.despesa > 0);
    const hasIncomeCat = data.incomeByCategory?.length > 0;
    const hasExpenseCat = data.expenseByCategory?.length > 0;

    return (
        <div className="space-y-6">
            {/* Monthly income vs expense */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Receita vs Despesa (últimos 12 meses)</h3>
                {!hasMonthly ? (
                    <p className="text-sm text-gray-500 text-center py-8">Nenhum dado de receita ou despesa no período.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" fontSize={12} />
                            <YAxis fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                            <Tooltip formatter={(v) => FORMAT(v)} />
                            <Legend />
                            <Bar dataKey="receita" name="Receita" fill="#22C55E" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="despesa" name="Despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income by category */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Receitas por Categoria</h3>
                    {!hasIncomeCat ? (
                        <p className="text-sm text-gray-500 text-center py-8">Nenhuma receita no ano.</p>
                    ) : (
                        <div className="flex flex-col items-center">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={data.incomeByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {data.incomeByCategory.map((entry, i) => (
                                            <Cell key={i} fill={entry.color || '#3B82F6'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => FORMAT(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                                {data.incomeByCategory.map(c => (
                                    <div key={c.name} className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                        <span className="truncate">{c.name}: {FORMAT(c.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Expense by category */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
                    {!hasExpenseCat ? (
                        <p className="text-sm text-gray-500 text-center py-8">Nenhuma despesa no ano.</p>
                    ) : (
                        <div className="flex flex-col items-center">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={data.expenseByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {data.expenseByCategory.map((entry, i) => (
                                            <Cell key={i} fill={entry.color || '#EF4444'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => FORMAT(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-2 mt-2 w-full">
                                {data.expenseByCategory.map(c => (
                                    <div key={c.name} className="flex items-center gap-2 text-xs text-gray-600">
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                        <span className="truncate">{c.name}: {FORMAT(c.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
