# Kontrak API — DSS Kelas Praktik

Frontend sudah memanggil semua endpoint di bawah. Bentuk respons harus
sama persis; kalau cocok, frontend jalan tanpa diubah.

## Menyambungkan

`js/core/config.js`:

```js
USE_MOCK: false,
API_BASE: '/api',    // atau URL penuh server
```

Kalau aplikasi tidak di root domain (mis. `situs.com/dss/`), `API_BASE`
perlu disesuaikan. Navigasi antar-halaman sudah relatif, jadi hanya baris
ini yang terpengaruh.

Hapus folder `js/mock/` sebelum deploy — berisi sandi tertulis polos.

## Yang wajib di server

`guard.js` hanya mengatur navigasi. Session bisa dipalsukan lewat DevTools
untuk membuka halaman admin. Yang mencegah kebocoran data adalah server.

- Validasi token di setiap request
- Cek peran di setiap endpoint — jangan percaya `role` dari klien
- Rate limit login (frontend cuma menahan UI)
- Prepared statement
- bcrypt, salt rounds 10
- Sanitasi input

## Autentikasi

Header setiap request:

```
Authorization: Bearer <token>
```

Token tidak sah → balas `401`. Frontend otomatis bersihkan sesi dan
lempar ke login.

### `POST /auth/login`

```json
{ "username": "guru.siti", "password": "..." }
```

