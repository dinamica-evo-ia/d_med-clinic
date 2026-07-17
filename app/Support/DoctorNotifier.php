<?php

namespace App\Support;

use App\Models\Appointment;
use App\Models\User;
use Carbon\Carbon;

/**
 * Avisos pro MÉDICO (push no PWA). Complementa o AttendantNotifier, que avisa o PACIENTE
 * no WhatsApp.
 *
 * Buraco que isto fecha: a IA marcava consulta às 22h e o médico só descobria abrindo o CRM —
 * não existia UMA notificação indo pro médico em todo o sistema (levantado em 2026-07-16).
 *
 * Nunca lança: aviso que falha não pode derrubar o agendamento (ver WebPush, que já engole
 * qualquer erro). O agendamento é o que importa; o aviso é acessório.
 */
class DoctorNotifier
{
    public static function consultaMarcada(Appointment $appt): void
    {
        $user = self::usuarioDoMedico($appt);
        if (! $user) {
            return;
        }

        // Não avisa o próprio médico quando FOI ELE quem marcou — ele acabou de fazer isso.
        // (Consulta marcada pela IA vem com user_id null, então o aviso sai normalmente.)
        if ($appt->user_id && $appt->user_id === $user->id) {
            return;
        }

        $tz = config('app.timezone');
        $quando = Carbon::parse($appt->starts_at)->setTimezone($tz);
        $paciente = $appt->patient?->name ?? 'Paciente';
        $origem = $appt->source === 'atende' ? ' (pelo WhatsApp)' : '';

        WebPush::paraUsuario(
            $user,
            'Nova consulta marcada'.$origem,
            $paciente.' — '.$quando->isoFormat('ddd D/MM [às] HH:mm'),
            '/app?data='.$quando->toDateString(), // abre o app já no dia da consulta
        );
    }

    /** Dono da agenda: consulta → ficha do médico → usuário que loga (users, central). */
    private static function usuarioDoMedico(Appointment $appt): ?User
    {
        $doctor = $appt->doctor ?? $appt->doctor()->first();

        return $doctor?->user_id ? User::find($doctor->user_id) : null;
    }
}
