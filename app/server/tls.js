/* ==========================================================================
   tls.js — satu tempat untuk memutuskan HTTP atau HTTPS
   --------------------------------------------------------------------------
   KENAPA INI ADA

   Seluruh server di folder ini dulu memanggil `listen(PORT)` tanpa host.
   Node menerjemahkannya sebagai 0.0.0.0: terbuka bagi SETIAP perangkat di
   jaringan yang sama. Server data mengirim seluruh isi basis data — dan
   menerima token perangkat — dalam teks polos, lewat WiFi gedung yang
   sandinya ditempel di dinding pantry.

   Izin per perangkat yang baru dibangun tidak ada gunanya bila tokennya bisa
   dibaca siapa pun yang duduk di lobi. Karena itu keputusan HTTP-atau-HTTPS
   tidak boleh diserahkan pada masing-masing berkas server; ia dikumpulkan di
   sini, dengan satu aturan yang berlaku untuk semuanya.

   ATURAN YANG DIPEGANG

     · Tanpa sertifikat, server HANYA mendengar di loopback (127.0.0.1).
       Ia tetap bisa dipakai untuk mengembangkan di satu komputer, dan tidak
       bisa dijangkau dari jaringan sama sekali.

     · Dengan sertifikat, ia berbicara HTTPS dan mendengar di seluruh antarmuka
       — barulah ponsel di gedung yang sama bisa memakainya.

     · Membuka ke jaringan TANPA sertifikat harus DIMINTA secara eksplisit
       (EXO_HOST=0.0.0.0). Itu sah bila TLS diakhiri di depan oleh reverse
       proxy, dan tidak sah bila tidak — jadi ia diizinkan tetapi diteriakkan,
       bukan dilarang diam-diam.

   Menaruh loopback sebagai bawaan berarti pemasangan yang lupa mengurus
   sertifikat GAGAL TERLIHAT (ponselnya tidak bisa menyambung) alih-alih gagal
   diam-diam (ponselnya menyambung, dan tokennya melintas terbuka).

   BERKAS SERTIFIKATNYA

     EXO_TLS_CERT=app/server/cert/exoclean.crt
     EXO_TLS_KEY=app/server/cert/exoclean.key
     EXO_TLS_CA=...                (opsional, rantai antara)

   Untuk gedung sendiri, buat sertifikatnya dengan:
     node app/server/tls.js --buat 192.168.1.10
   ========================================================================== */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

/**
 * Baca berkas sertifikat, atau null bila memang tidak dipakai.
 *
 * Sengaja MELEMPAR bila jalurnya diisi tetapi berkasnya tidak ada. Kembali
 * diam-diam ke HTTP di situasi itu adalah cara termudah menjalankan produksi
 * tanpa enkripsi sambil mengira sudah terenkripsi.
 */
/* Di mana jalur relatif dicari.

   `npm run start:data` berjalan dari app/server, sedangkan
   `node app/server/data-server.js` berjalan dari akar proyek. Satu baris
   .env harus benar pada KEDUANYA — memaksa orang menuliskan jalur yang
   berbeda tergantung cara menjalankan adalah jebakan yang gagalnya baru
   ketahuan saat server produksi tidak mau berdiri. */
const AKAR_PROYEK = path.resolve(__dirname, '..', '..');
function tempatCari(rel) {
  const semua = [
    path.resolve(process.cwd(), rel),
    path.resolve(AKAR_PROYEK, rel),
    path.resolve(__dirname, rel)
  ];
  /* Dibuang duplikatnya: dijalankan dari akar proyek, dua di antaranya sama —
     dan daftar yang mengulang jalur yang sama membuat pembacanya mengira ia
     salah lihat. */
  return semua.filter((p, i) => semua.indexOf(p) === i);
}
function cari(rel) {
  if (path.isAbsolute(rel)) return fs.existsSync(rel) ? rel : null;
  const calon = tempatCari(rel);
  for (let i = 0; i < calon.length; i++) if (fs.existsSync(calon[i])) return calon[i];
  return null;
}
function jejak(rel) {
  if (path.isAbsolute(rel)) return '';
  return '\n  dicari di:\n    ' + tempatCari(rel).join('\n    ');
}

function opsi(env) {
  /* Bawaannya process.env: lima dari enam server memuat .env ke sana, dan
     yang satu (data-server) menyimpannya di objeknya sendiri lalu
     mengirimkannya ke sini. */
  env = env || process.env;
  const cert = String((env && env.EXO_TLS_CERT) || '').trim();
  const key = String((env && env.EXO_TLS_KEY) || '').trim();
  if (!cert && !key) return null;
  if (!cert || !key) {
    throw new Error('EXO_TLS_CERT dan EXO_TLS_KEY harus diisi keduanya, bukan salah satu.');
  }
  const pCert = cari(cert);
  const pKey = cari(key);
  if (!pCert) throw new Error('Sertifikat tidak ditemukan: ' + cert + jejak(cert));
  if (!pKey) throw new Error('Kunci sertifikat tidak ditemukan: ' + key + jejak(key));

  const o = { cert: fs.readFileSync(pCert), key: fs.readFileSync(pKey) };
  const ca = String((env && env.EXO_TLS_CA) || '').trim();
  if (ca) {
    const pCa = cari(ca);
    if (!pCa) throw new Error('Rantai sertifikat tidak ditemukan: ' + ca + jejak(ca));
    o.ca = fs.readFileSync(pCa);
  }
  /* TLS 1.2 ke atas. Yang di bawahnya sudah rusak, dan tidak ada peramban
     yang dipakai orang hari ini membutuhkannya. */
  o.minVersion = 'TLSv1.2';
  return o;
}

