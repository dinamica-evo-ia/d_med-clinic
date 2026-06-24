import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

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
                    <InputLabel htmlFor="clinic_name" value="Nome da clínica / consultório" />
                    <TextInput
                        id="clinic_name"
                        name="clinic_name"
                        value={data.clinic_name}
                        className="mt-1 block w-full"
                        placeholder="Ex.: Clínica Vida Plena"
                        isFocused={true}
                        required
                        onChange={(e) => setData('clinic_name', e.target.value)}
                    />
                    <InputError message={errors.clinic_name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="name" value="Seu nome completo" />
                    <TextInput
                        id="name"
                        name="name"
                        value={data.name}
                        className="mt-1 block w-full"
                        autoComplete="name"
                        required
                        onChange={(e) => setData('name', e.target.value)}
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="E-mail" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        placeholder="voce@clinica.com.br"
                        required
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Senha" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        required
                        onChange={(e) => setData('password', e.target.value)}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="password_confirmation" value="Confirmar senha" />
                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        required
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                    />
                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <div>
                    <InputLabel value="Plano" />
                    <div className="mt-2 space-y-2">
                        {Object.entries(plans).map(([key, plan]) => (
                            <label
                                key={key}
                                className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 cursor-pointer transition ${
                                    data.plan === key ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value={key}
                                        checked={data.plan === key}
                                        onChange={() => setData('plan', key)}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>
                                        <span className="block text-sm font-medium text-slate-800">{plan.name}</span>
                                        <span className="block text-xs text-slate-500">{plan.description}</span>
                                    </span>
                                </span>
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {plan.doctors ?? '∞'} médico(s) · {plan.staff ?? '∞'} staff
                                </span>
                            </label>
                        ))}
                    </div>
                    <InputError message={errors.plan} className="mt-2" />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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
