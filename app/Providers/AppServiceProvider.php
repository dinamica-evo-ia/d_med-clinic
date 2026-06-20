<?php

namespace App\Providers;

use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(\App\Contracts\AiProvider::class, function ($app) {
            $driver = config('services.ai.provider', 'openai');

            return match ($driver) {
                'claude' => new \App\Services\Ai\Providers\ClaudeProvider(),
                default  => new \App\Services\Ai\Providers\OpenAiProvider(),
            };
        });

        $this->app->singleton(\App\Services\Ai\AiService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
    }
}
