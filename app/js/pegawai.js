/* DATA ORANG — dipakai bersama oleh exoclean dan MCS EXOCLEAN.

   Alamat, rekening, identitas, kontak darurat, tempat tinggal, kelengkapan
   berkas, data kepegawaian, masa kerja, kontrak, atasan, dan tim. Semuanya
   urusan ORANG, bukan urusan dagang.

   Dulu blok ini tinggal di dalam js/biz.js, dan itu berarti sebuah aplikasi
   harus membawa seluruh modul pasar — katalog, order, invoice, toko, poin,
   voucher — hanya untuk bisa menampilkan alamat rumah seorang petugas.

   Dipindahkan APA ADANYA: tidak ada isinya yang diubah, dan BIZ meneruskan
   ke sini dengan nama yang sama persis. */
var PEGAWAI = (function () {

  function alamatList(u) { return (u && u.alamatList) || []; }

  function alamatUtama(u) {
    var l = alamatList(u);
    return l.filter(function (a) { return a.utama; })[0] || l[0] || null;
  }

  function alamatTeks(a) {
    if (!a) return '';
    if (window.WILAYAH && WILAYAH.terstruktur(a.wilayah)) {
      return WILAYAH.teks(a.wilayah, { denganNegara: true });
    }
    return [a.alamat, a.kota, a.kodePos].filter(Boolean).join(', ');
  }

  function simpanAlamat(userId, list) {
    if (list.length && !list.some(function (a) { return a.utama; })) list[0].utama = true;
    var utama = list.filter(function (a) { return a.utama; })[0];
    DB.update('users', userId, { alamatList: list, alamat: alamatTeks(utama) });
    return DB.find('users', userId);
  }

  function rekeningList(u) { return (u && u.rekening) || []; }

  function rekeningUtama(u) {
    var l = rekeningList(u);
    return l.filter(function (r) { return r.utama; })[0] || l[0] || null;
  }

  function simpanRekening(userId, list) {
    if (list.length && !list.some(function (r) { return r.utama; })) list[0].utama = true;
    DB.update('users', userId, { rekening: list });
    return DB.find('users', userId);
  }

  var JENIS_ID = [
    { id: 'ktp', nama: 'KTP', panjang: 16, seumurHidup: true,
      contoh: '3271010101900001', ket: 'Nomor Induk Kependudukan (16 digit)' },
    { id: 'sim', nama: 'SIM', panjang: 14, seumurHidup: false,
      contoh: '327101010190000', ket: 'Nomor SIM A / B / C' },
    { id: 'paspor', nama: 'Paspor', panjang: 8, seumurHidup: false,
      contoh: 'C1234567', ket: 'Nomor paspor (huruf + 7 digit)' }
  ];

  function jenisId(id) { var r = JENIS_ID[0]; JENIS_ID.forEach(function (j) { if (j.id === id) r = j; }); return r; }

  var HUBUNGAN = ['Suami', 'Istri', 'Orang Tua', 'Anak', 'Saudara Kandung',
                  'Kerabat', 'Teman', 'Wali', 'Lainnya'];

  var STATUS_TINGGAL = ['Milik sendiri', 'Kontrak / sewa', 'Kos', 'Ikut keluarga', 'Mess perusahaan'];

  function pegawaiLapangan(u) { return u && (u.role === 'worker' || u.role === 'supervisor'); }

  function identitas(u) {
    return Object.assign({ jenis: 'ktp', nomor: '', namaSesuaiKartu: '', tanggalLahir: '',
      berlakuHingga: '', alamatKtp: '', fotoDepan: null, fotoSelfie: null,
      diverifikasi: false, diverifikasiOleh: null, diverifikasiAt: null }, (u && u.identitas) || {});
  }

  function simpanIdentitas(userId, patch) {
    var u = DB.find('users', userId);
    DB.update('users', userId, { identitas: Object.assign(identitas(u), patch) });
    return DB.find('users', userId);
  }

  function samarkanNomorId(nomor) {
    var s = String(nomor || '');
    if (s.length <= 8) return s ? s.slice(0, 2) + '•'.repeat(Math.max(0, s.length - 2)) : '—';
    return s.slice(0, 4) + '•'.repeat(s.length - 8) + s.slice(-4);
  }

  function periksaNomorId(jenis, nomor) {
    var s = String(nomor || '').replace(/[\s-]/g, '').toUpperCase();
    if (!s) return I18N.t('Nomor identitas wajib diisi');
    if (jenis === 'ktp' && !/^[0-9]{16}$/.test(s)) return 'NIK KTP harus 16 digit angka';
    if (jenis === 'sim' && !/^[0-9]{12,16}$/.test(s)) return I18N.t('Nomor SIM harus 12–16 digit angka');
    if (jenis === 'paspor' && !/^[A-Z][0-9]{6,8}$/.test(s)) return I18N.t('Nomor paspor: 1 huruf diikuti 6–8 angka');
    return null;
  }

  function statusBerlakuId(idn) {
    if (!idn || !idn.nomor) return 'kosong';
    if (idn.jenis === 'ktp' && !idn.berlakuHingga) return 'seumur_hidup';
    if (!idn.berlakuHingga) return 'kosong';
    var sisa = U.diffDays(idn.berlakuHingga, new Date());
    if (sisa < 0) return 'kedaluwarsa';
    return sisa <= 60 ? 'segera' : 'aman';
  }

  function kontakDarurat(u) { return (u && u.kontakDarurat) || []; }

  function kontakDaruratUtama(u) {
    var l = kontakDarurat(u);
    return l.filter(function (k) { return k.utama; })[0] || l[0] || null;
  }

  function simpanKontakDarurat(userId, list) {
    if (list.length && !list.some(function (k) { return k.utama; })) list[0].utama = true;
    DB.update('users', userId, { kontakDarurat: list });
    return DB.find('users', userId);
  }

  function alamatTinggal(u) {
    return Object.assign({ alamat: '', rt: '', rw: '', kelurahan: '', kecamatan: '',
      kota: '', provinsi: '', kodePos: '', status: 'Kontrak / sewa', sejak: '',
      samaDenganKtp: false, patokan: '' }, (u && u.alamatTinggal) || {});
  }

  function simpanAlamatTinggal(userId, patch) {
    var u = DB.find('users', userId);
    DB.update('users', userId, { alamatTinggal: Object.assign(alamatTinggal(u), patch) });
    return DB.find('users', userId);
  }

  function alamatTinggalTeks(a) {
    if (!a || !a.alamat) return '';
    var rtrw = (a.rt || a.rw) ? 'RT ' + (a.rt || '-') + '/RW ' + (a.rw || '-') : '';
    return [a.alamat, rtrw, a.kelurahan && 'Kel. ' + a.kelurahan, a.kecamatan && 'Kec. ' + a.kecamatan,
      a.kota, a.provinsi, a.kodePos].filter(Boolean).join(', ');
  }

  function kelengkapanBerkas(u) {
    var idn = identitas(u), kd = kontakDarurat(u), at = alamatTinggal(u);
    var poin = [
      { k: 'nomor', label: I18N.t('Nomor identitas'), ok: !!idn.nomor && !periksaNomorId(idn.jenis, idn.nomor) },
      { k: 'berlaku', label: 'Masa berlaku identitas', ok: ['seumur_hidup', 'aman', 'segera'].indexOf(statusBerlakuId(idn)) >= 0 },
      { k: 'foto', label: 'Foto kartu identitas', ok: !!idn.fotoDepan },
      { k: 'darurat', label: 'Kontak darurat', ok: kd.length > 0 && !!kontakDaruratUtama(u).telp },
      { k: 'domisili', label: I18N.t('Alamat tinggal sekarang'), ok: !!at.alamat && !!at.kota }
    ];
    var lengkap = poin.filter(function (p) { return p.ok; }).length;
    return { poin: poin, lengkap: lengkap, total: poin.length,
      pct: Math.round(lengkap / poin.length * 100),
      kurang: poin.filter(function (p) { return !p.ok; }) };
  }

  function berkasBermasalah() {
    /* usersByRole tinggal di AKUN, bukan lagi tetangga sebelah di biz.js.
       Tanpa awalan, baris ini diam saja sampai layar Pegawai dibuka. */
    return AKUN.usersByRole('worker').concat(AKUN.usersByRole('supervisor'))
      .filter(function (u) {
      var st = statusBerlakuId(identitas(u));
      return kelengkapanBerkas(u).kurang.length > 0 || st === 'kedaluwarsa' || st === 'segera';
    });
  }

  function bolehLihatBerkas(pelihat, pemilik) {
    if (!pelihat || !pemilik) return false;
    if (pelihat.id === pemilik.id) return true;
    if (pelihat.role === 'admin') return true;
    if (pelihat.role === 'supervisor') {
      return DB.where('teams', { supervisorId: pelihat.id })
        .some(function (t) { return t.memberIds.indexOf(pemilik.id) >= 0; });
    }
    return false;
  }

  var STATUS_KERJA = {
    percobaan: { t: 'Masa Percobaan', c: 'warn',
      ket: 'Tiga bulan pertama, dievaluasi sebelum diangkat.' },
    kontrak:   { t: 'Kontrak (PKWT)', c: 'info',
      ket: 'Perjanjian kerja waktu tertentu, ada tanggal berakhir.' },
    tetap:     { t: 'Karyawan Tetap (PKWTT)', c: 'ok',
      ket: 'Perjanjian kerja waktu tidak tertentu.' },
    harian:    { t: 'Harian Lepas', c: 'muted',
      ket: 'Dibayar per hari kerja, tanpa ikatan waktu tertentu.' },
    mitra:     { t: 'Mitra Lepas', c: 'muted',
      ket: 'Bukan hubungan kerja — kemitraan per pekerjaan.' },
    berhenti:  { t: 'Sudah Berhenti', c: 'danger',
      ket: 'Tidak lagi bekerja di EXOCLEAN.' }
  };

  function kepegawaian(u) {
    return Object.assign({
      nomorPegawai: '', tglMasuk: '', statusKerja: 'mitra',
      kontrakMulai: '', kontrakSelesai: '',
      penempatan: '', atasanId: '',
      bpjsTk: '', bpjsKes: '', npwp: '',
      tglBerhenti: '', alasanBerhenti: '',
      catatan: ''
    }, (u && u.kepegawaian) || {});
  }

  function simpanKepegawaian(userId, patch, olehUser) {
    if (!olehUser || olehUser.role !== 'admin') {
      throw new Error(I18N.t('Hanya admin yang boleh mengubah data kepegawaian.'));
    }
    var u = DB.find('users', userId);
    if (!u) throw new Error(I18N.t('Pengguna tidak ditemukan'));
    var lama = kepegawaian(u);
    var baru = Object.assign({}, lama, patch);

    if (baru.tglMasuk && baru.tglBerhenti && baru.tglBerhenti < baru.tglMasuk) {
      throw new Error(I18N.t('Tanggal berhenti tidak boleh mendahului tanggal masuk.'));
    }
    if (baru.kontrakMulai && baru.kontrakSelesai && baru.kontrakSelesai < baru.kontrakMulai) {
      throw new Error(I18N.t('Kontrak berakhir tidak boleh mendahului tanggal mulai.'));
    }
    if (baru.statusKerja === 'kontrak' && !baru.kontrakSelesai) {
      throw new Error(I18N.t('Status kontrak (PKWT) wajib punya tanggal berakhir.'));
    }

    DB.update('users', userId, { kepegawaian: baru });
    /* Perubahan status kerja dicatat: ini menyangkut hak pegawai, dan siapa
       yang mengubahnya kapan harus bisa ditelusuri di kemudian hari. */
    if (lama.statusKerja !== baru.statusKerja) {
      DB.log(olehUser.id, 'Status kerja ' + u.nama + ': ' +
        ((STATUS_KERJA[lama.statusKerja] || {}).t || lama.statusKerja) + ' → ' +
        ((STATUS_KERJA[baru.statusKerja] || {}).t || baru.statusKerja), 'user', userId);
    }
    return DB.find('users', userId);
  }

  function masaKerja(u) {
    var k = kepegawaian(u);
    if (!k.tglMasuk) return null;
    var akhir = k.tglBerhenti ? new Date(k.tglBerhenti) : new Date();
    var mulai = new Date(k.tglMasuk);
    if (isNaN(mulai) || akhir < mulai) return null;
    var bulan = (akhir.getFullYear() - mulai.getFullYear()) * 12 +
      (akhir.getMonth() - mulai.getMonth());
    if (akhir.getDate() < mulai.getDate()) bulan--;
    var th = Math.floor(bulan / 12), bl = bulan % 12;
    return { bulan: bulan, tahun: th, sisaBulan: bl,
      teks: (th ? th + ' tahun' : '') + (th && bl ? ' ' : '') +
            (bl ? bl + ' bulan' : (th ? '' : I18N.t('kurang dari sebulan'))) };
  }

  function kontrak(u) {
    var k = kepegawaian(u);
    if (k.statusKerja !== 'kontrak' || !k.kontrakSelesai) return null;
    var sisa = U.diffDays(k.kontrakSelesai, U.today());
    return {
      mulai: k.kontrakMulai, selesai: k.kontrakSelesai, sisaHari: sisa,
      keadaan: sisa < 0 ? 'lewat' : sisa <= HARI_INGAT_KONTRAK ? 'segera' : 'aman'
    };
  }

  function atasan(u) {
    var k = kepegawaian(u);
    if (k.atasanId) return DB.find('users', k.atasanId);
    var tim = DB.where('teams', function (t) {
      return (t.memberIds || []).indexOf(u.id) >= 0; })[0];
    return tim ? DB.find('users', tim.supervisorId) : null;
  }

  function timPegawai(u) {
    return DB.where('teams', function (t) {
      return (t.memberIds || []).indexOf(u.id) >= 0; })[0] || null;
  }

  function kelengkapanKepegawaian(u) {
    var k = kepegawaian(u);
    var karyawan = ['percobaan', 'kontrak', 'tetap'].indexOf(k.statusKerja) >= 0;
    var poin = [
      { k: 'nomor', label: I18N.t('Nomor pegawai'), ok: !!k.nomorPegawai },
      { k: 'masuk', label: I18N.t('Tanggal masuk'), ok: !!k.tglMasuk },
      /* Status kerja tidak dihitung: nilainya selalu terisi (bawaan "mitra"),
         jadi mencantumkannya hanya menaikkan persentase tanpa pernah menjadi
         pekerjaan yang harus diselesaikan siapa pun. */
      { k: 'penempatan', label: I18N.t('Penempatan'), ok: !!k.penempatan || !!timPegawai(u) }
    ];
    if (karyawan) {
      poin.push({ k: 'bpjstk', label: I18N.t('BPJS Ketenagakerjaan'), ok: !!k.bpjsTk });
      poin.push({ k: 'bpjskes', label: I18N.t('BPJS Kesehatan'), ok: !!k.bpjsKes });
    }
    if (k.statusKerja === 'kontrak') {
      poin.push({ k: 'kontrak', label: I18N.t('Tanggal berakhir kontrak'), ok: !!k.kontrakSelesai });
    }
    var lengkap = poin.filter(function (p) { return p.ok; }).length;
    return { poin: poin, total: poin.length, lengkap: lengkap,
      kurang: poin.filter(function (p) { return !p.ok; }),
      pct: Math.round(lengkap / poin.length * 100) };
  }

  function kontrakSegeraHabis() {
    return DB.all('users').filter(function (u) {
      var c = kontrak(u);
      return c && c.keadaan !== 'aman';
    }).map(function (u) { return { user: u, kontrak: kontrak(u) }; })
      .sort(function (a, b) { return a.kontrak.sisaHari - b.kontrak.sisaHari; });
  }

  return {
    HUBUNGAN: HUBUNGAN, JENIS_ID: JENIS_ID, STATUS_KERJA: STATUS_KERJA, STATUS_TINGGAL: STATUS_TINGGAL,
    alamatList: alamatList, alamatUtama: alamatUtama, alamatTeks: alamatTeks, simpanAlamat: simpanAlamat, rekeningList: rekeningList, rekeningUtama: rekeningUtama, simpanRekening: simpanRekening, jenisId: jenisId, identitas: identitas, simpanIdentitas: simpanIdentitas, samarkanNomorId: samarkanNomorId, periksaNomorId: periksaNomorId, statusBerlakuId: statusBerlakuId, kontakDarurat: kontakDarurat, kontakDaruratUtama: kontakDaruratUtama, simpanKontakDarurat: simpanKontakDarurat, alamatTinggal: alamatTinggal, simpanAlamatTinggal: simpanAlamatTinggal, alamatTinggalTeks: alamatTinggalTeks, kelengkapanBerkas: kelengkapanBerkas, berkasBermasalah: berkasBermasalah, bolehLihatBerkas: bolehLihatBerkas, kepegawaian: kepegawaian, simpanKepegawaian: simpanKepegawaian, masaKerja: masaKerja, kontrak: kontrak, atasan: atasan, timPegawai: timPegawai, kelengkapanKepegawaian: kelengkapanKepegawaian, kontrakSegeraHabis: kontrakSegeraHabis, pegawaiLapangan: pegawaiLapangan
  };
})();
