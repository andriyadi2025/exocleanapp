/* ==========================================================================
 *  mail-server.js — pengirim dokumen ke email klien (invoice & penawaran)
 *  --------------------------------------------------------------------------
 *  KENAPA ADA SERVER INI SAMA SEKALI
 *  Kunci penyedia email adalah kunci untuk MENGIRIM ATAS NAMA perusahaan.
 *  Siapa pun yang memegangnya bisa mengirim surat yang terlihat berasal dari
 *  EXOCLEAN — ke siapa saja, tentang apa saja. Menaruhnya di kode browser
 *  sama dengan menempelkannya di pintu depan. Kunci hanya hidup di .env di
 *  sini; browser bicara ke berkas ini, dan berkas ini yang bicara ke penyedia.
 *
 *  DUA PENJAGAAN YANG TIDAK BOLEH DILEPAS
 *
 *  1. TOKEN INTERNAL. Endpoint ini menerima "kirim surat ke alamat X berisi
 *     Y". Tanpa penjagaan, satu halaman mana pun di komputer yang sama bisa
 *     memakai server ini sebagai mesin spam yang beralamat balik ke domain
 *     Anda — dan yang kena getahnya adalah reputasi pengiriman domain itu,
 *     yang butuh berbulan-bulan untuk dipulihkan.
 *
 *  2. BATAS LAJU. Bukan untuk menahan penyalahgunaan saja, melainkan untuk
 *     menahan KESALAHAN: satu perulangan yang salah tulis di layar admin bisa
 *     mengirim ribuan surat sebelum ada yang sempat menutup tabnya.
 *
 *  ENDPOINT
 *    GET  /api/mail/health   → status penyedia, tanpa membocorkan kuncinya
 *    POST /api/mail/kirim    → { ke, nama, subjek, html, teks, jenis, ref }
 *    GET  /api/mail/riwayat  → 100 pengiriman terakhir, untuk pencocokan
 *
 *  Jalankan:  node mail-server.js
 * ========================================================================== */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

/* ---------------------------------------------------------------- .env */
(function muatEnv() {
  const p = path.join(__dirname, '.env');
  if (!fs.existsSync(p)) return;
  const teks = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
  for (const baris of teks.split(/\r?\n/)) {
    const m = baris.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
})();

const PORT = Number(process.env.MAIL_PORT || 4400);
const ASAL_BOLEH = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080')
  .split(',').map((s) => s.trim()).filter(Boolean);

const CFG = {
  provider: (process.env.EMAIL_PROVIDER || 'log').toLowerCase(),
  apiKey:   process.env.EMAIL_API_KEY || '',
  dari:     process.env.EMAIL_DARI || 'EXOCLEAN <no-reply@exoclean.id>',
  balasKe:  process.env.EMAIL_BALAS_KE || '',
  /* Token internal. Dibiarkan kosong berarti server MENOLAK semua permintaan
     kirim — gagal tertutup, bukan gagal terbuka. Server yang mengirim surat
     tanpa penjagaan lebih berbahaya daripada server yang tidak mengirim apa
     pun. */
  token:    process.env.MAIL_TOKEN || '',
  maksPerJam: Number(process.env.MAIL_MAKS_PER_JAM || 200)
};

const BERKAS_LOG = path.join(__dirname, 'mail-log.json');

/* ============================================================== CATATAN
   Riwayat disimpan supaya pengiriman bisa dicocokkan saat klien berkata
   "saya tidak menerima apa-apa". Isi suratnya TIDAK ikut disimpan — hanya
   kepada siapa, kapan, dan hasilnya. Menyimpan isinya berarti membuat
   salinan kedua data klien di tempat yang tidak dijaga sebaik basis data. */
function bacaLog() {
  try { return JSON.parse(fs.readFileSync(BERKAS_LOG, 'utf8')); }
  catch (e) { return []; }
}
function tulisLog(baris) {
  const log = bacaLog();
  log.push(baris);
  /* Dipangkas supaya berkas tidak tumbuh tanpa batas di komputer siapa pun
     yang menjalankannya. */
  while (log.length > 2000) log.shift();
  fs.writeFileSync(BERKAS_LOG, JSON.stringify(log, null, 2));
}

let jendela = [];      /* stempel waktu kiriman satu jam terakhir */
function lewatBatas() {
  const batasBawah = Date.now() - 3600000;
  jendela = jendela.filter((t) => t > batasBawah);
  return jendela.length >= CFG.maksPerJam;
}

/* ================================================================ KIRIM */
function alamatSah(x) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(x || '').trim());
}

async function kirimEmail({ ke, nama, subjek, html, teks }) {
  const tujuan = nama ? `${nama} <${ke}>` : ke;

  if (CFG.provider === 'log') {
    console.log('\n[EMAIL→' + tujuan + '] ' + subjek);
    console.log((teks || html || '').slice(0, 600));
    console.log('--- mode log: TIDAK dikirim ke mana pun ---\n');
    return { terkirim: true, via: 'log', simulasi: true };
  }

  if (CFG.provider === 'resend') {
    if (!CFG.apiKey) throw new Error('EMAIL_API_KEY belum diisi di .env');
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + CFG.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        from: CFG.dari, to: [ke], subject: subjek, html: html, text: teks
      }, CFG.balasKe ? { reply_to: CFG.balasKe } : {}))
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Resend menolak (' + r.status + '): ' + (j.message || ''));
    return { terkirim: true, via: 'resend', id: j.id || null };
  }

  if (CFG.provider === 'sendgrid') {
    if (!CFG.apiKey) throw new Error('EMAIL_API_KEY belum diisi di .env');
    const dariAlamat = CFG.dari.replace(/.*<|>.*/g, '').trim();
    const dariNama = CFG.dari.replace(/<.*/, '').trim() || undefined;
    const isi = [];
    if (teks) isi.push({ type: 'text/plain', value: teks });
    if (html) isi.push({ type: 'text/html', value: html });
    const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + CFG.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({
        personalizations: [{ to: [{ email: ke, name: nama || undefined }] }],
        from: { email: dariAlamat, name: dariNama },
        subject: subjek, content: isi
      }, CFG.balasKe ? { reply_to: { email: CFG.balasKe } } : {}))
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error('SendGrid menolak (' + r.status + '): ' + t.slice(0, 200));
    }
    return { terkirim: true, via: 'sendgrid' };
  }

  throw new Error('EMAIL_PROVIDER "' + CFG.provider + '" tidak dikenal. ' +
    'Yang didukung: log, resend, sendgrid.');
}

