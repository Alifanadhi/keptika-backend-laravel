<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Siswa;
use App\Models\Penilaian;
use Illuminate\Http\Request;

class GuruController extends Controller
{
    // Mengambil daftar siswa
    public function index()
    {
        $siswas = Siswa::with('kelas')->get();
        return response()->json([
            'status' => 'success',
            'data'   => $siswas
        ]);
    }

    // Input penilaian kompetensi siswa
    public function simpanPenilaian(Request $request)
    {
        $request->validate([
            'siswa_id'      => 'required|exists:siswas,id',
            'kompetensi_id' => 'required|exists:kompetensis,id',
            'nilai'         => 'required|integer|min:0|max:100',
            'catatan'       => 'nullable|string',
        ]);

        $penilaian = Penilaian::create([
            'siswa_id'      => $request->siswa_id,
            'kompetensi_id' => $request->kompetensi_id,
            'guru_id'       => $request->user()->id, // Diambil dari token Sanctum
            'nilai'         => $request->nilai,
            'catatan'       => $request->catatan,
            'status'        => 'pending',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Penilaian berhasil disimpan',
            'data'    => $penilaian
        ], 201);
    }
}