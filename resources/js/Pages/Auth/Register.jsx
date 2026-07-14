import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

// Mesmo padrão visual da tela de login: campos grandes (rounded-xl, py-3.5, ícone à esquerda).
const inputCls = 'w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15';
const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700';

const ICONS = {
    clinic: <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V8l7-4 7 4v13M10 21v-5h4v5M9 11h.01M15 11h.01" />,
    user: <><path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
    mail: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M3 8v10a1 1 0 001 1h16a1 1 0 001-1V8M3 8l1-2h16l1 2" />,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
};

function Field({ icon, children }) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">{ICONS[icon]}</svg>
            </span>
            {children}
        </div>
    );
}

export default function Register({ plans, selectedPlan }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        clinic_name: '',
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        plan: selectedPlan,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Criar conta — D_Med Clinic" />

            <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-900">Crie sua clínica</h1>
                <p className="mt-1 text-sm text-slate-500">7 dias grátis, sem cartão de crédito.</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <label htmlFor="clinic_name" className={labelCls}>Nome da clínica / consultório</label>
                    <Field icon="clinic">
                        <input id="clinic_name" name="clinic_name" value={data.clinic_name} autoFocus required
                            placeholder="Ex.: Clínica Vida Plena"
                            onChange={(e) => setData('clinic_name', e.target.value)} className={inputCls} />
                    </Field>
                    {errors.clinic_name && <p className="mt-1.5 text-sm text-rose-600">{errors.clinic_name}</p>}
                </div>

                <div>
                    <label htmlFor="name" className={labelCls}>Seu nome completo</label>
                    <Field icon="user">
                        <input id="name" name="name" value={data.name} autoComplete="name" required
                            placeholder="Ex.: Dra. Ana Souza"
                            onChange={(e) => setData('name', e.target.value)} className={inputCls} />
                    </Field>
                    {errors.name && <p className="mt-1.5 text-sm text-rose-600">{errors.name}</p>}
                </div>

                <div>
                    <label htmlFor="email" className={labelCls}>E-mail</label>
                    <Field icon="mail">
                        <input id="email" type="email" name="email" value={data.email} autoComplete="username" required
                            placeholder="voce@clinica.com.br"
                            onChange={(e) => setData('email', e.target.value)} className={inputCls} />
                    </Field>
                    {errors.email && <p className="mt-1.5 text-sm text-rose-600">{errors.email}</p>}
                </div>

                <div>
                    <label htmlFor="password" className={labelCls}>Senha</label>
                    <Field icon="lock">
                        <input id="password" type="password" name="password" value={data.password} autoComplete="new-password" required
                            placeholder="••••••••"
                            onChange={(e) => setData('password', e.target.value)} className={inputCls} />
                    </Field>
                    {errors.password && <p className="mt-1.5 text-sm text-rose-600">{errors.password}</p>}
                </div>

                <div>
                    <label htmlFor="password_confirmation" className={labelCls}>Confirmar senha</label>
                    <Field icon="lock">
                        <input id="password_confirmation" type="password" name="password_confirmation" value={data.password_confirmation} autoComplete="new-password" required
                            placeholder="••••••••"
                            onChange={(e) => setData('password_confirmation', e.target.value)} className={inputCls} />
                    </Field>
                    {errors.password_confirmation && <p className="mt-1.5 text-sm text-rose-600">{errors.password_confirmation}</p>}
                </div>

                <div>
                    <label className={labelCls}>Plano</label>
                    <div className="space-y-2">
                        {Object.entries(plans).map(([key, plan]) => (
                            <label
                                key={key}
                                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${
                                    data.plan === key ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20' : 'border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value={key}
                                        checked={data.plan === key}
                                        onChange={() => setData('plan', key)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                        <span className="block text-[15px] font-medium text-slate-800">{plan.name}</span>
                                        <span className="block text-xs text-slate-500">{plan.description}</span>
                                    </span>
                                </span>
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {plan.doctors ?? '∞'} médico(s) · {plan.staff ?? '∞'} staff
                                </span>
                            </label>
                        ))}
                    </div>
                    {errors.plan && <p className="mt-1.5 text-sm text-rose-600">{errors.plan}</p>}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing && (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    )}
                    {processing ? 'Criando clínica...' : 'Começar 7 dias grátis'}
                </button>

                <p className="text-center text-sm text-slate-500">
                    Já tem conta?{' '}
                    <Link href={route('login')} className="font-medium text-blue-600 hover:text-blue-700">
                        Entrar
                    </Link>
                </p>
            </form>
        </GuestLayout>
    );
}
