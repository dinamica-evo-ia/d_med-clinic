<!DOCTYPE html>
{{-- lang pt-BR + translate="no" + meta notranslate: impede o Google Tradutor do navegador
     de mexer no DOM (isso quebra o React com "insertBefore NotFoundError" / tela branca). --}}
<html lang="pt-BR" translate="no">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="google" content="notranslate">
        <meta name="robots" content="notranslate">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        <link rel="icon" type="image/png" href="/favicon.png">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased notranslate">
        @inertia
    </body>
</html>
