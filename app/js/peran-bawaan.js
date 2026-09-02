/* PERAN BAWAAN — dipakai bersama oleh exoclean dan MCS EXOCLEAN.

   Dulu blok ini tinggal di dalam SEED.apply(), dan itu berarti sebuah
   aplikasi harus membawa seluruh benih pasar — layanan, produk, order,
   invoice, pesanan toko — hanya untuk mendapatkan daftar perannya. MCS
   EXOCLEAN tidak menjual apa pun; ia tetap memerlukan peran yang sama.

   Dipindahkan APA ADANYA: isinya tidak diubah sebaris pun, supaya data
   yang sudah tersimpan di perangkat pengguna tetap cocok dengan yang
   baru dipasang. */
var PERAN_BAWAAN = (function () {

  function pasang(s) {
  /* ================================================================ PERAN & HAK AKSES
     Peran bawaan mengikuti pembagian kerja yang lazim di perusahaan
     cleaning service. Tim IT bisa menyalin, mengubah izinnya, atau membuat
     peran baru lewat menu Peran & Hak Akses. */
  function peranBawaan(kode, nama, deskripsi, persona, izin, opsi) {
    s.roles.push(Object.assign({
      id: 'rol_' + kode, kode: kode, nama: nama, deskripsi: deskripsi, persona: persona,
      izin: izin, bawaan: true, bawaanPersona: false, aktif: true,
      urutan: s.roles.length + 1, createdAt: U.nowISO()
    }, opsi || {}));
  }

  peranBawaan('SUPER', 'Super Admin (IT)',
    'Akses penuh ke seluruh modul dan pengaturan sistem. Diperuntukkan bagi tim IT.',
    /* Ditandai `semuaIzin`, bukan disalin daftarnya: daftar yang disalin
       adalah cuplikan hari ini dan akan tertinggal begitu ada izin baru. */
    'admin', AKSES.semuaIzinId(), { bawaanPersona: true, semuaIzin: true });

  peranBawaan('ADM-OPS', 'Admin Operasional',
    'Menjadwalkan pekerjaan, menugaskan tim, dan menangani komplain. Tidak menyentuh keuangan.',
    'admin', ['crm.lihat', 'penjualan.permintaan', 'penjualan.penawaran.lihat',
      'operasional.order.lihat', 'operasional.order.kelola', 'operasional.monitoring',
      'operasional.komplain', 'master.layanan',
      'komunikasi.wa.lihat', 'komunikasi.wa.kirim', 'komunikasi.chat.awasi',
      'komunikasi.moderasi', 'mitra.lihat']);

  peranBawaan('ADM-KEU', 'Admin Keuangan',
    'Menerbitkan invoice, mencatat pembayaran, dan memproses bagi hasil mitra.',
    'admin', ['operasional.order.lihat', 'keuangan.invoice.lihat', 'keuangan.invoice.kelola',
      'keuangan.bagihasil.lihat', 'keuangan.bagihasil.setujui', 'keuangan.laporan',
      'komunikasi.surat',
      'marketplace.lihat', 'marketplace.pencairan',
      'komunikasi.wa.lihat', 'komunikasi.wa.kirim']);

  peranBawaan('ADM-MKT', 'Admin Pemasaran & CRM',
    'Mengelola prospek, penawaran, dan kampanye ke pelanggan.',
    'admin', ['crm.lihat', 'crm.kelola', 'crm.kampanye',
      'penjualan.permintaan', 'penjualan.penawaran.lihat', 'penjualan.penawaran.kelola',
      'operasional.order.lihat', 'keuangan.laporan',
      'komunikasi.wa.lihat', 'komunikasi.wa.kirim']);

  peranBawaan('ADM-MP', 'Admin Marketplace',
    'Memverifikasi mitra toko, memoderasi produk, mengelola kampanye dan voucher.',
    'admin', ['marketplace.lihat', 'marketplace.toko', 'marketplace.produk',
      'marketplace.kampanye', 'master.produk', 'sistem.voucher',
      'komunikasi.wa.lihat', 'komunikasi.wa.kirim', 'komunikasi.chat.awasi']);

  /* Peran khusus undian. Sengaja dipisah dari Admin Marketplace: menjalankan
     pengundian mencairkan uang ke Dompet pemenang dan tidak bisa dibatalkan,
     sehingga wewenangnya pantas diberikan kepada orang tertentu saja — bukan
     melekat pada siapa pun yang kebetulan mengurus voucher. */
  peranBawaan('ADM-UND', 'Pengelola Undian',
    'Membuka undian, memantau tiket, dan menjalankan pengundian berhadiah.',
    'admin', ['sistem.undian', 'sistem.voucher', 'marketplace.lihat',
      'komunikasi.wa.lihat', 'komunikasi.wa.kirim']);

  peranBawaan('ADM-HR', 'Admin Kemitraan & Pelatihan',
    'Menyeleksi calon mitra lapangan dan mengelola materi pembelajaran.',
    'admin', ['mitra.lihat', 'mitra.setujui', 'mitra.lms', 'master.pegawai',
      'operasional.order.lihat', 'komunikasi.wa.lihat', 'komunikasi.wa.kirim']);

  peranBawaan('SPV', 'Supervisor Lapangan',
    'Memantau tim di lapangan dan memverifikasi mutu pekerjaan.',
    'supervisor', ['operasional.order.lihat', 'operasional.monitoring', 'operasional.qc',
      'komunikasi.wa.lihat', 'komunikasi.wa.kirim'], { bawaanPersona: true });

  peranBawaan('SPV-SR', 'Supervisor Senior',
    'Selain tugas supervisor, boleh mengatur penugasan dan melihat laporan.',
    'supervisor', ['operasional.order.lihat', 'operasional.order.kelola', 'operasional.monitoring',
      'operasional.qc', 'operasional.komplain', 'keuangan.laporan', 'mitra.lihat',
      'komunikasi.wa.lihat', 'komunikasi.wa.kirim', 'komunikasi.chat.awasi']);
  }

  return { pasang: pasang };
})();
