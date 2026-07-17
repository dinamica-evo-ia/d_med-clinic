<?php

namespace App\Support;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush as Sender;

/**
 * Envia Web Push pros aparelhos do médico (PWA instalado).
 *
 * ⚠️ Envio SÍNCRONO de propósito: não existe worker de fila no container (QUEUE_CONNECTION é
 * "database", mas o supervisord só roda php-fpm + nginx — um dispatch() ficaria parado pra
 * sempre). Segue o mesmo desenho do AttendantNotifier, que já manda WhatsApp de forma síncrona.
 * É 1 request HTTP curto e SEMPRE embrulhado em try/catch: aviso que falha NUNCA pode derrubar
 * o agendamento da consulta.
 */
class WebPush
{
    /** Sem chaves VAPID configuradas, o push fica desligado — e nada quebra. */
    public static function configurado(): bool
    {
        return ! empty(config('webpush.public_key')) && ! empty(config('webpush.private_key'));
    }

    /**
     * Manda pra todos os aparelhos do usuário. Devolve quantos foram entregues.
     * Inscrição morta (aparelho desinstalou / expirou) é REMOVIDA — senão a tabela vira lixo
     * e todo envio futuro gasta tempo tentando endpoint que não existe mais.
     */
    public static function paraUsuario(?User $user, string $titulo, string $corpo, string $url = '/app'): int
    {
        if (! $user || ! self::configurado()) {
            return 0;
        }

        $inscricoes = PushSubscription::where('user_id', $user->id)->get();
        if ($inscricoes->isEmpty()) {
            return 0;
        }

        try {
            $sender = new Sender(['VAPID' => [
                'subject' => config('webpush.subject'),
                'publicKey' => config('webpush.public_key'),
                'privateKey' => config('webpush.private_key'),
            ]]);

            $payload = json_encode([
                'title' => $titulo,
                'body' => $corpo,
                'url' => $url,
            ], JSON_UNESCAPED_UNICODE);

            foreach ($inscricoes as $i) {
                $sender->queueNotification(
                    Subscription::create([
                        'endpoint' => $i->endpoint,
                        'keys' => ['p256dh' => $i->p256dh, 'auth' => $i->auth],
                    ]),
                    $payload
                );
            }

            $ok = 0;
            foreach ($sender->flush() as $report) {
                if ($report->isSuccess()) {
                    $ok++;
                    continue;
                }
                // 404/410 = inscrição morta pro serviço de push. Limpa.
                if ($report->isSubscriptionExpired()) {
                    PushSubscription::where('endpoint', $report->getEndpoint())->delete();
                } else {
                    Log::warning('WebPush falhou: '.$report->getReason());
                }
            }

            if ($ok > 0) {
                PushSubscription::whereIn('id', $inscricoes->pluck('id'))->update(['last_sent_at' => now()]);
            }

            return $ok;
        } catch (\Throwable $e) {
            Log::warning('WebPush erro: '.$e->getMessage());
            return 0;
        }
    }
}
