<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InitializeTenancyByUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check()) {
            return $next($request);
        }

        $tenantSlug = session('tenant_slug');
        $tenant = null;

        if ($tenantSlug) {
            $tenant = Tenant::where('slug', $tenantSlug)->first();
        }

        if (!$tenant) {
            $tenants = auth()->user()->tenants()->wherePivot('is_active', true)->get();
            if ($tenants->count() === 1) {
                $tenant = $tenants->first();
                session(['tenant_slug' => $tenant->slug]);
            }
        }

        if ($tenant) {
            tenancy()->initialize($tenant);
        }

        return $next($request);
    }
}
