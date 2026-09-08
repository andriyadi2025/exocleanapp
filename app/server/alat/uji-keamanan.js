/* Uji server pendamping: header, CORS, token, pembatas laju, OTP. Menjalankan
   auth-server (SMS/email provider 'log') dan posisi-server di port acak, lalu
   menembak endpointnya. payment-server diuji untuk header + penolakan token. */
const { spawn } = require('child_process');
const path = require('path');
const SV = path.join(__dirname, '..');
const SESI = require('../sesi');
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
  const ENV = { ALLOWED_ORIGINS: 'http://localhost:8081,*', EXO_TLS_CERT: '', EXO_TLS_KEY: '', SMS_PROVIDER: 'log', EMAIL_PROVIDER: 'log', OTP_JEDA_DETIK: '1', LAJU_OTP_KIRIM_PER_JAM_IP: '3', LAJU_POSISI_PER_MENIT: '5', SESI_SECRET: RAHASIA_HEX, ADMIN_TELP: '081200000009' };
  const auth = jalankan('auth-server.js', Object.assign({ AUTH_PORT: '4171' }, ENV));
  const pos = jalankan('posisi-server.js', Object.assign({ POSISI_PORT: '4272' }, ENV));
  const pay = jalankan('payment-server.js', Object.assign({ PORT: '4073', MIDTRANS_SERVER_KEY: 'SB-Mid-server-uji' }, ENV));
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
    await tidur(1100); await json(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000002' }) });
    await tidur(1100); await json(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000003' }) });
    await tidur(1100); r = await json(A + '/api/auth/otp/kirim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jenis: 'telp', tujuan: '081200000004' }) });
    ok('batas OTP per IP (3/jam) → 429', r.status === 429 && r.h.get('retry-after'), 'status ' + r.status);
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
    /* pay: sesi wajib, token guard & validasi */
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', amount: 10000 }) });
    ok('pay charge tanpa sesi → 401', r.status === 401);
    r = await json(Y + '/api/pay/status', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ orderId: 'EXO-000001' }) });
    ok('pay status transaksi asing → 404', r.status === 404);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ orderId: 'E#1', channel: 'qris', amount: 10000 }) });
    ok('orderId terlalu pendek ditolak', r.status === 400 && /orderId/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', amount: 999999999 }) });
    ok('nominal di atas PAY_MAKS ditolak', r.status === 400 && /batas/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/charge', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ orderId: 'EXO-123456', channel: 'qris', amount: 10000, customer: { nama: 'A', email: 'bukan-email' } }) });
    ok('email pelanggan tidak valid ditolak', r.status === 400 && /email/.test(r.j.error), r.j && r.j.error);
    r = await json(Y + '/api/pay/capture', { method: 'POST', headers: H(tokenKlien), body: JSON.stringify({ orderId: 'EXO-123456', amount: 10000 }) });
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
  finally { auth.p.kill(); pos.p.kill(); pay.p.kill(); kir.p.kill(); dwi.p.kill(); }
  console.log(hasil.join('\n'));
  const gagal = hasil.filter(h => !h.startsWith('LULUS')).length;
  if (gagal) { console.log('\n--- keluaran auth ---\n' + auth.keluaran().slice(-1500) + '\n--- keluaran pos ---\n' + pos.keluaran().slice(-800) + '\n--- keluaran pay ---\n' + pay.keluaran().slice(-800) + '\n--- keluaran kirim ---\n' + kir.keluaran().slice(-800) + '\n--- keluaran dwi ---\n' + dwi.keluaran().slice(-800)); }
  console.log('\n' + (hasil.length - gagal) + '/' + hasil.length + ' lulus');
})();
