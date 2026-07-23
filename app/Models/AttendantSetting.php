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
        'business_hours', 'autonomy', 'provider', 'waduck_instance', 'waduck_api_url',
        'waduck_api_key', 'instance_token', 'waduck_phone', 'webhook_token', 'connected_at',
        'reminder_enabled', 'reminder_days_before', 'reminder_hour',
        'reminder_insist', 'insist_hours_before',
        'birthday_enabled', 'birthday_hour', 'birthday_message',
    ];

    /** Texto padrão do parabéns. {nome} é trocado pelo primeiro nome do paciente. */
    public const BIRTHDAY_PADRAO = "Feliz aniversário, {nome}! 🎉\n\n"
        .'Toda a equipe deseja um dia especial e muita saúde pra você. '
        .'Conte com a gente sempre que precisar. 💙';

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'business_hours' => 'array',
            'connected_at' => 'datetime',
            'reminder_enabled' => 'boolean',
            'reminder_insist' => 'boolean',
            'reminder_days_before' => 'integer',
            'insist_hours_before' => 'integer',
            'birthday_enabled' => 'boolean',
        ];
    }

    /** Hora do parabéns (padrão 07:00 — antes de a clínica abrir). */
    public function horaDoParabens(): string
    {
        return preg_match('/^\d{2}:\d{2}$/', (string) $this->birthday_hour) ? $this->birthday_hour : '07:00';
    }

    /** Texto do parabéns pra ESTE paciente, com o {nome} já trocado. */
    public function textoDoParabens(string $nomeCompleto): string
    {
        $texto = trim((string) $this->birthday_message) ?: self::BIRTHDAY_PADRAO;
        // Primeiro nome: "Maria da Silva" → "Maria". Mensagem de parabéns com nome completo
        // soa a cobrança de banco.
        $primeiro = trim(explode(' ', trim($nomeCompleto))[0] ?? '');

        return str_replace(['{nome}', '{NOME}'], $primeiro, $texto);
    }

    /** 1 ou 2 dias — o que a clínica escolheu, com piso e teto pra não vir lixo do banco. */
    public function diasDeAntecedencia(): int
    {
        return max(1, min(2, (int) ($this->reminder_days_before ?: 1)));
    }

    /** Hora do disparo do lembrete, no fuso da clínica. */
    public function horaDoLembrete(): string
    {
        return preg_match('/^\d{2}:\d{2}$/', (string) $this->reminder_hour) ? $this->reminder_hour : '09:00';
    }

    /** Quantas horas antes da consulta a IA insiste com quem não respondeu. */
    public function horasParaInsistir(): int
    {
        return max(1, min(12, (int) ($this->insist_hours_before ?: 3)));
    }

    /**
     * Base da API do provedor. Delegado ao provider (cada um tem seu default).
     * Mantido por compatibilidade — prefira `Whatsapp::for($s)`.
     */
    public function apiBaseUrl(): string
    {
        return \App\Support\Whatsapp\Whatsapp::for($this)->baseUrl();
    }

    /** Config da clínica atual, criando a linha padrão se ainda não existe. */
    public static function current(): self
    {
        return static::query()->firstOrCreate([], [
            'enabled' => false,
            'bot_name' => 'Atendente',
            'autonomy' => 'suggest',
            'provider' => 'waduck',
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
