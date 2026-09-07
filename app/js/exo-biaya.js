/* ==========================================================================
   exo-biaya.js — pusat kendali biaya & asuransi (pola Tokopedia)
   --------------------------------------------------------------------------
   Satu sumber kebenaran untuk semua "biaya aplikasi" yang dikutip dari
   pembeli, penjual, dan pelanggan jasa, plus aturan asuransi pengiriman dan
   proteksi produk. Dibaca oleh EXO_TOKO (checkout marketplace), EXO_DATA
   (biaya aplikasi jasa kebersihan), dan konsol admin → Marketplace → Biaya &
   asuransi. Disimpan di EXO_DB setting 'biaya'; perubahan hanya lewat
   Persetujuan jenis 'biaya-setelan' (tingkat tinggi) + PIN + audit.

   Rujukan Tokopedia (Tokopedia Care, 2025–2026):
     · Biaya Jasa Aplikasi: Rp1.000/transaksi, 4 transaksi pertama pembeli
       baru gratis. · Biaya Layanan: Rp1.000 khusus pembayaran virtual
       account, pembeli baru bebas 30 hari. · Asuransi Pengiriman: premi
       persentase nilai barang, wajib untuk kategori tertentu (elektronik/
       barang pecah belah/nilai tinggi), klaim ganti sesuai nilai barang.
     · Proteksi Produk (garansi tambahan) persentase harga, kategori terbatas.
     · Biaya Layanan Penjual: Regular / Power Merchant / Official Store,
       berbeda per kategori (1–10%), tambahan untuk peserta program Gratis
       Ongkir. · Program Bebas Ongkir: ambang belanja & subsidi maksimum.
   ========================================================================== */
