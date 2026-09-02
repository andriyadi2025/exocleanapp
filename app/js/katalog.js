/* ==========================================================================
   katalog.js — daftar kelompok layanan jasa EXOCLEAN
   --------------------------------------------------------------------------
   KATALOG DIKOSONGKAN 21 Agustus 2026 atas permintaan pemilik, untuk disusun
   ulang dari nol. Daftar lama (22 kelompok, 119 sub-layanan) tersimpan utuh
   di berkas "katalog-lama-20260821.js.bak" di akar proyek — salin kelompok
   yang masih dipakai dari sana, jangan ditulis ulang dari ingatan.

   CARA MENAMBAH KELOMPOK
     { kode: "KURIR", nama: "Kurir", ikon: "🛵", fungsi: "FK-DRIVER",
       ket: "Keterangan singkat yang dibaca klien.",
       opsi: ["Pilihan saat memesan"],            // boleh dihilangkan
       sub: [ s("KURIR-INS", "Instant"), s("KURIR-SDY", "Same Day") ] }

   Tiap kelompok terikat pada satu FUNGSI KERJA (lihat kompetensi.js). Mitra
   hanya bisa ditugaskan pada layanan yang fungsi kerjanya sudah ia sertifikasi,
   jadi `fungsi` harus diisi dengan kode yang benar-benar ada di sana.

   Layanan dari berkas ini selalu bertanda `survei: true` — harganya keluar
   lewat penawaran. Layanan yang bisa dipesan langsung tanpa survei didaftarkan
   lewat SEED.SERVICES di seed.js, karena ia butuh hargaMin dan checklist.
   ========================================================================== */
var KATALOG = (function () {

  /* Pintasan penulisan: s(kode, nama, [varian]) */
  function s(kode, nama, varian) {
    return { kode: kode, nama: nama, varian: varian || [] };
  }

  /* Sengaja kosong — katalog disusun ulang. Lihat catatan di kepala berkas. */
  var GRUP = [];

  /* ================================================================ TURUNAN */
  /** Semua sub-layanan sebagai daftar rata, siap dimasukkan ke tabel services. */
  function daftarLayanan() {
    var out = [];
    GRUP.forEach(function (g) {
      g.sub.forEach(function (sb) {
        out.push({
          kode: sb.kode, nama: sb.nama, kategori: g.nama, grup: g.kode,
          fungsi: g.fungsi, ikon: g.ikon, varian: sb.varian.slice(),
          opsi: (g.opsi || []).slice(),
          hargaMin: null, hargaMax: null, satuan: 'unit', survei: true,
          sumber: 'katalog'
        });
      });
    });
    return out;
  }

  function grup(kode) { var r = null; GRUP.forEach(function (g) { if (g.kode === kode) r = g; }); return r; }
  function grupFungsi(fungsi) { return GRUP.filter(function (g) { return g.fungsi === fungsi; }); }

  function jumlah() {
    var sub = 0, varian = 0;
    GRUP.forEach(function (g) {
      sub += g.sub.length;
      g.sub.forEach(function (sb) { varian += sb.varian.length; });
    });
    return { grup: GRUP.length, sub: sub, varian: varian };
  }

  return { GRUP: GRUP, daftarLayanan: daftarLayanan, grup: grup,
           grupFungsi: grupFungsi, jumlah: jumlah };
})();
