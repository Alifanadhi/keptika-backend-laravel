/**
 * Rule engine: indikator P/E/K/G → kode rekomendasi.
 *
 * Ambang mengikuti dokumen "Kerangka Variabel Aktivitas Praktik
 * Teroperasional" §4. Level (rendah/sedang/tinggi) adalah level
 * variabel itu sendiri — untuk E, "tinggi" berarti BANYAK kesalahan.
 * Warna tampilan dipetakan terpisah lewat tone().
 *
 * Duplikat dari logika backend, supaya prototype jalan tanpa server.
 * Saat USE_MOCK = false, rekomendasi() tidak dipanggil lagi — tapi
 * klasifikasi(), tone(), label(), severity() tetap dipakai tampilan.
 *
 * Backend harus mereplikasi ambang dan urutan aturan persis.
 * Catatan kalibrasi (§5): ambang wajib dikalibrasi bersama guru per
 * kompetensi. AMBANG di bawah adalah default; ambangOverride pada
 * klasifikasi()/rekomendasi() disediakan untuk kalibrasi per
 * kompetensi nanti.
 */

export const AMBANG = {
  // Rubrik 1–5: skor 1–2 rendah · 3 sedang · 4–5 tinggi
  P: { rendah: 2, tinggi: 4 },
  K: { rendah: 2, tinggi: 4 },

  // Jumlah kesalahan: 0–1 rendah · 2–4 sedang · ≥5 tinggi
  // (level = level KESALAHAN; tinggi berarti banyak salah)
  E: { rendah: 1, tinggi: 5 },

  // Progres %: <40 rendah · 40–75 sedang · >75 tinggi
  G: { rendah: 40, tinggi: 75 },

  KELAS_TRIGGER: 0.30
};

/**
 * rendah | sedang | tinggi — level variabel sesuai dokumen §4.
 * @param {object} [ambang] override per kompetensi (kalibrasi §5)
 */
export function klasifikasi(indikator, nilai, ambang) {
  const a = { ...AMBANG[indikator], ...(ambang?.[indikator] ?? {}) };
  if (!AMBANG[indikator]) throw new Error(`Indikator tidak dikenal: ${indikator}`);

  if (indikator === 'G') {
    if (nilai < a.rendah) return 'rendah';
    if (nilai > a.tinggi) return 'tinggi';
    return 'sedang';
  }

  // P, K, E: ambang inklusif
  if (nilai <= a.rendah) return 'rendah';
  if (nilai >= a.tinggi) return 'tinggi';
  return 'sedang';
}

/**
 * Warna tampilan: danger | warning | success.
 * Terpisah dari level karena arah E berlawanan — E rendah
 * (sedikit kesalahan) itu bagus.
 */
export function tone(indikator, nilai, ambang) {
  const lv = klasifikasi(indikator, nilai, ambang);

  if (indikator === 'E') {
    return { rendah: 'success', sedang: 'warning', tinggi: 'danger' }[lv];
  }
  return { rendah: 'danger', sedang: 'warning', tinggi: 'success' }[lv];
}

/**
 * First-match. Urutan aturan adalah logikanya — yang paling mendesak
 * dicek duluan. Jangan diubah tanpa diskusi.
 *
 * @param {{P:number, E:number, K:number, G:number,
 *          ketepatan_waktu:string, riwayat_intervensi:boolean}} d
 * @param {object} [ambang] override per kompetensi
 */
export function rekomendasi(d, ambang) {
  const P = klasifikasi('P', d.P, ambang);
  const E = klasifikasi('E', d.E, ambang);
  const K = klasifikasi('K', d.K, ambang);
  const G = klasifikasi('G', d.G, ambang);

  // Tidak paham + kesalahan tinggi → konsep dasar belum masuk
  if (P === 'rendah' && E === 'tinggi') {
    return hasil('R1', 'Kesalahan berulang menandakan konsep dasar belum tertanam.');
  }

  // Sudah diintervensi tapi progres tetap tertinggal
  if (d.riwayat_intervensi && G === 'rendah') {
    return hasil('R2', 'Intervensi sebelumnya belum membuahkan hasil.');
  }

  // Mampu tapi tidak terlibat → masalah motivasi, bukan kemampuan
  if (K === 'rendah' && P !== 'rendah') {
    return hasil('R3', 'Kemampuan memadai, tetapi keterlibatan rendah.');
  }

  // §4: status waktu adalah penanda tambahan yang memperkuat
  // kebutuhan pendampingan saat progres belum tinggi
  if (d.ketepatan_waktu === 'terlambat_berat' && G !== 'tinggi') {
    return hasil('R4', 'Penyelesaian jauh melampaui waktu standar.');
  }

  // Semua baik: pemahaman tinggi, kesalahan rendah, progres tinggi
  if (P === 'tinggi' && E === 'rendah' && G === 'tinggi') {
    return hasil('R5', 'Seluruh indikator berada pada level baik.');
  }

  // Bukan "sistem tidak tahu" — tidak semua siswa butuh tindakan.
  return hasil('S0', 'Tidak ada indikator yang memerlukan tindakan segera.');
}

function hasil(code, alasan) {
  return { code, label: label(code), alasan };
}

const LABEL = {
  R1: 'Bimbingan intensif',
  R2: 'Pendampingan terarah',
  R3: 'Dorong keterlibatan',
  R4: 'Bimbingan manajemen waktu',
  R5: 'Pengayaan',
  S0: 'Pantau berkala',
  SM: 'Perlu penilaian manual',
  RK1: 'Ulangi demonstrasi ke seluruh kelas',
  RK2: 'Tinjau alokasi waktu dan alat'
};

const SEVERITY = {
  R1: 'danger',
  R2: 'danger',
  R3: 'warning',
  R4: 'warning',
  R5: 'success',
  S0: 'neutral',
  SM: 'info',
  RK1: 'warning',
  RK2: 'warning'
};

export function label(code)    { return LABEL[code] ?? code; }
export function severity(code) { return SEVERITY[code] ?? 'neutral'; }

/**
 * Rekomendasi tingkat kelas. Kalau ≥30% siswa kena kode yang sama,
 * masalahnya di penyampaian materi, bukan di siswa.
 */
export function rekomendasiKelas(daftar) {
  if (!daftar.length) return [];

  const n = daftar.length;
  const rasio = code => daftar.filter(x => x.code === code).length / n;
  const out = [];

  if (rasio('R1') >= AMBANG.KELAS_TRIGGER) {
    out.push({
      code: 'RK1',
      label: label('RK1'),
      alasan: `${Math.round(rasio('R1') * 100)}% siswa mengalami kesalahan berulang pada kompetensi yang sama.`
    });
  }

  if (rasio('R4') >= AMBANG.KELAS_TRIGGER) {
    out.push({
      code: 'RK2',
      label: label('RK2'),
      alasan: `${Math.round(rasio('R4') * 100)}% siswa melampaui waktu standar.`
    });
  }

  return out;
}