(function () {
  'use strict';
  var KUNCI = 'biaya';
  var BAWAAN = {
    pembeli:  { biayaJasa:1000, gratisMetode:['wallet'], bebasTransaksiPertama:4, biayaLayananVA:1000, hariPembeliBaru:30 },
    asuransi: { aktif:true, pct:0.5, min:2500, pembulatan:500, bawaanCentang:true, bolehDilepas:true, wajibKategori:['mesin'], wajibMinHarga:2000000, gantiMaksPct:100, klaimHari:2, mitra:'Asuransi rekanan (simulasi)' },
    proteksi: { aktif:true, pct:5, minHarga:500000, kategori:['mesin'], bulanGaransi:12 },
    komisi:   { reguler:5, power:4.5, official:3, kategori:{}, programOngkir:2, maksPerPesanan:0 },
    ongkir:   { aktif:true, min:150000, maks:20000, hanyaPeserta:false },
    poin:     { maksPct:10 },
    jasa:     { biayaAplikasi:3000 }
  };
  var LABEL = {
    'pembeli.biayaJasa':'Biaya jasa aplikasi (Rp/transaksi)', 'pembeli.gratisMetode':'Metode bayar bebas biaya jasa', 'pembeli.bebasTransaksiPertama':'Transaksi pertama bebas biaya jasa', 'pembeli.biayaLayananVA':'Biaya layanan virtual account (Rp)', 'pembeli.hariPembeliBaru':'Pembeli baru bebas biaya layanan (hari)',
    'asuransi.aktif':'Asuransi pengiriman ditawarkan', 'asuransi.pct':'Premi asuransi (% nilai barang)', 'asuransi.min':'Premi minimum (Rp)', 'asuransi.pembulatan':'Pembulatan premi (Rp)', 'asuransi.bawaanCentang':'Tercentang otomatis di checkout', 'asuransi.bolehDilepas':'Pembeli boleh melepas asuransi', 'asuransi.wajibKategori':'Kategori wajib asuransi', 'asuransi.wajibMinHarga':'Wajib asuransi bila subtotal ≥ (Rp)', 'asuransi.gantiMaksPct':'Ganti rugi maksimum (% nilai barang)', 'asuransi.klaimHari':'Batas klaim setelah diterima (hari)', 'asuransi.mitra':'Mitra asuransi',
    'proteksi.aktif':'Proteksi produk ditawarkan', 'proteksi.pct':'Harga proteksi (% harga)', 'proteksi.minHarga':'Ditawarkan bila harga ≥ (Rp)', 'proteksi.kategori':'Kategori proteksi', 'proteksi.bulanGaransi':'Masa proteksi (bulan)',
    'komisi.reguler':'Biaya layanan toko Reguler (%)', 'komisi.power':'Biaya layanan Power Merchant (%)', 'komisi.official':'Biaya layanan Official Store (%)', 'komisi.kategori':'Biaya layanan khusus per kategori (%)', 'komisi.programOngkir':'Tambahan peserta program Gratis Ongkir (%)', 'komisi.maksPerPesanan':'Biaya layanan maksimum per pesanan (Rp, 0 = tanpa batas)',
    'ongkir.aktif':'Program Gratis Ongkir aktif', 'ongkir.min':'Minimum belanja per toko (Rp)', 'ongkir.maks':'Subsidi maksimum per toko (Rp)', 'ongkir.hanyaPeserta':'Hanya toko peserta program',
    'poin.maksPct':'Poin maksimum dipakai (% total)', 'jasa.biayaAplikasi':'Biaya aplikasi jasa kebersihan (Rp/pesanan)'
  };
  var BATAS = { 'pembeli.biayaJasa':[0, 10000], 'pembeli.bebasTransaksiPertama':[0, 20], 'pembeli.biayaLayananVA':[0, 10000], 'pembeli.hariPembeliBaru':[0, 365], 'asuransi.pct':[0, 5], 'asuransi.min':[0, 50000], 'asuransi.pembulatan':[1, 5000], 'asuransi.wajibMinHarga':[0, 100000000], 'asuransi.gantiMaksPct':[10, 100], 'asuransi.klaimHari':[1, 30], 'proteksi.pct':[0, 20], 'proteksi.minHarga':[0, 100000000], 'proteksi.bulanGaransi':[1, 36], 'komisi.reguler':[0, 20], 'komisi.power':[0, 20], 'komisi.official':[0, 20], 'komisi.programOngkir':[0, 10], 'komisi.maksPerPesanan':[0, 10000000], 'ongkir.min':[0, 10000000], 'ongkir.maks':[0, 200000], 'poin.maksPct':[0, 100], 'jasa.biayaAplikasi':[0, 50000] };

  function db() { return window.EXO_DB || null; }
  function salin(o) { return JSON.parse(JSON.stringify(o)); }
  function gabung(dasar, atas) { var out = salin(dasar); Object.keys(atas || {}).forEach(function (k) { if (atas[k] && typeof atas[k] === 'object' && !Array.isArray(atas[k]) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = Object.assign({}, out[k], atas[k]); else out[k] = salin(atas[k]); }); return out; }
  function pengaturan() { var d = db(); var s = d ? d.setting(KUNCI) : null; return gabung(BAWAAN, s || {}); }
  function simpan(patch) { var d = db(); if (!d) throw new Error('Basis data tidak tersedia'); var baru = gabung(pengaturan(), patch || {}); var g = periksa(baru); if (g.length) throw new Error(g[0]); d.setting(KUNCI, baru); terapkanJasa(); return baru; }
  function ambil(o, jalur) { return jalur.split('.').reduce(function (x, k) { return x == null ? x : x[k]; }, o); }
  function periksa(cfg) {
    var g = []; Object.keys(BATAS).forEach(function (j) { var v = ambil(cfg, j); if (typeof v !== 'number' || isNaN(v)) { g.push(LABEL[j] + ' harus angka'); return; } if (v < BATAS[j][0] || v > BATAS[j][1]) g.push(LABEL[j] + ' harus ' + BATAS[j][0] + '–' + BATAS[j][1]); });
    if (cfg.ongkir.maks > cfg.ongkir.min && cfg.ongkir.min > 0) g.push('Subsidi ongkir maksimum tidak boleh melebihi minimum belanja');
    return g;
  }
  /* Beda dua konfigurasi → daftar { jalur, label, dari, ke } untuk ringkasan usulan & audit. */
  function beda(a, b) {
    var out = []; Object.keys(LABEL).forEach(function (j) { var x = ambil(a, j), y = ambil(b, j); if (JSON.stringify(x) !== JSON.stringify(y)) out.push({ jalur:j, label:LABEL[j], dari:x, ke:y }); }); return out;
  }
  function fmt(v) { if (Array.isArray(v)) return v.length ? v.join(', ') : '—'; if (v && typeof v === 'object') return Object.keys(v).length ? Object.keys(v).map(function (k) { return k + ' ' + v[k] + '%'; }).join(', ') : '—'; if (typeof v === 'boolean') return v ? 'ya' : 'tidak'; return String(v); }

  /* ---------- rumus yang dipakai mesin marketplace & jasa ---------- */
  function bulat(n, ke) { ke = ke || 1; return Math.ceil(n / ke) * ke; }
  /* Tampilan datar untuk EXO_TOKO (kompatibel dengan ATURAN lama). */
  function aturanToko() { var c = pengaturan(); return { gratisOngkirMin:c.ongkir.aktif ? c.ongkir.min : Infinity, gratisOngkirMaks:c.ongkir.aktif ? c.ongkir.maks : 0, gratisOngkirHanyaPeserta:!!c.ongkir.hanyaPeserta, asuransiAktif:!!c.asuransi.aktif, asuransiPct:c.asuransi.pct, asuransiMin:c.asuransi.min, asuransiBulat:c.asuransi.pembulatan, asuransiBawaan:!!c.asuransi.bawaanCentang, asuransiBolehDilepas:!!c.asuransi.bolehDilepas, asuransiWajibKategori:c.asuransi.wajibKategori || [], asuransiWajibMinHarga:c.asuransi.wajibMinHarga, proteksiAktif:!!c.proteksi.aktif, proteksiPct:c.proteksi.pct, proteksiMinHarga:c.proteksi.minHarga, proteksiKategori:c.proteksi.kategori || [], proteksiBulan:c.proteksi.bulanGaransi, biayaJasa:c.pembeli.biayaJasa, biayaJasaGratisMetode:c.pembeli.gratisMetode || [], bebasTransaksiPertama:c.pembeli.bebasTransaksiPertama, biayaLayananVA:c.pembeli.biayaLayananVA, poinMaksPct:c.poin.maksPct }; }
  /* Biaya layanan penjual (%) menurut tingkat toko, kategori barang, dan keikutsertaan program ongkir. */
  function komisiPct(toko, kategori) { var c = pengaturan().komisi, t = toko || {}, tingkat = t.badge === 'official' ? 'official' : t.badge === 'power' ? 'power' : 'reguler'; var pct = typeof c.kategori[kategori] === 'number' ? c.kategori[kategori] : c[tingkat]; if (t.programOngkir) pct += c.programOngkir; return Math.round(pct * 100) / 100; }
  function komisiRp(toko, subtotal, kategori) { var c = pengaturan().komisi, n = Math.round(subtotal * komisiPct(toko, kategori) / 100); return c.maksPerPesanan > 0 ? Math.min(n, c.maksPerPesanan) : n; }
  function premiAsuransi(subtotal) { var c = pengaturan().asuransi; if (!c.aktif) return 0; return Math.max(c.min, bulat(subtotal * c.pct / 100, c.pembulatan)); }
  function asuransiWajib(items, subtotal) { var c = pengaturan().asuransi; if (!c.aktif) return false; if (c.wajibMinHarga > 0 && subtotal >= c.wajibMinHarga) return true; return (items || []).some(function (it) { return it.asuransiWajib || (c.wajibKategori || []).indexOf(it.kategori) >= 0; }); }
  function biayaJasaPembeli(metode, nTransaksiSebelumnya) { var c = pengaturan().pembeli; if ((c.gratisMetode || []).indexOf(metode) >= 0) return 0; if ((Number(nTransaksiSebelumnya) || 0) < c.bebasTransaksiPertama) return 0; return c.biayaJasa; }
  function biayaLayananVA(metode, hariSejakDaftar) { var c = pengaturan().pembeli; if (metode !== 'va') return 0; if (hariSejakDaftar != null && hariSejakDaftar < c.hariPembeliBaru) return 0; return c.biayaLayananVA; }
  function subsidiOngkir(subtotal, ongkir, toko) { var c = pengaturan().ongkir; if (!c.aktif || ongkir <= 0 || subtotal < c.min) return 0; if (c.hanyaPeserta && !(toko && toko.programOngkir)) return 0; return Math.min(ongkir, c.maks); }

  /* ---------- simulasi satu transaksi (untuk kalkulator admin) ---------- */
  function simulasi(p) {
    p = p || {}; var harga = Number(p.harga) || 0, ongkir = Number(p.ongkir) || 0, toko = { badge:p.badge || 'reguler', programOngkir:!!p.programOngkir };
    var komisi = komisiRp(toko, harga, p.kategori), premi = premiAsuransi(harga), wajib = asuransiWajib([{ kategori:p.kategori }], harga), cfgP = pengaturan().proteksi;
    var proteksiBoleh = cfgP.aktif && ((cfgP.kategori || []).indexOf(p.kategori) >= 0 || harga >= cfgP.minHarga), proteksi = proteksiBoleh ? bulat(harga * cfgP.pct / 100, 100) : 0;
    var subsidi = subsidiOngkir(harga, ongkir, toko), jasa = biayaJasaPembeli(p.metode || 'va', p.nTransaksi), va = biayaLayananVA(p.metode || 'va', p.hariDaftar);
    var pembeliBayar = harga + ongkir - subsidi + (p.asuransi !== false || wajib ? premi : 0) + (p.proteksi ? proteksi : 0) + jasa + va, penjualTerima = harga - komisi + ongkir;
    return { harga:harga, ongkir:ongkir, komisi:komisi, komisiPct:komisiPct(toko, p.kategori), premi:premi, asuransiWajib:wajib, proteksiBoleh:proteksiBoleh, proteksi:proteksi, subsidi:subsidi, biayaJasa:jasa, biayaLayananVA:va, pembeliBayar:pembeliBayar, penjualTerima:penjualTerima, platform:komisi + jasa + va + (p.asuransi !== false || wajib ? premi : 0) + (p.proteksi ? proteksi : 0) - subsidi };
  }

  /* ---------- laporan pendapatan biaya (dari pesananToko yang tersimpan) ---------- */
  function laporan(bulan) {
    var d = db(); if (!d) return null; var ps = d.all('pesananToko').filter(function (o) { return o.status !== 'menunggu-bayar' && (!bulan || String(o.at || '').slice(0, 7) === bulan); });
    var r = { pesanan:ps.length, selesai:0, komisi:0, biayaJasa:0, biayaLayananVA:0, asuransi:0, proteksi:0, subsidi:0, gmv:0, perBulan:{} };
    ps.forEach(function (o) { var b = String(o.at || '').slice(0, 7), m = r.perBulan[b] = r.perBulan[b] || { bulan:b, pesanan:0, komisi:0, biayaJasa:0, asuransi:0, proteksi:0, subsidi:0 }; m.pesanan++; r.gmv += o.subtotal || 0;
      if (o.status === 'selesai') { r.selesai++; r.komisi += o.biayaLayanan || 0; m.komisi += o.biayaLayanan || 0; }
      if (o.status !== 'dibatalkan') { r.biayaJasa += o.biayaJasa || 0; r.biayaLayananVA += o.biayaLayananVA || 0; r.asuransi += o.asuransi || 0; r.proteksi += o.proteksi || 0; r.subsidi += o.gratisOngkir || 0; m.biayaJasa += (o.biayaJasa || 0) + (o.biayaLayananVA || 0); m.asuransi += o.asuransi || 0; m.proteksi += o.proteksi || 0; m.subsidi += o.gratisOngkir || 0; } });
    r.bersih = r.komisi + r.biayaJasa + r.biayaLayananVA + r.asuransi + r.proteksi - r.subsidi;
    r.daftarBulan = Object.keys(r.perBulan).sort().reverse().map(function (k) { return r.perBulan[k]; });
    return r;
  }

  /* ---------- biaya aplikasi jasa kebersihan → EXO_DATA.PLATFORM_FEE ---------- */
  function terapkanJasa() { try { if (window.EXO_DATA) EXO_DATA.PLATFORM_FEE = pengaturan().jasa.biayaAplikasi; } catch (e) { /* abaikan */ } }
  setTimeout(terapkanJasa, 0);
  try { window.addEventListener('storage', function (e) { if (!e.key || e.key.indexOf('exoclean') === 0) setTimeout(terapkanJasa, 0); }); } catch (e) { /* abaikan */ }

  /* ---------- Persetujuan: perubahan setelan hanya lewat usulan tingkat tinggi ---------- */
  /* Modul persetujuan dimuat setelah berkas ini — daftarkan segera bila ada, ulangi setelah semua skrip dimuat, dan sediakan untuk dipanggil konsol admin. */
  function daftarkanPersetujuan() { if (!window.EXO_PERSETUJUAN) return false; try { EXO_PERSETUJUAN.TINGKAT['biaya-setelan'] = 'tinggi'; EXO_PERSETUJUAN.daftarkanPenerap('biaya-setelan', function (u) { return simpan(u.muatan.setelan || u.muatan); }); return true; } catch (e) { return false; } }
  daftarkanPersetujuan(); setTimeout(daftarkanPersetujuan, 0);

  window.EXO_BIAYA = { KUNCI:KUNCI, BAWAAN:BAWAAN, LABEL:LABEL, BATAS:BATAS, pengaturan:pengaturan, simpan:simpan, periksa:periksa, beda:beda, fmt:fmt, aturanToko:aturanToko, komisiPct:komisiPct, komisiRp:komisiRp, premiAsuransi:premiAsuransi, asuransiWajib:asuransiWajib, biayaJasaPembeli:biayaJasaPembeli, biayaLayananVA:biayaLayananVA, subsidiOngkir:subsidiOngkir, simulasi:simulasi, laporan:laporan, terapkanJasa:terapkanJasa, daftarkanPersetujuan:daftarkanPersetujuan };
})();