**200**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 2,
    "username": "guru.siti",
    "nama": "Siti Rahmawati",
    "role": "guru",
    "kelas_ampu": [1]
  }
}
```

`role`: `admin` | `guru` | `siswa`.

**401**
```json
{ "message": "Username atau kata sandi salah." }
```

Pesan harus sama untuk username salah dan sandi salah. Kalau dibedakan,
daftar username valid bisa ditebak satu per satu.

**403** — akun nonaktif
```json
{ "message": "Akun ini dinonaktifkan. Hubungi admin sekolah." }
```

### `POST /auth/logout`
### `GET /auth/me` → `{ user }`
### `PUT /auth/password`

```json
{ "password_lama": "...", "password_baru": "..." }
```

Tidak ada endpoint "lupa sandi". Reset hanya lewat
`PUT /admin/user/:id/password`. Siswa SMK sering tidak punya email aktif.

## Guru

### `POST /guru/penilaian`

```json
{
  "siswa_id": 4,
  "kompetensi_id": 1,
  "P": 2, "E": 6, "K": 3, "G": 45,
  "ketepatan_waktu": "terlambat_ringan",
  "riwayat_intervensi": false
}
```

- `P`, `K` — rubrik 1–5
- `E` — jumlah kesalahan
- `G` — progres 0–100
- `ketepatan_waktu` — `tepat` | `terlambat_ringan` | `terlambat_berat`

**Respons**
```json
{
  "penilaian_id": 5,
  "rekomendasi_code": "R1",
  "rekomendasi_label": "Bimbingan intensif",
  "rekomendasi_alasan": "Kesalahan berulang menandakan konsep dasar belum tertanam."
}
```

Logika rekomendasi harus direplikasi dari `js/core/rules.js` — lihat
bagian Rule engine di bawah.

### `GET /guru/siswa/:id`

```json
{
  "siswa": { "id": 4, "nama": "...", "nis": "...", "kelas": "XI TKR 1" },
  "penilaian_list": [],
  "laporan_list": []
}
```

### `GET /guru/kelas/:id/dashboard?kompetensi_id=1`

```json
{
  "siswa_list": [
    {
      "siswa": { "id": 4, "nama": "Andi Pratama", "nis": "..." },
      "penilaian": { "P": 2, "E": 6, "K": 3, "G": 45, "rekomendasi_code": "R1" },
      "laporan": { "progres": 60, "kendala": ["..."], "catatan": "..." }
    }
  ],
  "rekomendasi_kelas": [
    { "code": "RK1", "label": "...", "alasan": "30% siswa..." }
  ],
  "ringkasan": {
    "perlu_intervensi": 2,
    "perlu_dorongan": 1,
    "penguatan": 1,
    "pantau": 1
  }
}
```

`penilaian` dan `laporan` boleh `null`.

### `PUT /guru/penilaian/:id/status`

```json
{ "status": "diterima" }
```

`diterima` | `diubah` | `ditolak`.

### `GET /guru/notifikasi`

```json
{
  "notifikasi_list": [
    {
      "id": 1,
      "tipe": "laporan_siswa",
      "judul": "Laporan baru dari Andi Pratama",
      "pesan": "...",
      "link": "siswa.html?id=4",
      "dibaca": false,
      "created_at": "2026-07-10T09:15:00"
    }
  ]
}
```

`link` relatif terhadap folder peran (`pages/guru/`), bukan absolut.

### `PUT /notifikasi/:id/baca`
### `PUT /notifikasi/baca-semua`

Belum diimplementasi di frontend — status baca masih disimpan di memori
saja. Tandai `TODO(backend)` di `js/core/shell.js`.

## Siswa

### `POST /siswa/laporan`

```json
{
  "kompetensi_id": 1,
  "tahapan_selesai": ["t1", "t2", "t3"],
  "status": "belum_selesai",
  "waktu_selesai": null,
  "keterlibatan_self": 3,
  "kendala": ["Belum paham langkah kerja"],
  "catatan": "..."
}
```

`tahapan_selesai` berisi **ID tahapan**, bukan array 0/1. Simpan juga
`total_tahapan` (jumlah tahapan kompetensi saat laporan dibuat) — dipakai
menghitung progres. Kalau admin nanti mengubah jumlah tahapan, progres
laporan lama tetap benar.

`siswa_id` tidak dikirim — ambil dari token. Kalau diterima dari body,
siswa bisa mengirim laporan atas nama orang lain.

Efek samping: buat notifikasi untuk guru pengampu.

### `GET /siswa/riwayat`

```json
{
  "laporan_list": [
    {
      "id": 1,
      "kompetensi_nama": "Servis Sistem Rem Cakram",
      "progres": 60,
      "status": "belum_selesai",
      "kendala": ["..."],
      "feedback_guru": null,
      "created_at": "..."
    }
  ]
}
```

`progres` dihitung server: `(tahapan selesai / total) × 100`.

### `GET /siswa/notifikasi`

## Admin

### `GET /admin/user?role=&status=&q=&page=&limit=`

```json
{ "user_list": [], "total": 8 }
```

Jangan pernah kirim `password_hash`, sekalipun sudah di-hash.

### `POST /admin/user`

```json
{ "username": "siswa.budi", "password": "...", "role": "siswa", "nama": "Budi" }
```

Username duplikat → `409` + `{ "message": "Username sudah dipakai. Pilih yang lain." }`

### `PUT /admin/user/:id`
### `DELETE /admin/user/:id`

Soft delete — isi `deleted_at`, jangan hapus baris. Data penilaian
historis harus tetap utuh untuk penelitian.

### `PUT /admin/user/:id/password`

```json
{ "password_baru": "..." }
```

### `GET /admin/kompetensi`
### `GET /admin/kelas`
### `GET /admin/dashboard`

```json
{
  "user_aktif": 7,
  "total_guru": 2,
  "total_siswa": 5,
  "total_kelas": 2,
  "penilaian_hari_ini": 4,
  "laporan_belum_ditanggapi": 1,
  "aktivitas_terakhir": []
}
```

### `GET /admin/audit-log?page=&limit=`

Catat minimal: login, logout, semua CRUD, reset sandi.
Simpan `user_id`, `aksi`, `ip_address`, `created_at`.

## Program keahlian

Tabel master. Kompetensi dan kelas merujuk `program_id` — tidak ada
`program_keahlian` bertipe string bebas. Ini mencegah "Teknik Kendaraan
Ringan" dan "TKR" jadi dua nilai berbeda yang memecah filter.

### `GET /admin/program`

```json
{
  "program_list": [
    {
      "id": 1,
      "kode": "TKR",
      "nama": "Teknik Kendaraan Ringan",
      "aktif": true,
      "jumlah_kompetensi": 2,
      "jumlah_kelas": 1
    }
  ]
}
```

`jumlah_*` dihitung server (COUNT), bukan disimpan.

### `POST /admin/program` · `PUT /admin/program/:id`

```json
{ "kode": "RPL", "nama": "Rekayasa Perangkat Lunak", "aktif": true }
```

`kode` unik → duplikat balas `409`.

### `DELETE /admin/program/:id`

Tolak dengan `409` kalau masih dipakai kompetensi atau kelas:

```json
{ "message": "Masih dipakai 3 kompetensi dan 2 kelas. Pindahkan atau hapus dulu." }
```

## Kompetensi

### Tahapan job-sheet pakai ID — penting

`tahapan` bukan array string, tapi array objek ber-ID:

```json
"tahapan": [
  { "id": "t1", "urutan": 1, "teks": "Persiapan alat dan K3" },
  { "id": "t2", "urutan": 2, "teks": "Pembongkaran kaliper" }
]
```

Alasannya: `laporan_siswa.tahapan_selesai` menyimpan **ID tahapan**, bukan
posisi array. Kalau admin menghapus tahapan ke-2, laporan lama yang berisi
`["t1","t2","t3"]` tetap menunjuk langkah yang sama.

Kalau memakai array `[1,1,1,0,0]`, indeks ke-2 setelah penghapusan menunjuk
tahapan yang berbeda — progres siswa jadi salah tanpa ada yang sadar.

Skema:

```sql
CREATE TABLE kompetensi_tahapan (
  id       VARCHAR(20) PRIMARY KEY,   -- 't1', atau UUID
  kompetensi_id INT NOT NULL,
  urutan   INT NOT NULL,
  teks     VARCHAR(255) NOT NULL,
  FOREIGN KEY (kompetensi_id) REFERENCES kompetensi(id) ON DELETE CASCADE
);
```

Saat `PUT /admin/kompetensi/:id`: tahapan yang datang **dengan** `id`
di-update; yang **tanpa** `id` adalah tahapan baru — buatkan ID. Tahapan
lama yang tidak ada di payload dihapus.

### `GET /admin/kompetensi?program_id=&q=`

```json
{
  "kompetensi_list": [
    {
      "id": 1,
      "nama": "Servis Sistem Rem Cakram",
      "deskripsi": "...",
      "durasi_standar": 90,
      "program_id": 1,
      "program_keahlian": "Teknik Kendaraan Ringan",
      "aktif": true,
      "dipakai": true,
      "tahapan": [ { "id": "t1", "urutan": 1, "teks": "..." } ]
    }
  ]
}
```

`dipakai` = ada penilaian atau laporan yang merujuk kompetensi ini.
Frontend memakainya untuk menolak penghapusan.

### `GET /admin/kompetensi/:id` → `{ kompetensi }`

### `POST /admin/kompetensi` · `PUT /admin/kompetensi/:id`

```json
{
  "nama": "Tune Up Mesin Bensin",
  "deskripsi": "...",
  "program_id": 1,
  "durasi_standar": 120,
  "aktif": true,
  "tahapan": [
    { "id": "t6", "teks": "Persiapan alat dan K3" },
    { "teks": "Tahapan baru tanpa id" }
  ]
}
```

`urutan` diturunkan dari posisi array — tidak dikirim.

### `DELETE /admin/kompetensi/:id`

Tolak `409` kalau `dipakai`:

```json
{ "message": "Kompetensi ini sudah punya data penilaian atau laporan. Nonaktifkan saja agar data lama tetap utuh." }
```

## Kelas

### `GET /admin/kelas?program_id=`

```json
{
  "kelas_list": [
    {
      "id": 1,
      "nama": "XI TKR 1",
      "program_id": 1,
      "program_keahlian": "Teknik Kendaraan Ringan",
      "tahun_ajaran": "2025/2026",
      "guru_id": 2,
      "guru_nama": "Siti Rahmawati",
      "jumlah_siswa": 5
    }
  ]
}
```

`jumlah_siswa` = siswa **aktif** saja.

### `POST /admin/kelas` · `PUT /admin/kelas/:id`

```json
{
  "nama": "XI TKR 2",
  "program_id": 1,
  "tahun_ajaran": "2025/2026",
  "guru_id": 2
}
```

`guru_id` boleh `null`. Kombinasi `nama` + `tahun_ajaran` unik → `409`.

`users.kelas_ampu` diturunkan dari tabel kelas (`WHERE guru_id = ?`), bukan
disimpan terpisah — supaya tidak ada dua sumber kebenaran.

### `DELETE /admin/kelas/:id`

Tolak `409` kalau masih ada siswa.

### `GET /admin/kelas/:id/siswa`

```json
{
  "siswa_list": [ { "id": 4, "nama": "Andi Pratama", "nis": "..." } ],
  "tersedia":   [ { "id": 9, "nama": "Sinta Dewi", "nis": "..." } ]
}
```

`tersedia` = siswa yang `kelas_id IS NULL`.

### `POST /admin/kelas/:id/siswa`

```json
{ "siswa_id_list": [9, 10, 11] }
```

Set `kelas_id` dan `program_id` siswa mengikuti kelas.

### `DELETE /admin/kelas/siswa/:siswaId`

Set `kelas_id = NULL`. Data penilaian tetap.

## Rule engine

Sumber: `js/core/rules.js`. Replikasi persis, kalau tidak guru akan
melihat rekomendasi berbeda antara demo dan sistem asli.

Ambang mengikuti dokumen "Kerangka Variabel Aktivitas Praktik
Teroperasional" §4. Level = level variabel itu sendiri — untuk E,
"tinggi" berarti BANYAK kesalahan (buruk), bukan bagus.

**Ambang batas**

| Indikator | Rendah | Sedang | Tinggi | Satuan |
|-----------|--------|--------|--------|--------|
| P (pemahaman) | 1–2 | 3 | 4–5 | rubrik 1–5 |
| K (keterlibatan) | 1–2 | 3 | 4–5 | rubrik 1–5 |
| E (kesalahan) | 0–1 | 2–4 | ≥ 5 | jumlah kesalahan |
| G (progres) | < 40 | 40–75 | > 75 | persen |

Perhatikan batas G: 40 dan 75 masuk **sedang** (bukan rendah/tinggi).

Warna tampilan dipetakan terpisah di frontend (`tone()` di rules.js):
E rendah = hijau, E tinggi = merah. Server cukup kirim nilai mentah.

**Aturan — first match, urutan tidak boleh diubah**

| # | Kondisi | Kode |
|---|---------|------|
| 1 | P rendah **dan** E tinggi | `R1` Bimbingan intensif |
| 2 | pernah diintervensi **dan** G rendah | `R2` Pendampingan terarah |
| 3 | K rendah **dan** P tidak rendah | `R3` Dorong keterlibatan |
| 4 | terlambat berat **dan** G tidak tinggi | `R4` Bimbingan manajemen waktu |
| 5 | P tinggi **dan** E rendah **dan** G tinggi | `R5` Pengayaan |
| — | tidak ada yang cocok | `S0` Pantau berkala |

**Kalibrasi per kompetensi (§5 dokumen):** ambang di atas adalah default.
Dokumen mewajibkan kalibrasi bersama guru per kompetensi — terutama E,
karena kompleksitas tiap job-sheet berbeda. `rekomendasi()` dan
`klasifikasi()` di rules.js sudah menerima parameter override; kalau nanti
diaktifkan, tambah kolom ambang opsional di tabel kompetensi
(mis. `ambang_e_sedang`, `ambang_e_tinggi`) dan kirim di payload.

**Tingkat kelas** — dipicu kalau ≥30% siswa kena kode sama

| Pemicu | Kode |
|--------|------|
| ≥30% `R1` | `RK1` Ulangi demonstrasi ke seluruh kelas |
| ≥30% `R4` | `RK2` Tinjau alokasi waktu dan alat |

## Database

Skema di PRD §7, dengan perubahan berikut:

1. **Tabel baru `program_keahlian`** (`id`, `kode`, `nama`, `aktif`).
   `kompetensi.program_id` dan `kelas.program_id` merujuk ke sini. Kolom
   `program_keahlian VARCHAR` di PRD dibuang.

2. **Tabel baru `kompetensi_tahapan`** — lihat bagian Kompetensi di atas.
   Kolom `tahapan JSON` tidak dipakai.

3. `laporan_siswa.tahapan_selesai` berisi array **ID tahapan**
   (`["t1","t2"]`), bukan array 0/1. Tambah kolom `total_tahapan INT`.

4. Kolom `email` opsional (`NULL`). Tidak dipakai untuk login maupun reset.

5. `laporan_siswa.kendala` bertipe `JSON`. MySQL < 5.7 pakai `TEXT` berisi
   JSON string.

6. `users.kelas_ampu` tidak disimpan — diturunkan dari
   `SELECT id FROM kelas WHERE guru_id = ?`.

## Checklist deploy

- [ ] `USE_MOCK: false`
- [ ] `js/mock/` dihapus
- [ ] Blok `.demo-creds` dihapus (HTML, JS, CSS)
- [ ] Semua endpoint validasi token dan peran
- [ ] Rate limit login aktif
- [ ] HTTPS
- [ ] `password_hash` tidak pernah dikirim ke klien