/**
 * Alamat mana yang didengarkan.
 *
 * Mengembalikan { host, aman, dipaksa } — `dipaksa` berarti penggunanya
 * meminta terbuka ke jaringan tanpa TLS, dan pemanggil wajib meneriakkannya.
 */
function alamat(env, adaTls) {
  env = env || process.env;
  const minta = String((env && env.EXO_HOST) || '').trim();
  if (minta) {
    const terbuka = minta === '0.0.0.0' || minta === '::';
    return { host: minta, aman: !!adaTls, dipaksa: terbuka && !adaTls };
  }
  return { host: adaTls ? '0.0.0.0' : '127.0.0.1', aman: !!adaTls, dipaksa: false };
}

/**
 * Bangun server yang tepat untuk penangan yang diberikan.
 *
 * `penangan` boleh fungsi (req,res) biasa maupun aplikasi Express — Express
 * sendiri adalah fungsi (req,res), jadi keduanya masuk tanpa perlakuan
 * berbeda.
 */
/**
 * Dengarkan pada alamat yang diminta — dan pada KEDUA keluarga alamat bila
 * yang diminta adalah loopback.
 *
 * `localhost` bukan satu alamat. Pada mesin ini ia menunjuk ke ::1 LEBIH DULU,
 * baru 127.0.0.1. Server yang hanya mengikat 127.0.0.1 karena itu tidak bisa
 * dihubungi oleh peramban yang membuka http://localhost:4500 dan memilih IPv6
 * — dan gejalanya adalah aplikasi yang berkata "luring" pada server yang
 * jelas-jelas sedang berjalan di komputer yang sama.
 *
 * Dua pendengar pada satu port dengan alamat berbeda memang diizinkan sistem
 * operasi; itu bukan siasat, itu cara loopback ganda dilayani.
 *
 * Kegagalan pendengar kedua TIDAK menggagalkan yang pertama: ada mesin yang
 * IPv6-nya dimatikan sama sekali, dan di sana yang benar adalah berjalan
 * dengan satu pendengar.
 */
function dengar(jadi, port, a, siap) {
  jadi.server.listen(port, a.host, siap);
  if (a.host !== '127.0.0.1') return;

  let kembar;
  try {
    kembar = jadi.opsiTls
      ? https.createServer(jadi.opsiTls, jadi.penangan)
      : http.createServer(jadi.penangan);
  } catch (e) { return; }
  kembar.on('error', () => { /* IPv6 mati atau port terpakai — diabaikan */ });
  try { kembar.listen(port, '::1'); } catch (e) { /* diabaikan */ }
  jadi.kembar = kembar;
}

function bikinServer(env, penangan) {
  let o;
  try {
    o = opsi(env);
  } catch (e) {
    /* Berhenti dengan kalimat, bukan dengan jejak tumpukan. Orang yang
       memasang server ini belum tentu menulis JavaScript, dan yang ia perlu
       tahu adalah berkas apa yang kurang — bukan baris ke berapa di tls.js.

       Yang TIDAK dilakukan: kembali diam-diam ke HTTP. Pengaturan TLS yang
       separuh jadi lalu berjalan tanpa enkripsi adalah kegagalan terburuk di
       berkas ini, karena ia terlihat berhasil. */
    console.error('');
    console.error('  Pengaturan TLS bermasalah — server TIDAK dijalankan.');
    console.error('');
    console.error('  ' + String(e.message).split('\n').join('\n  '));
    console.error('');
    console.error('  Buat sertifikat baru:');
    console.error('    node app/server/tls.js --buat <alamat-ip-atau-nama>');
    console.error('  Atau hapus EXO_TLS_CERT dan EXO_TLS_KEY dari .env untuk');
    console.error('  kembali berjalan di loopback tanpa enkripsi.');
    console.error('');
    process.exit(1);
  }
  /* penangan dan opsi TLS disimpan supaya dengar() bisa membangun pendengar
     kembar untuk ::1 tanpa pemanggilnya perlu tahu apa pun tentang itu. */
  return {
    server: o ? https.createServer(o, penangan) : http.createServer(penangan),
    tls: !!o, penangan: penangan, opsiTls: o
  };
}

/**
 * Baris-baris yang dicetak saat server berdiri.
 *
 * Dikumpulkan di sini supaya keenam server mengatakan hal yang sama dengan
 * kata yang sama — dan supaya peringatan teks-polos tidak bisa terlewat
 * ditulis di salah satunya.
 */
