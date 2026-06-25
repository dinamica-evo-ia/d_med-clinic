import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });
    const [showPwd, setShowPwd] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), { onFinish: () => reset('password') });
    };

    return (
        <GuestLayout>
            <Head title="Entrar — D_Med Clinic" />

            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bem-vindo de volta</h1>
                <p className="mt-2 text-[15px] text-slate-500">Entre na sua conta para continuar.</p>
            </div>

            {status && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                {/* E-mail */}
                <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
                    <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M3 8v10a1 1 0 001 1h16a1 1 0 001-1V8M3 8l1-2h16l1 2" /></svg>
                        </span>
                        <input
                            id="email" type="email" name="email" value={data.email} autoComplete="username" autoFocus required
                            placeholder="voce@clinica.com.br"
                            onChange={(e) => setData('email', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                        />
                    </div>
                    {errors.email && <p className="mt-1.5 text-sm text-rose-600">{errors.email}</p>}
                </div>

                {/* Senha */}
                <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
                    <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>
                        </span>
                        <input
                            id="password" type={showPwd ? 'text' : 'password'} name="password" value={data.password} autoComplete="current-password" required
                            placeholder="••••••••"
                            onChange={(e) => setData('password', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 py-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                        />
                        <button type="button" onClick={() => setShowPwd((v) => !v)} tabIndex={-1}
                            aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                            {showPwd ? (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.22A10.5 10.5 0 0021 12c-1.3 2.9-4.7 5.5-9 5.5-1.2 0-2.3-.2-3.3-.6M6.2 6.2A10.4 10.4 0 003 12m3.2-5.8L3 3m3.2 3.2L21 21" /></svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
                            )}
                        </button>
                    </div>
                    {errors.password && <p className="mt-1.5 text-sm text-rose-600">{errors.password}</p>}
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                        <input type="checkbox" name="remember" checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        Lembrar de mim
                    </label>
                    {canResetPassword && (
                        <Link href={route('password.request')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                            Esqueci minha senha
                        </Link>
                    )}
                </div>

                <button type="submit" disabled={processing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60">
                    {processing && (
                        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                    )}
                    {processing ? 'Entrando...' : 'Entrar'}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-500">
                Ainda não tem conta?{' '}
                <Link href={route('register')} className="font-semibold text-blue-600 hover:text-blue-700">Criar conta grátis</Link>
            </p>
        </GuestLayout>
    );
}
