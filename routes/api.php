<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public Endpoint (Login)
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected Endpoints (Perlu Bearer Token)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});

use App\Http\Controllers\Api\GuruController;

Route::middleware('auth:sanctum')->group(function () {
    // Auth Routes
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Guru Routes
    Route::get('/guru/siswa', [GuruController::class, 'index']);
    Route::post('/guru/penilaian', [GuruController::class, 'simpanPenilaian']);
});