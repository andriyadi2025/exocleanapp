/* ==========================================================================
 *  harga.js — mesin harga di server: nominal pembayaran DITENTUKAN SERVER
 * --------------------------------------------------------------------------
 *  Menutup temuan audit "amount diambil dari klien". Klien hanya mengirim
 *  KOMPOSISI pesanan (jasa, jam, juru, add-on, regu, frekuensi, voucher,
 *  ekstra); server menghitung totalnya dari KATALOG yang dipegang server dan
 *  menerbitkan TAGIHAN (kutipan 15 menit, terikat sub sesi). charge/authorize
 *  hanya menerima tagihanId — bukan amount.
 *
 *  Katalog: data/harga.json (diterbitkan admin lewat POST /api/pay/harga)
 *  atau harga-bawaan.json (dibangkitkan dari js/exo-data.js oleh
 *  alat/ekspor-harga.js). Rumusnya sama dengan aplikasi (exo-core.js):
 *    tarif  = bulat(tarifJasa × faktorJuru)
 *    dasar  = tarif × jam
 *    total  = max(0, dasar + addon + biayaRegu − diskonLangganan − flash
 *                    + biayaAplikasi − voucher)
 *  Tagihan akhir (kanal tertunda): nominal transaksi asal + ekstra yang
 *  disetujui di lokasi, dibatasi kebijakan (maks per item & % dari dasar).
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BAWAAN = path.join(__dirname, 'harga-bawaan.json');
const TTL_TAGIHAN_MS = 15 * 60 * 1000;
let katalog = null, berkasKatalog = null;

function bulat(r) { return r >= 20000 ? Math.round(r / 1000) * 1000 : Math.round(r / 500) * 500; }
function muat(jalur) {
  berkasKatalog = jalur || process.env.HARGA_BERKAS || path.join(__dirname, 'data', 'harga.json');
  try { katalog = JSON.parse(fs.readFileSync(berkasKatalog, 'utf8')); katalog._sumber = berkasKatalog; }
  catch (e) { katalog = JSON.parse(fs.readFileSync(BAWAAN, 'utf8')); katalog._sumber = BAWAAN; }
  return katalog;
}
function kini() { return katalog || muat(); }
function periksaKatalog(k) {
  if (!k || typeof k !== 'object' || !k.jasa || typeof k.jasa !== 'object') throw galat('katalog: jasa wajib');
  Object.keys(k.jasa).forEach((id) => { const j = k.jasa[id]; if (!Number.isFinite(Number(j.tarif)) || j.tarif < 0 || j.tarif > 100000000) throw galat('katalog: tarif ' + id + ' tidak sah'); });
  if (k.biayaAplikasi != null && !(Number(k.biayaAplikasi) >= 0)) throw galat('katalog: biayaAplikasi');
  return true;
}
function simpan(k, oleh) {
  periksaKatalog(k);
  const bersih = JSON.parse(JSON.stringify(k)); delete bersih._sumber;
  bersih.at = new Date().toISOString(); bersih.oleh = oleh || null; bersih.versi = bersih.versi || ('v' + Date.now().toString(36));
  const jalur = berkasKatalog || process.env.HARGA_BERKAS || path.join(__dirname, 'data', 'harga.json');
  fs.mkdirSync(path.dirname(jalur), { recursive: true, mode: 0o700 });
  fs.writeFileSync(jalur + '.tmp', JSON.stringify(bersih), { mode: 0o600 }); fs.renameSync(jalur + '.tmp', jalur);
  katalog = Object.assign({}, bersih, { _sumber: jalur });
  return katalog;
}
function galat(pesan, status) { const e = new Error(pesan); e.status = status || 400; return e; }

/** Hitung tagihan jasa dari komposisi. Mengembalikan { total, rincian }. */
function hitungJasa(p, k) {
  k = k || kini(); p = p || {};
  const jasa = k.jasa[String(p.jasa || '')]; if (!jasa) throw galat('Layanan tidak dikenal: ' + p.jasa);
  if (jasa.aktif === false) throw galat('Layanan sedang dijeda');
  const jam = Number(p.jam); if (!Number.isFinite(jam) || jam <= 0 || jam > 200) throw galat('Jumlah/durasi tidak sah');
  const minQty = (k.minQty || {})[p.jasa] || (jasa.satuan === '/hour' ? 2 : 1); if (jam < minQty) throw galat('Minimal ' + minQty + ' untuk layanan ini');
  let faktor = 1; if (p.juru) { const f = (k.juru || {})[String(p.juru)]; if (f == null) throw galat('Juru bersih tidak dikenal di katalog server'); faktor = Number(f) || 1; }
  if (faktor < (k.faktorMin || 0.5) || faktor > (k.faktorMaks || 1.6)) throw galat('Faktor tarif juru di luar batas');
  const tarif = bulat(Number(jasa.tarif) * faktor), dasar = tarif * jam;
  const setAddon = (k.addon || {})[p.jasa] || []; let addon = 0; const addonDipakai = [];
  (Array.isArray(p.tambahan) ? p.tambahan : []).forEach((id) => { const a = setAddon.find((x) => x.id === id); if (!a) throw galat('Add-on tidak dikenal: ' + id); addon += Number(a.harga) || 0; addonDipakai.push(a.id); });
  const biayaRegu = Number(p.regu) === 2 ? (Number(k.biayaRegu) || 0) : 0;
  let diskonLangganan = 0, frekuensi = 'sekali';
  if (p.frekuensi && p.frekuensi !== 'sekali') { const boleh = (k.langganan && k.langganan.layanan || {})[p.jasa]; const pil = (k.langganan && k.langganan.pilihan || []).find((x) => x.id === p.frekuensi); if (boleh && pil) { diskonLangganan = bulat(dasar * (Number(pil.diskon) || 0)); frekuensi = pil.id; } }
  let flash = 0, flashPct = 0; const now = Date.now();
  (k.flash || []).forEach((f) => { if (f.jasa === p.jasa && (!f.mulai || new Date(f.mulai).getTime() <= now) && (!f.sampai || new Date(f.sampai).getTime() >= now) && Number(f.diskonPct) > flashPct) flashPct = Number(f.diskonPct); });
  if (flashPct > 0 && p.flash !== false) flash = Math.round(dasar * flashPct / 100 / 1000) * 1000;
  const biayaAplikasi = Number(k.biayaAplikasi) || 0;
  let voucher = 0, kodeVoucher = null;
  if (p.voucher) { const kode = String(p.voucher).toUpperCase(); const v = (k.voucher || {})[kode]; const subtotal = dasar + addon + biayaRegu; if (v && v.aktif !== false && subtotal >= (Number(v.min) || 0)) { voucher = Number(v.potongan) || 0; kodeVoucher = kode; } }
  const total = Math.max(0, dasar + addon + biayaRegu - diskonLangganan - flash + biayaAplikasi - voucher);
  return { total, rincian: { jasa: p.jasa, jam, tarif, faktor, dasar, addon, addonDipakai, biayaRegu, frekuensi, diskonLangganan, flashPct, flash, biayaAplikasi, voucher: kodeVoucher, potonganVoucher: voucher }, versiKatalog: k.versi };
}
/** Tagihan akhir: nominal asal + ekstra yang disetujui (dibatasi kebijakan). */
function hitungAkhir(nominalAsal, ekstra, k) {
  k = k || kini(); const pol = k.ekstra || { maksPerItem: 500000, maksPersenDasar: 50 };
  const asal = Number(nominalAsal); if (!Number.isFinite(asal) || asal < 0) throw galat('Nominal asal tidak sah');
  let tambah = 0; const daftar = [];
  (Array.isArray(ekstra) ? ekstra : []).slice(0, 10).forEach((e) => { const h = Math.round(Number(e && e.harga) || 0); if (h <= 0) return; if (h > pol.maksPerItem) throw galat('Ekstra melebihi batas per item (' + pol.maksPerItem + ')'); tambah += h; daftar.push({ nama: String(e.nama || 'Ekstra').slice(0, 60), harga: h }); });
  if (tambah > asal * (pol.maksPersenDasar / 100)) throw galat('Total ekstra melebihi ' + pol.maksPersenDasar + '% dari nominal asal');
  return { total: asal + tambah, rincian: { asal, ekstra: daftar, tambah }, versiKatalog: k.versi };
}

