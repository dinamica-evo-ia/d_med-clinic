<?php

/*
 * Web Push (VAPID) — avisos do PWA pro médico (ex.: "consulta marcada").
 *
 * As chaves vivem no .env.runtime do VPS (geradas com VAPID::createVapidKeys()).
 * A PUBLIC vai pro navegador (é pública por design); a PRIVATE é segredo e nunca sai do servidor.
 * Sem chaves configuradas, o push simplesmente não é oferecido (enabled() = false) — nada quebra.
 */
return [
    // "mailto:" ou URL do responsável — exigido pelo padrão VAPID (serviços de push usam
    // pra te contatar se algo estiver errado com o envio).
    'subject' => env('VAPID_SUBJECT', 'mailto:contato@dmedclinic.com.br'),

    'public_key' => env('VAPID_PUBLIC_KEY'),
    'private_key' => env('VAPID_PRIVATE_KEY'),
];
