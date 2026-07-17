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
        if (! $user = self::destinatario($appt)) {
            return;
        }

        $quando = self::quando($appt->starts_at);

        WebPush::paraUsuario(
            $user,
            'Nova consulta marcada'.self::origem($appt),
            self::paciente($appt).' — '.$quando->isoFormat('ddd D/MM [às] HH:mm'),
            '/app?data='.$quando->toDateString(), // abre o app já no dia da consulta
        );
    }

    /**
     * Horário mudou. Pro médico isto costuma pesar MAIS que uma consulta nova — muda o dia dele.
     * Mostra de/para: só "mudou" obrigaria ele a abrir o CRM pra descobrir o quê.
     */
    public static function consultaRemarcada(Appointment $appt, $horarioAntigo = null): void
    {
        if (! $user = self::destinatario($appt)) {
            return;
        }

        $novo = self::quando($appt->starts_at);
        $antes = $horarioAntigo ? self::quando($horarioAntigo)->isoFormat('ddd D/MM HH:mm').' → ' : '';

        WebPush::paraUsuario(
            $user,
            'Consulta remarcada'.self::origem($appt),
            self::paciente($appt).': '.$antes.$novo->isoFormat('ddd D/MM [às] HH:mm'),
            '/app?data='.$novo->toDateString(),
        );
    }

    /**
     * Cancelou. O caso ruim que isto evita: paciente cancela pela IA às 22h e o médico aparece
     * na clínica esperando atender.
     */
    public static function consultaCancelada(Appointment $appt): void
    {
        if (! $user = self::destinatario($appt)) {
            return;
        }

        $quando = self::quando($appt->starts_at);

        WebPush::paraUsuario(
            $user,
            'Consulta cancelada'.self::origem($appt),
            self::paciente($appt).' — '.$quando->isoFormat('ddd D/MM [às] HH:mm'),
            '/app?data='.$quando->toDateString(),
        );
    }

    /**
     * Quem deve receber o aviso — ou null se não há a quem avisar.
     *
     * Regra central dos 3 avisos: NUNCA avisa quem acabou de fazer a ação. Ação da IA ou do
     * paciente vem com user_id null, então o aviso sai — que é justamente o caso que importa.
     */
    private static function destinatario(Appointment $appt): ?User
    {
        $user = self::usuarioDoMedico($appt);
        if (! $user) {
            return null;
        }

        return ($appt->user_id && $appt->user_id === $user->id) ? null : $user;
    }

    /** "(pelo WhatsApp)" quando veio do Atende — o médico saber a origem muda a leitura. */
    private static function origem(Appointment $appt): string
    {
        return $appt->source === 'atende' ? ' (pelo WhatsApp)' : '';
    }

    private static function paciente(Appointment $appt): string
    {
        return $appt->patient?->name ?? 'Paciente';
    }

    private static function quando($valor): Carbon
    {
        return Carbon::parse($valor)->setTimezone(config('app.timezone'));
    }

    /** Dono da agenda: consulta → ficha do médico → usuário que loga (users, central). */
    private static function usuarioDoMedico(Appointment $appt): ?User
    {
        $doctor = $appt->doctor ?? $appt->doctor()->first();

        return $doctor?->user_id ? User::find($doctor->user_id) : null;
    }
}
