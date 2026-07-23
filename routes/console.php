<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Lembrete de 24h da consulta (WhatsApp). A cada 15 min porque o comando trabalha com janela
 * de 23h–25h: assim uma rodada que falhe não faz ninguém perder o lembrete.
 *
 * ⚠️ O scheduler do Laravel só anda se alguém chamar `schedule:run` a cada minuto. O container
 * NÃO tem cron (o supervisord roda só php-fpm e nginx) — quem dispara é o crontab do HOST:
 *     * * * * * docker exec -u www-data dmedclinic-app php artisan schedule:run >/dev/null 2>&1
 * É no host porque o container é recriado a partir da imagem; cron no host sobrevive a isso
 * sem depender de rebuild.
 */
Schedule::command('appointments:send-reminders')
    ->everyFifteenMinutes()
    ->withoutOverlapping();

/*
 * Parabéns de aniversário (07:00 por padrão, configurável por clínica). Mesma cadência de 15
 * min pelo mesmo motivo: o comando compara com a hora escolhida e marca quem já recebeu, então
 * rodar de novo não duplica — e uma rodada que falhe não faz ninguém perder o parabéns.
 */
Schedule::command('patients:send-birthday-greetings')
    ->everyFifteenMinutes()
    ->withoutOverlapping();
