/* Penyemai PT Buana Indah Motorindo — dijalankan di dalam peramban.
   Memakai API yang sama dengan yang dipakai manusia, bukan menulis ke DB
   langsung: kalau ada aturan yang dilanggar, ia menolak di sini, bukan
   menjadi data rusak yang baru ketahuan sebulan kemudian. */
/* Jenis area harus KODE, bukan nama tampilan.

   MCS.tambahArea memanggil jenisArea(d.jenis), yang mencocokkan KODE. Nama
   tampilan seperti "Ruang Kerja" tidak cocok dengan apa pun, jatuh ke
   "lainnya", dan TIDAK menghasilkan satu pun galat — ia hanya membuat
   seluruh area bertipe lainnya. Akibatnya baru terasa jauh kemudian: saran
   jam kerja hilang, pembersih toilet yang dilingkupi jenis area "toilet"
   tidak cocok dengan satu area pun, dan biaya per jenis area menjadi satu
   tumpukan. Ketahuan dari layar pemilik ruangan yang menulis "Lainnya" di
   bawah nama "Bengkel Servis". */
function kodeJenisArea(teks) {
  var v = String(teks || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  var d = MCS.JENIS_AREA;
  for (var i = 0; i < d.length; i++) if (d[i].kode === v) return d[i].kode;
  for (var j = 0; j < d.length; j++) {
    var n = String(d[j].nama).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (n === v) return d[j].kode;
    /* "Ruang Kerja" vs "Kerja", "Area Parkir" vs "Parkir" — nama tampilan
       sering memuat kata yang tidak ikut diketik orang. */
    if (n.indexOf(v) >= 0 || v.indexOf(n) >= 0) return d[j].kode;
  }
  var potong = String(teks || '').split('&')[0].trim();
  if (potong && potong !== teks) return kodeJenisArea(potong);
  return 'lainnya';
}

window.__semai = function (d) {
  var lap = { salah: [] };
  var t0 = Date.now();

  /* ---- 1. korporat + admin korporat ---- */
  var sudah = DB.all('korporat').filter(function (k) {
    return k.nama === d.korporat.nama;
  })[0];
  if (sudah) return { error: 'Korporat "' + d.korporat.nama + '" sudah ada.' };

  var admin = d.staf.filter(function (s) { return s.peran === 'admin'; })[0];
  var rk = MCS.buatKorporat({
    nama: d.korporat.nama, bidang: d.korporat.bidang,
    /* Bentuk pengelolaannya ikut disemai. Kosong berarti belum dinyatakan,
       dan yang belum dinyatakan melihat seluruh menu. */
    jenis: d.korporat.jenis || '',
    alamat: d.korporat.alamat, kota: d.korporat.kota,
    wilayah: d.korporat.wilayah,
    telp: d.korporat.telp, npwp: d.korporat.npwp,
    namaStaf: admin.nama, emailStaf: admin.email,
    jabatanStaf: admin.jabatan, sandiAwal: 'buana2026'
  }, 'u_admin');
  if (rk.error) return { error: rk.error };
  var kid = rk.korporat.id;
  lap.korporat = rk.korporat.nama;
  lap.adminEmail = admin.email;

  DB.update('users', rk.user.id, { mcsPeran: 'admin', mcsLokasi: [] });

  /* ---- 2. lokasi + area ---- */
  var petaLokasi = {};
  lap.lokasi = 0; lap.area = 0;
  d.lokasi.forEach(function (l) {
    var r = LOKASI.tambah(kid, {
      /* ALAMAT TERSTRUKTUR ikut serta.

         Berkas datanya sejak awal menyimpan provinsi tiap cabang, tetapi
         baris inilah yang membuangnya — 86 cabang masuk hanya dengan dua
         kolom teks bebas, dan yang membacanya kemudian menyangka provinsinya
         memang tidak pernah ada. Sekarang `wilayah` diteruskan utuh dan
         LOKASI.tambah() yang menurunkan `alamat` serta `kota` darinya. */
      nama: l.nama, alamat: l.alamat, kota: l.kota, wilayah: l.wilayah,
      lantai: l.lantai, luasTanah: l.luasTanah, kode: l.kode,
      koordinat: l.koordinat,
      catatan: l.jenis === 'pusat' ? 'Kantor pusat' : 'Dealer 3S'
    });
    if (r.error) { lap.salah.push(l.nama + ': ' + r.error); return; }
    petaLokasi[l.kode] = r.lokasi.id;
    lap.lokasi++;
    l.area.forEach(function (a) {
      var ra = MCS.tambahArea(kid, {
        nama: a.nama, jenis: kodeJenisArea(a.jenis), luas: a.luas, lokasiId: r.lokasi.id
      });
      if (ra.error) { lap.salah.push(l.nama + ' / ' + a.nama + ': ' + ra.error); return; }
      lap.area++;
    });
  });

  /* ---- 3. petugas kebersihan ---- */
  lap.petugas = 0;
  var petaArea = {};
  /* Dipakai bagian peralatan di bawah: alat hanya boleh diserahkan kepada
     petugas DI LOKASI YANG SAMA. */
  var petaPekerjaLokasi = {};
  MCS.area(kid).forEach(function (a) {
    (petaArea[a.lokasiId] = petaArea[a.lokasiId] || []).push(a.id);
  });
  d.petugas.forEach(function (p, i) {
    var lid = petaLokasi[p.lokasiKode];
    if (!lid) return;
    var r = MCS.tambahPekerja(kid, {
      /* Nama dibuat unik per korporat oleh MCS; tambahkan kode cabang bila
         kebetulan bertabrakan dengan orang lain di jaringan yang sama. */
      nama: p.nama,
      jenis: p.jenis, jabatan: p.jabatan,
      areaIds: petaArea[lid] || [],
      lokasiIds: [lid],
      shiftKode: p.shift,
      upah: p.upah,
      catatan: p.sebutan
    });
    if (r.error) {
      var r2 = MCS.tambahPekerja(kid, {
        nama: p.nama + ' (' + p.lokasiKode + ')',
        jenis: p.jenis, jabatan: p.jabatan,
        areaIds: petaArea[lid] || [], lokasiIds: [lid],
        shiftKode: p.shift, upah: p.upah, catatan: p.sebutan
      });
      if (r2.error) { lap.salah.push(p.nama + ': ' + r2.error); return; }
      r = r2;
    }
    if (r.pekerja) {
      (petaPekerjaLokasi[lid] = petaPekerjaLokasi[lid] || []).push(r.pekerja.id);
    }
    lap.petugas++;
  });

  /* ---- 4. peralatan ----

     KEADAANNYA TIDAK DITULIS LANGSUNG. Sebelumnya seluruh 1.326 alat
     disemai dengan `keadaan: 'dipakai'` tanpa pemegang — keadaan yang
     MUSTAHIL: barang tidak bisa sedang dipakai tanpa ada yang memakainya.
     Akibatnya layar Peralatan menuliskan seluruhnya sebagai
     “Dipakai · tidak ada pemegang”, dan pemeriksaan silang — dengan benar —
     melaporkan 1.323 alat yatim. Data contoh yang isinya mustahil membuat
     tiap penjaga yang bekerja terlihat seperti alat yang rusak.

     Yang dipakai sekarang: alat masuk ke GUDANG, lalu sebagian diserahkan
     lewat ASET.serah() kepada petugas di lokasinya — jalur yang sama yang
     dipakai manusia, sehingga riwayatnya ikut tertulis dan pemegangnya
     sungguh ada. Sisanya tetap di gudang, dan itu memang keadaan yang
     paling lazim di gedung mana pun. */
  lap.alat = 0;
  lap.alatDiserahkan = 0;
  d.aset.forEach(function (a, i) {
    var lid = petaLokasi[a.lokasiKode];
    if (!lid) return;
    var r = ASET.daftar(kid, {
      nama: a.nama, jenis: a.jenis,
      hargaBeli: a.harga, manfaatBulan: a.umurBulan,
      tglBeli: '2026-01-15',
      areaId: (petaArea[lid] || [])[0] || null,
      keadaan: 'gudang',
      catatan: a.lokasiKode
    }, APP.user);
    if (r.error) { lap.salah.push(a.nama + ': ' + r.error); return; }
    lap.alat++;

    /* Kira-kira sepertiganya sedang dipegang — troli dan alat tangan lebih
       sering melekat pada orangnya daripada mesin besar. Yang menerima
       harus petugas DI LOKASI YANG SAMA: alat di Medan yang dipegang orang
       Surabaya adalah data yang tidak mungkin dan akan ditangkap
       pemeriksaan silang sebagai temuan palsu. */
    if (i % 3 !== 0) return;
    var kandidat = (petaPekerjaLokasi[lid] || []);
    if (!kandidat.length) return;
    var rs = ASET.serah(r.aset.id, kandidat[i % kandidat.length], APP.user, {});
    if (!rs || !rs.error) lap.alatDiserahkan++;
  });

  /* ---- 5. bahan habis pakai ---- */
  lap.bahan = 0;
  d.bahan.forEach(function (b) {
    var r = MCS.tambahStok(kid, {
      nama: b[0], satuan: b[1], harga: b[2], awal: b[3], minimum: b[4],
      isiNilai: b[5] || 0, isiSatuan: b[6] || 'ml',
      cakupanM2: b[7] || 0,
      jenisArea: b[8] && b[8] !== 'semua'
        ? b[8].split(';').map(function (x) {
            var j = MCS.JENIS_AREA.filter(function (y) {
              return y.nama.toLowerCase().indexOf(x.trim().toLowerCase()) === 0 ||
                     x.trim().toLowerCase() === y.kode;
            })[0];
            return j ? j.kode : null;
          }).filter(Boolean)
        : [],
      jenisObjek: b[9]
        ? b[9].split(';').map(function (x) {
            var j = MCS.JENIS_OBJEK.filter(function (y) {
              return String(y.nama).split('/')[0].trim().toLowerCase() ===
                       x.trim().toLowerCase() || x.trim().toLowerCase() === y.kode;
            })[0];
            return j ? j.kode : null;
          }).filter(Boolean)
        : [],
      bahaya: b[10] || '', catatan: b[11] || ''
    });
    if (r.error) { lap.salah.push(b[0] + ': ' + r.error); return; }
    lap.bahan++;
  });

  /* ---- 6. staf korporat lain beserta perannya ---- */
  lap.staf = 1;
  d.staf.forEach(function (s) {
    if (s.peran === 'admin') return;
    var u = DB.insert('users', {
      role: 'korporat', korporatId: kid,
      nama: s.nama, jabatan: s.jabatan, email: s.email, telp: '',
      aktif: true, wajibGantiSandi: false,
      perusahaan: d.korporat.nama,
      alamatList: [], rekening: [],
      preferensi: { bahasa: 'id', notifWA: true, notifEmail: true,
                    ringkasanMingguan: true },
      emailVerifiedAt: U.nowISO(), telpVerifiedAt: null, sosial: [],
      metodeDaftar: 'admin',
      mcsPeran: s.peran,
      mcsLokasi: (s.lokasiKode || []).map(function (k) { return petaLokasi[k]; })
                   .filter(Boolean)
    });
    if (window.KEAMANAN) KEAMANAN.pasangSandi(u.id, 'buana2026');
    lap.staf++;
  });

  DB.save(true);
  lap.detik = Math.round((Date.now() - t0) / 100) / 10;
  return lap;
};
'penyemai siap';
