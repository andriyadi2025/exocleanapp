/* Uji server pendamping: header, CORS, token, pembatas laju, OTP. Menjalankan
   auth-server (SMS/email provider 'log') dan posisi-server di port acak, lalu
   menembak endpointnya. payment-server diuji untuk header + penolakan token. */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const PIN_UJI = path.join(os.tmpdir(), 'exo-uji-pin-' + process.pid + '.json');
const SV = path.join(__dirname, '..');
const SESI = require('../sesi');
const DUA = require('../duafaktor');
const PERANGKAT = require('../perangkat');
const PERANGKAT_UJI = path.join(require('os').tmpdir(), 'exo-uji-perangkat-' + process.pid + '.json');
const DUA_UJI = path.join(require('os').tmpdir(), 'exo-uji-2fa-' + process.pid + '.json');
const RAHASIA_HEX = SESI.buatKunci(), RAHASIA = Buffer.from(RAHASIA_HEX, 'hex');
const tokenKlien = SESI.terbitkan(RAHASIA, { sub: 'klienA', sisi: 'klien' }), tokenKlienB = SESI.terbitkan(RAHASIA, { sub: 'klienB', sisi: 'klien' }), tokenMitra = SESI.terbitkan(RAHASIA, { sub: 'mitraA', sisi: 'mitra' }), tokenAdmin = SESI.terbitkan(RAHASIA, { sub: 'adminA', sisi: 'admin' });
const H = (t, lagi) => Object.assign({ 'Content-Type': 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {}, lagi || {});
const hasil = [];
function ok(nama, kondisi, detail) { hasil.push((kondisi ? 'LULUS ' : 'GAGAL ') + nama + (detail ? ' · ' + detail : '')); }
function jalankan(berkas, env) {
  const p = spawn(process.execPath, [path.join(SV, berkas)], { cwd: SV, env: Object.assign({}, process.env, env), stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  return { p, keluaran: () => out };
}
const tidur = ms => new Promise(r => setTimeout(r, ms));
async function json(url, opsi) { const r = await fetch(url, opsi); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { status: r.status, h: r.headers, j }; }
(async () => {
  const ENV = { ALLOWED_ORIGINS: 'http://localhost:8081,*', EXO_TLS_CERT: '', EXO_TLS_KEY: '', SMS_PROVIDER: 'log', EMAIL_PROVIDER: 'log', OTP_JEDA_DETIK: '1', LAJU_OTP_KIRIM_PER_JAM_IP: '5', LAJU_POSISI_PER_MENIT: '5', SESI_SECRET: RAHASIA_HEX, ADMIN_TELP: '081200000009', PIN_BERKAS: PIN_UJI, DUA_BERKAS: DUA_UJI, DUA_RP_ID: 'localhost', PERANGKAT_BERKAS: PERANGKAT_UJI };
  const auth = jalankan('auth-server.js', Object.assign({ AUTH_PORT: '4171' }, ENV));
  const pos = jalankan('posisi-server.js', Object.assign({ POSISI_PORT: '4272' }, ENV));
  const pay = jalankan('payment-server.js', Object.assign({ PORT: '4073', MIDTRANS_SERVER_KEY: 'SB-Mid-server-uji', PAY_MAKS_RUPIAH: '1000000', HARGA_BERKAS: path.join(require('os').tmpdir(), 'exo-uji-harga-' + process.pid + '.json') }, ENV));
  const kir = jalankan('kirim-server.js', Object.assign({ KIRIM_PORT: '4374', BITESHIP_API_KEY: '', KIRIM_SIMULASI: '1' }, ENV));
  const dwi = jalankan('dwi-server.js', Object.assign({ DWI_PORT: '4475', DWI_USER_ID: '', DWI_PASSWORD: '', DWI_SIMULASI: '1' }, ENV));
  /* tunggu semua server siap (start dingin 5 proses bisa > 3 detik) */
  for (let i = 0; i < 40; i++) { await tidur(500); try { const ok = await Promise.all(['http://127.0.0.1:4171/api/auth/health', 'http://127.0.0.1:4272/api/posisi/health', 'http://127.0.0.1:4073/api/pay/health', 'http://127.0.0.1:4374/api/kirim/health', 'http://127.0.0.1:4475/api/dwi/health'].map(u => fetch(u).then(r => r.ok).catch(() => false))); if (ok.every(Boolean)) break; } catch (e) { /* ulang */ } }
  const A = 'http://127.0.0.1:4171', P = 'http://127.0.0.1:4272', Y = 'http://127.0.0.1:4073', K = 'http://127.0.0.1:4374', D = 'http://127.0.0.1:4475';
  try {
    /* header & CORS */
    let r = await json(A + '/api/auth/health', { headers: { Origin: 'http://localhost:8081' } });
    ok('auth health', r.status === 200 && r.j && r.j.ok);
    ok('header nosniff/frame/CSP', r.h.get('x-content-type-options') === 'nosniff' && r.h.get('x-frame-options') === 'DENY' && /default-src 'none'/.test(r.h.get('content-security-policy') || ''), r.h.get('x-powered-by') ? 'x-powered-by masih ada' : 'x-powered-by hilang');
    ok('CORS asal terdaftar', r.h.get('access-control-allow-origin') === 'http://localhost:8081');
    r = await json(A + '/api/auth/health', { headers: { Origin: 'http://jahat.example' } });
    ok('CORS asal asing ditolak', !r.h.get('access-control-allow-origin'));
    ok('"*" di ALLOWED_ORIGINS diabaikan', /diabaikan/.test(auth.keluaran()));
    /* POST tanpa JSON */
    r = await fetch(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' });
    ok('POST non-JSON ditolak 415', r.status === 415);
    /* OTP alur */
    const kirim = () => json(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000001' }) });
    r = await kirim(); ok('OTP kirim (log)', r.status === 200 && r.j.ok && !('kode' in r.j), JSON.stringify(r.j));
    const kode = (auth.keluaran().match(/Kode verifikasi EXOCLEAN Anda: (\d{6})/) || [])[1];
    ok('kode hanya di log server', !!kode);
    r = await json(A + '/api/auth/otp/periksa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000001', kode: '000000' }) });
    ok('OTP salah ditolak', r.status === 400 && r.j.sisa === 4);
    r = await json(A + '/api/auth/otp/periksa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000001', kode }) });
    ok('OTP benar diterima', r.status === 200 && r.j.ok);
    ok('OTP benar → sesi bertanda tangan (sub pseudonim, sisi klien)', !!r.j.sesi && r.j.sisi === 'klien' && SESI.verifikasi(RAHASIA, r.j.sesi).ok && !String(r.j.sesi).includes('081200000001'));
    ok('sesi berisi sub yang sama untuk nomor yang sama', SESI.verifikasi(RAHASIA, r.j.sesi).klaim.sub === SESI.subDari(RAHASIA, 'telp', '081200000001'));
    const sesiKlien = r.j.sesi;
    /* 2FA: TOTP */
    r = await json(A + '/api/auth/2fa/totp/daftar', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    ok('2fa daftar tanpa sesi → 401', r.status === 401);
    r = await json(A + '/api/auth/2fa/totp/daftar', { method: 'POST', headers: H(sesiKlien) });
    ok('2fa totp daftar → rahasia + QR svg', r.status === 200 && /^[A-Z2-7]{32}$/.test(r.j.rahasia) && /<svg/.test(r.j.qrSvg), r.j && r.j.error);
    const rahasiaTotp = r.j.rahasia;
    r = await json(A + '/api/auth/2fa/totp/aktifkan', { method: 'POST', headers: H(sesiKlien), body: JSON.stringify({ kode: '000000' }) });
    ok('2fa aktifkan dengan kode salah → 400', r.status === 400);
    r = await json(A + '/api/auth/2fa/totp/aktifkan', { method: 'POST', headers: H(sesiKlien), body: JSON.stringify({ kode: DUA.totpKode(DUA.base32Decode(rahasiaTotp), DUA.totpLangkah(), 6) }) });
    ok('2fa aktifkan dengan kode benar → ok + 8 kode pemulihan', r.status === 200 && r.j.ok && r.j.pemulihan && r.j.pemulihan.length === 8, r.j && r.j.error);
    const pemulihan = r.j.pemulihan;
    r = await json(A + '/api/auth/2fa/status', { method: 'POST', headers: H(sesiKlien) });
    ok('2fa status aktif', r.status === 200 && r.j.aktif && r.j.totp && r.j.pemulihanSisa === 8);
    /* masuk ulang: OTP → sesi sementara → verifikasi */
    await tidur(1100); r = await kirim(); const kode2 = (auth.keluaran().match(/Kode verifikasi EXOCLEAN Anda: (\d{6})/g) || []).pop().match(/(\d{6})$/)[1];
    r = await json(A + '/api/auth/otp/periksa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000001', kode: kode2 }) });
    ok('OTP pada akun ber-2FA → perlu2fa + sesiSementara (bukan sesi penuh)', r.status === 200 && r.j.perlu2fa === true && r.j.sesiSementara && !r.j.sesi && r.j.metode.totp === true, JSON.stringify(r.j).slice(0, 120));
    const sementara = r.j.sesiSementara;
    r = await json(Y + '/api/pay/status', { method: 'POST', headers: H(sementara), body: JSON.stringify({ orderId: 'EXO-000001' }) });
    ok('sesi sementara ditolak server lain → 401 perlu2fa', r.status === 401 && r.j.perlu2fa === true);
    r = await json(A + '/api/auth/2fa/verifikasi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesiSementara: sementara, kode: '123456' }) });
    ok('2fa verifikasi kode salah → 400', r.status === 400);
    r = await json(A + '/api/auth/2fa/verifikasi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesiSementara: sementara, kode: DUA.totpKode(DUA.base32Decode(rahasiaTotp), DUA.totpLangkah() + 1, 6) }) });
    ok('2fa verifikasi kode autentikator (langkah berikutnya, belum dipakai) → sesi penuh', r.status === 200 && r.j.sesi && SESI.verifikasi(RAHASIA, r.j.sesi).ok && !SESI.verifikasi(RAHASIA, r.j.sesi).klaim.tahap, r.j && r.j.error);
    r = await json(A + '/api/auth/2fa/verifikasi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesiSementara: sementara, pemulihan: pemulihan[0] }) });
    ok('2fa kode pemulihan → sesi penuh', r.status === 200 && r.j.sesi);
    r = await json(A + '/api/auth/2fa/verifikasi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesiSementara: sementara, pemulihan: pemulihan[0] }) });
    ok('kode pemulihan yang sama tidak bisa dipakai lagi', r.status === 400);
    /* 2FA: passkey (autentikator tiruan) */
    const autentikator = DUA.simulasiAutentikator('localhost');
    r = await json(A + '/api/auth/2fa/passkey/tantangan', { method: 'POST', headers: H(sesiKlien), body: JSON.stringify({ jenis: 'daftar' }) });
    ok('passkey tantangan daftar', r.status === 200 && r.j.tantangan && r.j.rpId === 'localhost');
    r = await json(A + '/api/auth/2fa/passkey/daftar', { method: 'POST', headers: H(sesiKlien), body: JSON.stringify({ kredensial: autentikator.daftar(r.j.tantangan, 'http://localhost:8081'), nama: 'Uji' }) });
    ok('passkey daftar → ok', r.status === 200 && r.j.ok && r.j.id === autentikator.id, r.j && r.j.error);
    r = await json(A + '/api/auth/2fa/passkey/tantangan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'masuk', sesiSementara: sementara }) });
    ok('passkey tantangan masuk (sesi sementara)', r.status === 200 && r.j.izinkan.includes(autentikator.id));
    r = await json(A + '/api/auth/2fa/passkey/masuk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesiSementara: sementara, kredensial: autentikator.masuk(r.j.tantangan, 'http://localhost:8081') }) });
    ok('passkey masuk → sesi penuh', r.status === 200 && r.j.sesi, r.j && r.j.error);
    r = await json(A + '/api/auth/2fa/passkey/tantangan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'masuk', sesiSementara: sementara }) });
    const lain = DUA.simulasiAutentikator('localhost');
    r = await json(A + '/api/auth/2fa/passkey/masuk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sesiSementara: sementara, kredensial: lain.masuk(r.j.tantangan, 'http://localhost:8081') }) });
    ok('passkey asing ditolak', r.status === 400);
    r = await json(A + '/api/auth/2fa/nonaktif', { method: 'POST', headers: H(sesiKlien), body: JSON.stringify({ kode: pemulihan[1] }) });
    ok('2fa nonaktif dengan kode pemulihan → ok', r.status === 200 && r.j.ok, r.j && r.j.error);
    /* Perangkat baru & pengikatan perangkat */
    const dev = PERANGKAT.simulasiPerangkat();
    await tidur(1100); r = await kirim(); const kode3 = (auth.keluaran().match(/Kode verifikasi EXOCLEAN Anda: (\d{6})/g) || []).pop().match(/(\d{6})$/)[1];
    const logSebelum = auth.keluaran().length;
    r = await json(A + '/api/auth/otp/periksa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000001', kode: kode3, perangkat: dev.info('HP Uji') }) });
    ok('OTP + info perangkat → sesi terikat perangkat, ditandai perangkat baru', r.status === 200 && r.j.sesi && r.j.perangkatBaru === true && r.j.terikatPerangkat === true, JSON.stringify(r.j).slice(0, 160));
    const sesiDev = r.j.sesi, klaimDev = SESI.verifikasi(RAHASIA, sesiDev).klaim;
    ok('klaim dev/dkt di sesi cocok dengan perangkat', klaimDev.dev === dev.id && klaimDev.dkt === dev.dkt);
    await tidur(300); ok('notifikasi login perangkat baru terkirim (SMS log)', /perangkat baru \(HP Uji\)/.test(auth.keluaran().slice(logSebelum)));
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(sesiDev), body: JSON.stringify({ orderId: 'EXO-777777', channel: 'qris', amount: 10000 }) });
    ok('sesi terikat perangkat tanpa bukti → 403 perluPerangkat', r.status === 403 && r.j.perluPerangkat === true);
    const lainDev = PERANGKAT.simulasiPerangkat();
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(sesiDev, { 'X-Exo-Perangkat': lainDev.bukti(klaimDev.sub) }), body: JSON.stringify({ orderId: 'EXO-777777', channel: 'qris', amount: 10000 }) });
    ok('bukti dari kunci perangkat lain → 403', r.status === 403 && r.j.perluPerangkat === true);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(sesiDev, { 'X-Exo-Perangkat': dev.bukti(klaimDev.sub, Math.floor(Date.now() / 1000) - 900) }), body: JSON.stringify({ orderId: 'EXO-777777', channel: 'qris', amount: 10000 }) });
    ok('bukti kedaluwarsa (15 menit lalu) → 403', r.status === 403);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(sesiDev, { 'X-Exo-Perangkat': dev.bukti(klaimDev.sub) }), body: JSON.stringify({ orderId: 'EXO-777777', channel: 'qris', amount: 10000 }) });
    ok('bukti perangkat sah → lolos ke pemeriksaan PIN (403 perluPin)', r.status === 403 && r.j.perluPin === true, JSON.stringify(r.j).slice(0, 100));
    r = await json(A + '/api/auth/perangkat/daftar', { method: 'POST', headers: H(sesiDev, { 'X-Exo-Perangkat': dev.bukti(klaimDev.sub) }) });
    ok('daftar perangkat: 1 perangkat, ini perangkat saya, riwayat baru', r.status === 200 && r.j.daftar.length === 1 && r.j.kini === dev.id && r.j.riwayat[0].baru === true, r.status + ' ' + JSON.stringify(r.j).slice(0, 200));
    r = await json(A + '/api/auth/perangkat/hapus', { method: 'POST', headers: H(sesiDev, { 'X-Exo-Perangkat': dev.bukti(klaimDev.sub) }), body: JSON.stringify({ id: dev.id }) });
    ok('cabut perangkat → ok', r.status === 200 && r.j.ok, r.status + ' ' + JSON.stringify(r.j).slice(0, 200));
    const dukungHapus = PERANGKAT.verifikasiBukti(dev.bukti(klaimDev.sub), klaimDev); ok('verifikasiBukti unit: sah', dukungHapus.ok === true);
    await tidur(1100); await json(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000002' }) });
    await tidur(1100); await json(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000003' }) });
    await tidur(1100); r = await json(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000004' }) });
    ok('batas OTP per IP (5/jam) → 429', r.status === 429 && r.h.get('retry-after'), 'status ' + r.status);
    /* posisi: sesi + token */
    r = await json(P + '/api/posisi/ORD-1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lat: -6.2, lng: 106.8, akurasi: 12 }) });
    ok('posisi tulis tanpa sesi → 401', r.status === 401);
    r = await json(P + '/api/posisi/ORD-1', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ lat: -6.2, lng: 106.8, akurasi: 12 }) });
    ok('posisi tulis dengan sesi klien → 403 (hanya mitra)', r.status === 403);
    r = await json(P + '/api/posisi/ORD-1', { method: 'POST', headers: H(tokenMitra), body: JSON.stringify({ lat: -6.2, lng: 106.8, akurasi: 12 }) });
    ok('posisi kiriman pertama (sesi mitra) → token', r.status === 200 && r.j.tulis && r.j.baca);
    const tulis = r.j.tulis, baca = r.j.baca;
    r = await json(P + '/api/posisi/ORD-1'); ok('baca tanpa sesi → 401', r.status === 401);
    r = await json(P + '/api/posisi/ORD-1', { headers: H(tokenKlien) }); ok('baca dengan sesi tanpa token → 403', r.status === 403);
    r = await json(P + '/api/posisi/ORD-1', { headers: H(tokenKlien, { 'X-Exo-Token': baca }) }); ok('baca dengan sesi + token baca', r.status === 200 && r.j.lat === -6.2);
    r = await json(P + '/api/posisi/ORD-1', { method: 'POST', headers: H(tokenMitra), body: JSON.stringify({ lat: -6.3, lng: 106.8 }) }); ok('tulis tanpa token → 403', r.status === 403);
    r = await json(P + '/api/posisi/ORD-1', { method: 'POST', headers: H(tokenMitra, { 'X-Exo-Token': tulis }), body: JSON.stringify({ lat: -6.3, lng: 106.8 }) }); ok('tulis dengan sesi + token tulis', r.status === 200);
    r = await json(P + '/api/posisi/ORD-1', { method: 'POST', headers: H(tokenMitra, { 'X-Exo-Token': tulis }), body: JSON.stringify({ lat: 95, lng: 106.8 }) }); ok('lat tidak valid → 400', r.status === 400);
    let terakhir = 0; for (let i = 0; i < 6; i++) { r = await json(P + '/api/posisi/ORD-1', { method: 'POST', headers: H(tokenMitra, { 'X-Exo-Token': tulis }), body: JSON.stringify({ lat: -6.3, lng: 106.8 }) }); terakhir = r.status; }
    ok('batas laju posisi (5/menit) → 429', terakhir === 429);
    /* PIN transaksi (auth-server) */
    r = await json(A + '/api/auth/pin/atur', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: '482913' }) });
    ok('pin atur tanpa sesi → 401', r.status === 401);
    r = await json(A + '/api/auth/pin/atur', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ pin: '123456' }) });
    ok('pin lemah (berurutan) ditolak', r.status === 400 && /berurutan/.test(r.j.error));
    r = await json(A + '/api/auth/pin/atur', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ pin: '482913' }) });
    ok('pin atur → ok', r.status === 200 && r.j.ok);
    r = await json(A + '/api/auth/pin/atur', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ pin: '482913' }) });
    ok('pin atur ulang → 409', r.status === 409);
    r = await json(A + '/api/auth/pin/verifikasi', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ pin: '000000' }) });
    ok('pin salah → 400 sisa 4', r.status === 400 && r.j.sisa === 4);
    r = await json(A + '/api/auth/pin/verifikasi', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ pin: '482913' }) });
    ok('pin benar → PIN-token', r.status === 200 && r.j.pinToken && SESI.verifikasi(RAHASIA, r.j.pinToken).klaim.pin === true);
    const pinToken = r.j.pinToken;
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', amount: 10000 }) });
    ok('pay charge dengan sesi tanpa PIN-token → 403 perluPin', r.status === 403 && r.j.perluPin === true);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlienB, { 'X-Exo-Pin': pinToken }), body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', amount: 10000 }) });
    ok('PIN-token milik A dipakai sesi B → 403', r.status === 403);
    for (let i = 0; i < 5; i++) r = await json(A + '/api/auth/pin/verifikasi', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ pin: '111222' }) });
    ok('pin salah 5× → terkunci 429', r.status === 429 || (r.status === 400 && /terkunci/.test(r.j.error)), 'status ' + r.status);
    r = await json(A + '/api/auth/pin/reset', { method: 'POST', headers: H(SESI.terbitkan(RAHASIA, { sub: 'klienA', sisi: 'klien' }, { detik: 3600 }) ), body: JSON.stringify({ baru: '735182' }) });
    ok('pin reset dengan sesi segar → ok (membuka kunci)', r.status === 200 && r.j.ok, r.j && r.j.error);
    r = await json(A + '/api/auth/pin/verifikasi', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ pin: '735182' }) });
    ok('pin baru setelah reset diterima', r.status === 200 && r.j.pinToken);
    const PIN = { 'X-Exo-Pin': r.j.pinToken };
    /* nominal ditentukan server: tagihan */
    r = await json(Y + '/api/pay/tagihan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jasa: 'hourly', jam: 3 }) });
    ok('tagihan tanpa sesi → 401', r.status === 401);
    r = await json(Y + '/api/pay/tagihan', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ jasa: 'hourly', jam: 3, juru: 'sw', tambahan: ['fridge'], perkiraan: 1 }) });
    ok('tagihan dihitung server (rate×faktor×jam + addon + biaya), beda dari perkiraan klien', r.status === 200 && r.j.total === Math.round(78000 * 0.92 / 1000) * 1000 * 3 + 45000 + 3000 && r.j.bedaDariPerkiraan === true, JSON.stringify(r.j).slice(0, 160));
    const tagihanA = r.j.tagihanId, totalA = r.j.total;
    r = await json(Y + '/api/pay/tagihan', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ jasa: 'hourly', jam: 3, tambahan: ['ferrari'] }) });
    ok('tagihan dengan add-on asing → 400', r.status === 400);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien, PIN), body: JSON.stringify({ orderId: 'EXO-555555', channel: 'qris', amount: 10000 }) });
    ok('charge dengan amount klien (ada sesi) → 400 tagihanId wajib', r.status === 400 && /tagihanId/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlienB, PIN), body: JSON.stringify({ orderId: 'EXO-555555', channel: 'qris', tagihanId: tagihanA }) });
    ok('charge dengan tagihan milik akun lain → 403', r.status === 403);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien, PIN), body: JSON.stringify({ orderId: 'EXO-555555', channel: 'qris', tagihanId: tagihanA, amount: 1, customer: { nama: 'A', email: 'bukan-email' } }) });
    ok('charge dengan tagihan sah: amount klien diabaikan, lanjut ke validasi pelanggan', r.status === 400 && /email/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/harga/versi');
    ok('versi katalog harga server terbaca (bawaan exo-data.js)', r.status === 200 && r.j.jumlahJasa >= 20 && /bawaan/.test(r.j.sumber));
    r = await json(Y + '/api/pay/harga', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ katalog: { jasa: { hourly: { tarif: 1 } } } }) });
    ok('terbitkan katalog dengan sesi klien → 403', r.status === 403);
    r = await json(Y + '/api/pay/harga', { method: 'POST', headers: H(tokenAdmin), body: JSON.stringify({ katalog: { versi: 'uji-1', jasa: { hourly: { tarif: 90000, satuan: '/hour' } }, biayaAplikasi: 2000 } }) });
    ok('terbitkan katalog dengan sesi admin → ok', r.status === 200 && r.j.ok, r.j && r.j.error);
    r = await json(Y + '/api/pay/tagihan', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ jasa: 'hourly', jam: 2 }) });
    ok('tagihan memakai katalog terbitan admin', r.status === 200 && r.j.total === 90000 * 2 + 2000 && r.j.versiKatalog === 'uji-1', JSON.stringify(r.j).slice(0, 120));
    /* pay: sesi wajib, token guard & validasi */
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', amount: 10000 }) });
    ok('pay charge tanpa sesi → 401', r.status === 401);
    r = await json(Y + '/api/pay/status', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ orderId: 'EXO-000001' }) });
    ok('pay status transaksi asing → 404', r.status === 404);
    r = await json(Y + '/api/pay/tagihan', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ jasa: 'hourly', jam: 2 }) }); const tagihanB = r.j.tagihanId;
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien, PIN), body: JSON.stringify({ orderId: 'E#1', channel: 'qris', tagihanId: tagihanB }) });
    ok('orderId terlalu pendek ditolak', r.status === 400 && /orderId/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/tagihan', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ jasa: 'hourly', jam: 24 }) });
    ok('tagihan besar tetap dihitung server', r.status === 200 && r.j.total > 0, r.j && r.j.error);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien, PIN), body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', tagihanId: r.j.tagihanId }) });
    ok('nominal di atas PAY_MAKS ditolak (dari tagihan server pun)', r.status === 400 && /batas/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/tagihan', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ jasa: 'hourly', jam: 2 }) });
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien, PIN), body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', tagihanId: r.j.tagihanId, customer: { nama: 'A', email: 'bukan-email' } }) });
    ok('email pelanggan tidak valid ditolak', r.status === 400 && /email/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/capture', { method: 'POST', headers: H(tokenKlien, PIN), body: JSON.stringify({ orderId: 'EXO-123456', amount: 10000 }) });
    ok('capture tanpa transaksi → 404', r.status === 404);
    /* kirim: sesi & pemilik (mode simulasi tanpa kunci Biteship) */
    r = await json(K + '/api/kirim/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refId: 'ORD-77', kurir: 'jne', layanan: 'reg', items: [{ nama: 'x', berat: 100, harga: 1000, qty: 1 }] }) });
    ok('kirim orders tanpa sesi → 401', r.status === 401);
    r = await json(K + '/api/kirim/orders', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ refId: 'ORD-77', kurir: 'jne', layanan: 'reg', ke: { nama: 'B', telp: '0812', alamat: 'Jl. X' }, items: [{ nama: 'x', berat: 100, harga: 1000, qty: 1 }] }) });
    ok('kirim orders dengan sesi klien A (simulasi) → 200', r.status === 200 && r.j.refId === 'ORD-77', r.j && r.j.error);
    r = await json(K + '/api/kirim/status/ORD-77', { headers: H(tokenKlienB) });
    ok('status pesanan kirim milik A dibaca B → 403', r.status === 403);
    r = await json(K + '/api/kirim/status/ORD-77', { headers: H(tokenKlien) });
    ok('status pesanan kirim dibaca pemiliknya → 200', r.status === 200);
    r = await json(K + '/api/kirim/daftar', { headers: H(tokenKlien) });
    ok('daftar semua pesanan kirim dengan sesi klien → 403', r.status === 403);
    r = await json(K + '/api/kirim/daftar', { headers: H(tokenAdmin) });
    ok('daftar semua pesanan kirim dengan sesi admin → 200', r.status === 200 && r.j.total >= 1);
    /* dwi: sesi & admin */
    r = await json(D + '/api/dwi/bayar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jalur: '/x', isi: {} }) });
    ok('dwi bayar tanpa sesi → 401', r.status === 401);
    r = await json(D + '/api/dwi/bayar', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ jalur: '/x', isi: {} }) });
    ok('dwi bayar dengan sesi tanpa PIN-token → 403', r.status === 403 && r.j.perluPin === true);
    r = await json(D + '/api/dwi/transaksi', { headers: H(tokenKlien) });
    ok('dwi transaksi dengan sesi klien → 403', r.status === 403);
    r = await json(D + '/api/dwi/balance', { headers: H(tokenAdmin) });
    ok('dwi balance dengan sesi admin diterima (simulasi)', r.status === 200 || r.status === 400, 'status ' + r.status);
    r = await json(Y + '/api/pay/webhook/midtrans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: 'EXO-123456', status_code: '200', gross_amount: '10000.00', signature_key: 'palsu', transaction_status: 'settlement' }) });
    ok('webhook Midtrans signature palsu → 403', r.status === 403);
    r = await json(Y + '/api/pay/webhook/xendit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-callback-token': 'palsu' }, body: JSON.stringify({ external_id: 'EXO-123456', status: 'PAID' }) });
    ok('webhook Xendit token palsu → 403', r.status === 403);
    const tls = [auth, pos, pay].map(s => /127\.0\.0\.1|loopback/i.test(s.keluaran()));
    ok('tanpa sertifikat: hanya loopback (ketiga server)', tls.every(Boolean), tls.join(','));
  } catch (e) { hasil.push('GALAT: ' + e.stack); }
  finally { auth.p.kill(); pos.p.kill(); pay.p.kill(); kir.p.kill(); dwi.p.kill(); try { require('fs').unlinkSync(PIN_UJI); } catch (e) { /* sudah tidak ada */ } try { require('fs').unlinkSync(DUA_UJI); } catch (e) { /* sudah tidak ada */ } try { require('fs').unlinkSync(PERANGKAT_UJI); } catch (e) { /* sudah tidak ada */ } }
  console.log(hasil.join('\n'));
  const gagal = hasil.filter(h => !h.startsWith('LULUS')).length;
  if (gagal) { console.log('\n--- keluaran auth ---\n' + auth.keluaran().slice(-1500) + '\n--- keluaran pos ---\n' + pos.keluaran().slice(-800) + '\n--- keluaran pay ---\n' + pay.keluaran().slice(-800) + '\n--- keluaran kirim ---\n' + kir.keluaran().slice(-800) + '\n--- keluaran dwi ---\n' + dwi.keluaran().slice(-800)); }
  console.log('\n' + (hasil.length - gagal) + '/' + hasil.length + ' lulus');
})();
