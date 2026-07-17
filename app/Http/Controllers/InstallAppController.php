<?php

namespace App\Http\Controllers;

use App\Models\AttendantSetting;
use App\Models\Doctor;
use App\Models\LoginToken;
use App\Support\Whatsapp\Whatsapp;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * "Instalar o app no celular" — tira a fricção de o médico levar o CRM pro telefone.
 *
 * O problema que resolve: sem isto, o médico precisa saber que o /app existe, digitar a URL no
 * celular, logar com e-mail e senha no teclado do telefone, e ainda descobrir sozinho o
 * "Adicionar à Tela de Início". São 4 chances de desistir.
 *
 * Aqui ele escaneia um QR (ou recebe o link no WhatsApp) e o celular abre JÁ LOGADO.
 */
class InstallAppController extends Controller
{
    public function show(Request $request)
    {
        $doctor = Doctor::paraUsuario($request->user());
        $s = AttendantSetting::current();

        return Inertia::render('Account/InstalarApp', [
            'qr' => $this->novoQr($request),
            'validade_segundos' => LoginToken::VALIDADE_SEGUNDOS,
            'whatsapp' => [
                // Só oferece o envio se a clínica tem WhatsApp conectado E a ficha do médico
                // tem telefone — senão o botão prometeria algo que não acontece.
                'disponivel' => $s->isWhatsappConnected() && ! empty($doctor?->phone),
                'telefone_mascarado' => $doctor?->phone ? self::mascarar($doctor->phone) : null,
            ],
        ]);
    }

    /** Gera um QR novo (o anterior morre). Usado pelo botão "gerar outro" quando expira. */
    public function refresh(Request $request)
    {
        return response()->json($this->novoQr($request));
    }

    /**
     * Manda o link pro WhatsApp do próprio médico. Em vez de QR: ele toca no link no celular
     * e pronto. É o gesto que ele já faz o dia todo.
     */
    public function enviarWhatsapp(Request $request)
    {
        $doctor = Doctor::paraUsuario($request->user());
        $s = AttendantSetting::current();

        if (! $s->isWhatsappConnected()) {
            return back()->with('error', 'O WhatsApp da clínica não está conectado.');
        }
        if (empty($doctor?->phone)) {
            return back()->with('error', 'Sua ficha de médico não tem telefone cadastrado.');
        }

        $link = $this->novoQr($request)['url'];
        $texto = "🩺 *D_Med Clinic — app no seu celular*\n\n"
            ."Toque no link abaixo pra abrir já logado (vale por 2 minutos):\n{$link}\n\n"
            .'Depois: no iPhone, *Compartilhar → Adicionar à Tela de Início*. No Android, toque em *Instalar*.';

        $id = Whatsapp::sendText($s, self::comDdi($doctor->phone), $texto);

        return back()->with($id ? 'success' : 'error',
            $id ? 'Link enviado pro seu WhatsApp. Toque nele pelo celular.' : 'Não consegui enviar. Tente o QR.');
    }

    /**
     * O celular escaneou/tocou no link. Valida, loga e manda pro app.
     *
     * Sem auth: é justamente o ponto de ENTRADA. A segurança está no token (hash + 2min + uso
     * único, ver LoginToken). Mensagem de erro é genérica de propósito — não dizemos se o token
     * existiu, expirou ou já foi usado, pra não virar oráculo.
     */
    public function entrar(Request $request, string $token)
    {
        $t = LoginToken::consumir($token, $request->userAgent());

        if (! $t || ! $t->user) {
            return redirect()->route('login')
                ->with('error', 'Este link expirou ou já foi usado. Gere um novo QR no computador.');
        }

        Auth::login($t->user, remember: true); // remember: o médico não vai querer relogar toda hora

        // A sessão do celular nasce zerada — sem isto o tenancy.by_user não saberia qual clínica
        // abrir pra quem tem acesso a mais de uma.
        if ($t->tenant_slug) {
            session(['tenant_slug' => $t->tenant_slug]);
        }
        $request->session()->regenerate();

        return redirect('/app');
    }

    /** Monta o token + a URL + o SVG do QR. */
    private function novoQr(Request $request): array
    {
        $cru = LoginToken::gerar($request->user(), tenant()?->slug);
        $url = url('/app/entrar/'.$cru);

        $renderer = new ImageRenderer(new RendererStyle(240, 1), new SvgImageBackEnd());
        $svg = (new Writer($renderer))->writeString($url);

        return [
            'url' => $url,
            // data URI: o SVG vai inline na tela, sem precisar de rota de imagem nem storage.
            'svg' => 'data:image/svg+xml;base64,'.base64_encode($svg),
            'expira_em' => now()->addSeconds(LoginToken::VALIDADE_SEGUNDOS)->toIso8601String(),
        ];
    }

    /** Brasil: número sem DDI vira 55… (mesma regra do resto do Atende). */
    private static function comDdi(string $fone): string
    {
        $d = preg_replace('/\D/', '', $fone);

        return str_starts_with($d, '55') ? $d : '55'.$d;
    }

    private static function mascarar(string $fone): string
    {
        $d = preg_replace('/\D/', '', $fone);

        return strlen($d) >= 4 ? str_repeat('•', max(0, strlen($d) - 4)).substr($d, -4) : $d;
    }
}