/* ---------- tagihan (kutipan) ---------- */
const tagihan = new Map();   /* id → { id, sub, total, rincian, jenis, at, sampai, dipakaiOleh } */
function buatTagihan(sub, hasil, jenis) { const id = 'TG-' + crypto.randomBytes(9).toString('base64url'); const t = { id, sub: sub || null, total: hasil.total, rincian: hasil.rincian, jenis, versiKatalog: hasil.versiKatalog, at: Date.now(), sampai: Date.now() + TTL_TAGIHAN_MS, dipakaiOleh: null }; tagihan.set(id, t); if (tagihan.size > 5000) { for (const [k, v] of tagihan) { if (v.sampai < Date.now()) tagihan.delete(k); if (tagihan.size <= 4000) break; } } return t; }
function ambilTagihan(id, sub) { const t = tagihan.get(String(id || '')); if (!t) throw galat('Tagihan tidak dikenal — minta tagihan baru', 404); if (t.sampai < Date.now()) throw galat('Tagihan kedaluwarsa — minta tagihan baru', 410); if (t.sub && sub && t.sub !== sub) throw galat('Tagihan milik akun lain', 403); if (t.dipakaiOleh) throw galat('Tagihan sudah dipakai untuk ' + t.dipakaiOleh, 409); return t; }
function pakaiTagihan(id, orderId) { const t = tagihan.get(id); if (t) t.dipakaiOleh = orderId; }
module.exports = { muat, kini, simpan, periksaKatalog, hitungJasa, hitungAkhir, buatTagihan, ambilTagihan, pakaiTagihan, bulat, TTL_TAGIHAN_MS };
