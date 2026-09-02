/* BENIH PEMBUKA — MCS EXOCLEAN berdiri sendiri.

   Sepadan dengan SEED.apply() di aplikasi pasar, tetapi hanya membawa yang
   diperlukan sebuah pemasangan MCS yang masih kosong: daftar peran, dan satu
   akun untuk masuk pertama kali. Tidak ada layanan, produk, order, invoice,
   atau pesanan toko — MCS EXOCLEAN tidak menjual apa pun.

   Yang SENGAJA tidak ada di sini: korporat, gedung, area, petugas, jadwal.
   Itu semua data pelanggan, dan sebuah pemasangan baru harus dimulai dari
   kosong lalu diisi lewat layar pendaftaran korporat — bukan dari data
   contoh yang harus dihapus dulu sebelum dipakai. */
var SEMAI_MCS = (function () {

  function apply(s) {
    /* Daftar peran yang persis sama dengan aplikasi pasar. Peran khusus
       pasar (Admin Marketplace, Pengelola Undian) ikut terbawa dan itu
       disengaja: menyaringnya di sini berarti dua daftar peran yang harus
       dijaga tetap sama, dan yang satu pasti akan tertinggal. Peran yang
       tidak terpakai tidak menimbulkan apa-apa; peran yang hilang membuat
       pengguna kehilangan haknya. */
    PERAN_BAWAAN.pasang(s);

    /* Satu akun pembuka. Sandinya sengaja lemah dan sengaja diberitahukan:
       ia HARUS diganti saat pemasangan, dan layar Akun mengingatkannya. */
    s.users.push({
      id: 'u_admin', role: 'admin', roleId: 'rol_SUPER',
      nama: 'Administrator', jabatan: 'Administrator Sistem',
      email: 'admin@mcs.local', pass: 'ubah-saya', telp: '',
      aktif: true, createdAt: U.nowISO(),
      emailVerifiedAt: U.nowISO(), telpVerifiedAt: null,
      foto: null, alamatList: [], rekening: [], identitas: null,
      kontakDarurat: [], alamatTinggal: null, kepegawaian: null,
      sosial: [], metodeDaftar: 'email',
      izinTambahan: [], izinDicabut: [],
      preferensi: { bahasa: 'id', notifWA: false, notifEmail: false, ringkasanMingguan: false }
    });

    return s;
  }

  return { apply: apply };
})();
