<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Config do "D_Med Atende" — uma linha por clínica (tenant). Singleton via current().
 */
class AttendantSetting extends Model
{
    protected $fillable = [
        'enabled', 'bot_name', 'persona', 'tone', 'welcome_message', 'offhours_message',
        'business_hours', 'autonomy', 'waduck_instance', 'waduck_api_url', 'waduck_api_key',
        'waduck_phone', 'webhook_token', 'connected_at',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'business_hours' => 'array',
            'connected_at' => 'datetime',
        ];
    }

    /** Base da API do provedor de WhatsApp (WADuck), com default. */
    public function apiBaseUrl(): string
    {
        return rtrim($this->waduck_api_url ?: 'https://api.waduck.pro', '/');
    }

    /** Config da clínica atual, criando a linha padrão se ainda não existe. */
    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'enabled' => false,
            'bot_name' => 'Atendente',
            'autonomy' => 'suggest',
        ]);
    }

    /** Conectado ao WhatsApp? (Fase 2 preenche estes campos.) */
    public function isWhatsappConnected(): bool
    {
        return ! empty($this->waduck_instance) && ! empty($this->waduck_api_key);
    }

    /**
     * Está dentro do horário de atendimento do bot? Sem horário configurado = sempre aberto.
     * business_hours = ['open'=>'08:00','close'=>'18:00','weekends'=>false].
     */
    public function isWithinBusinessHours(?\Carbon\CarbonInterface $now = null): bool
    {
        $bh = $this->business_hours;
        if (! is_array($bh) || empty($bh['open']) || empty($bh['close'])) {
            return true;
        }
        $now = $now ?: \Carbon\Carbon::now('America/Sao_Paulo');
        if ($now->isWeekend() && empty($bh['weekends'])) {
            return false;
        }
        $t = $now->format('H:i');

        return $t >= $bh['open'] && $t <= $bh['close'];
    }
}
