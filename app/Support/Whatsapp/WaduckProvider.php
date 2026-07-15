<?php

namespace App\Support\Whatsapp;

/**
 * WADuck — Evolution hospedada por terceiro. Pareamento do número é feito no painel deles;
 * aqui só entram instância + chave já prontas.
 */
class WaduckProvider extends WhatsappProvider
{
    public function label(): string
    {
        return 'WADuck';
    }

    protected function prefix(): string
    {
        return '/v1';
    }

    public function defaultBaseUrl(): string
    {
        return 'https://api.waduck.pro';
    }
}
