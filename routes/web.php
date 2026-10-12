<?php

use Illuminate\Support\Facades\Route;

// Saat orang buka domain utama, arahkan otomatis ke halaman login
Route::get('/', function () {
    return redirect('/pages/login/index.html');
});