/* ================================================================ HTTP */
function jawab(res, kode, data) {
  const badan = JSON.stringify(data);
  res.writeHead(kode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(badan)
  });
  res.end(badan);
}

function pasangCORS(req, res) {
  const asal = req.headers.origin;
  if (asal && ASAL_BOLEH.indexOf(asal) >= 0) {
    res.setHeader('Access-Control-Allow-Origin', asal);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Mail-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  }
}

function bacaBadan(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const potong = [];
    req.on('data', (c) => {
      n += c.length;
      /* Surat yang lebih besar dari ini hampir pasti kesalahan, bukan
         invoice. Batasnya di sini supaya satu permintaan tidak bisa
         menghabiskan memori server. */
      if (n > 512 * 1024) { reject(new Error('Isi terlalu besar')); req.destroy(); return; }
      potong.push(c);
    });
    req.on('end', () => {
      try { resolve(potong.length ? JSON.parse(Buffer.concat(potong).toString('utf8')) : {}); }
      catch (e) { reject(new Error('JSON tidak sah')); }
    });
    req.on('error', reject);
  });
}

const TLS = require('./tls');
const jadi = TLS.bikinServer(null, async (req, res) => {
  pasangCORS(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/mail/health') {
    return jawab(res, 200, {
      ok: true,
      provider: CFG.provider,
      simulasi: CFG.provider === 'log',
      /* Kunci TIDAK pernah dikembalikan — yang berguna hanyalah "sudah diisi
         atau belum", dan itu tidak menuntut membocorkan isinya. */
      apiKeyTerisi: !!CFG.apiKey,
      tokenTerpasang: !!CFG.token,
      dari: CFG.dari,
      maksPerJam: CFG.maksPerJam,
      terkirimSejamTerakhir: jendela.filter((t) => t > Date.now() - 3600000).length
    });
  }

  if (url.pathname === '/api/mail/riwayat') {
    return jawab(res, 200, { riwayat: bacaLog().slice(-100).reverse() });
  }

  if (url.pathname === '/api/mail/kirim' && req.method === 'POST') {
    if (!CFG.token) {
      return jawab(res, 503, { ok: false,
        pesan: 'MAIL_TOKEN belum diisi di .env. Server menolak mengirim tanpa token — ' +
               'endpoint pengirim surat tanpa penjagaan bisa dipakai siapa pun di komputer ini.' });
    }
    if (req.headers['x-mail-token'] !== CFG.token) {
      return jawab(res, 401, { ok: false, pesan: 'Token tidak cocok.' });
    }
    if (lewatBatas()) {
      return jawab(res, 429, { ok: false,
        pesan: 'Batas ' + CFG.maksPerJam + ' surat per jam tercapai. ' +
               'Batas ini menahan kesalahan berulang, bukan hanya penyalahgunaan.' });
    }

    let b;
    try { b = await bacaBadan(req); }
    catch (e) { return jawab(res, 400, { ok: false, pesan: e.message }); }

    if (!alamatSah(b.ke)) return jawab(res, 400, { ok: false, pesan: 'Alamat email tidak sah.' });
    if (!b.subjek) return jawab(res, 400, { ok: false, pesan: 'Subjek kosong.' });
    if (!b.html && !b.teks) return jawab(res, 400, { ok: false, pesan: 'Isi surat kosong.' });

    try {
      const hasil = await kirimEmail(b);
      jendela.push(Date.now());
      tulisLog({ at: new Date().toISOString(), ke: b.ke, subjek: b.subjek,
                 jenis: b.jenis || null, ref: b.ref || null,
                 via: hasil.via, id: hasil.id || null, ok: true });
      return jawab(res, 200, Object.assign({ ok: true }, hasil));
    } catch (e) {
      tulisLog({ at: new Date().toISOString(), ke: b.ke, subjek: b.subjek,
                 jenis: b.jenis || null, ref: b.ref || null,
                 via: CFG.provider, ok: false, galat: e.message });
      return jawab(res, 502, { ok: false, pesan: e.message });
    }
  }

  jawab(res, 404, { ok: false, pesan: 'Endpoint tidak dikenal' });
});

const server = jadi.server;
const ALAMAT = TLS.alamat(null, jadi.tls);
TLS.dengar(jadi, PORT, ALAMAT, () => {
  console.log(TLS.keterangan('mail-server', PORT, ALAMAT));
  console.log('  penyedia   : ' + CFG.provider + (CFG.provider === 'log' ? '  (mode log — surat TIDAK dikirim)' : ''));
  console.log('  dari       : ' + CFG.dari);
  console.log('  token      : ' + (CFG.token ? 'terpasang' : 'BELUM DIISI — pengiriman ditolak'));
  console.log('  batas      : ' + CFG.maksPerJam + ' surat/jam');
});
