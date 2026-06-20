<?php

namespace App\Http\Controllers;

use App\Models\CidCode;
use Illuminate\Http\Request;

class CidCodeController extends Controller
{
    public function search(Request $request)
    {
        $request->validate(['q' => 'required|string|min:2']);

        $results = CidCode::search($request->q)->get();

        return response()->json($results);
    }
}