function keterangan(nama, port, a) {
  const skema = a.aman ? 'https' : 'http';
  const tampil = a.host === '0.0.0.0' || a.host === '::' ? 'localhost' : a.host;
  const baris = [nama + ' berjalan di ' + skema + '://' + tampil + ':' + port];
  if (a.aman) {
    baris.push('  terenkripsi : ya (TLS) · mendengar di ' + a.host);
  } else if (a.dipaksa) {
    baris.push('');
    baris.push('  ⚠  TERBUKA KE JARINGAN TANPA ENKRIPSI.');
    baris.push('     Token perangkat dan seluruh isi data melintas dalam teks polos.');
    baris.push('     Ini hanya benar bila ada reverse proxy di depan yang mengakhiri TLS.');
    baris.push('     Bila tidak: pasang sertifikat, atau hapus EXO_HOST dari .env.');
    baris.push('');
  } else {
    baris.push('  terenkripsi : tidak · hanya loopback, tidak terjangkau dari jaringan');
    baris.push('  agar bisa dibuka dari ponsel, pasang sertifikat — lihat app/server/tls.js');
  }
  return baris.join('\n');
}

/* ---------------------------------------------------------------- pembuat
   Sertifikat untuk gedung sendiri. Bukan pengganti sertifikat dari otoritas
   sungguhan: peramban tetap memperingatkan sekali pada tiap perangkat sampai
   sertifikatnya dipercayakan. Yang ia berikan adalah ENKRIPSI di jaringan —
   dan itulah yang melindungi token perangkat. */
function buatSertifikat(argv) {
  const { execFileSync } = require('child_process');
  const nama = argv.filter((s) => !s.startsWith('-'));
  if (!nama.length) {
    console.error('Sebutkan nama atau alamat IP servernya, misalnya:');
    console.error('  node app/server/tls.js --buat 192.168.1.10');
    console.error('  node app/server/tls.js --buat mcs.kantor.lan 192.168.1.10');
    process.exit(1);
  }
  const dir = path.join(__dirname, 'cert');
  fs.mkdirSync(dir, { recursive: true });
  const pKey = path.join(dir, 'exoclean.key');
  const pCrt = path.join(dir, 'exoclean.crt');
  if (fs.existsSync(pCrt) && argv.indexOf('--timpa') < 0) {
    console.error('Sertifikat sudah ada di ' + dir);
    console.error('Tambahkan --timpa bila memang ingin menggantinya.');
    process.exit(1);
  }

  /* SAN wajib. Peramban modern MENGABAIKAN Common Name sepenuhnya — sertifikat
     tanpa subjectAltName ditolak, bukan sekadar diperingatkan. */
  const san = nama.map(function (n) {
    return (/^[0-9.]+$/.test(n) ? 'IP:' : 'DNS:') + n;
  }).concat(['DNS:localhost', 'IP:127.0.0.1']).join(',');

  const konf = path.join(dir, 'openssl.cnf');
  fs.writeFileSync(konf,
    '[req]\n' +
    'distinguished_name = dn\n' +
    'x509_extensions = ext\n' +
    'prompt = no\n' +
    '[dn]\n' +
    'CN = ' + nama[0] + '\n' +
    'O = EXOCLEAN\n' +
    '[ext]\n' +
    'subjectAltName = ' + san + '\n' +
    'basicConstraints = critical,CA:FALSE\n' +
    'keyUsage = critical,digitalSignature,keyEncipherment\n' +
    'extendedKeyUsage = serverAuth\n');

  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes',
      '-keyout', pKey, '-out', pCrt, '-days', '825', '-config', konf], { stdio: 'pipe' });
  } catch (e) {
    console.error('openssl gagal. Pastikan ia terpasang dan ada di PATH.');
    console.error(String((e.stderr && e.stderr.toString()) || e.message).trim());
    process.exit(1);
  }
  fs.unlinkSync(konf);
  /* Kunci pribadi dibuat hanya-baca untuk pemiliknya. Di Windows ini tidak
     sekuat di sistem lain, tetapi mengabaikannya sama sekali lebih buruk. */
  try { fs.chmodSync(pKey, 0o600); } catch (e) {}

  console.log('Sertifikat dibuat untuk: ' + nama.join(', '));
  console.log('  ' + pCrt);
  console.log('  ' + pKey + '   (jangan pernah dibagikan)');
  console.log('');
  console.log('Tambahkan ke app/server/.env:');
  console.log('  EXO_TLS_CERT=app/server/cert/exoclean.crt');
  console.log('  EXO_TLS_KEY=app/server/cert/exoclean.key');
  console.log('');
  console.log('Berlaku 825 hari. Peramban akan memperingatkan sekali di tiap');
  console.log('perangkat sampai berkas .crt itu dipercayakan di perangkatnya.');
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv.indexOf('--buat') >= 0) {
    buatSertifikat(argv.filter((s) => s !== '--buat'));
  } else {
    console.log('Pemakaian:');
    console.log('  node app/server/tls.js --buat <nama-atau-ip> [nama lain…] [--timpa]');
  }
}

module.exports = { opsi: opsi, alamat: alamat, bikinServer: bikinServer, dengar: dengar,
                   keterangan: keterangan, buatSertifikat: buatSertifikat };
