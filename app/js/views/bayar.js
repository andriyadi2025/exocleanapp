/* ==========================================================================
   views/bayar.js — antarmuka pembayaran
   Pemilih metode • halaman instruksi (VA / QRIS / e-wallet / retail)
   Halaman admin: daftar transaksi + pengaturan gateway Midtrans / Xendit
   ========================================================================== */
var Bayar = (function () {

  var T = function (s) { return I18N.t(s); };
  var timer = null;
  function hentikanTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function tutup(el) {
    var m = el.closest('.modal-back');
    if (m) m.remove();
    if (!document.querySelector('.modal-back')) document.body.style.overflow = '';
    hentikanTimer();
  }

  /* ================================================================ PILIH METODE */
  /**
   * Modal pemilihan metode pembayaran untuk sebuah invoice.
   * onSelesai() dipanggil setelah transaksi dibuat / pembayaran tuntas.
   */
  function pilihMetode(invoiceId, onSelesai) {
    var inv = DB.find('invoices', invoiceId);
    if (!inv) { UI.toast(T('Invoice tidak ditemukan'), 'err'); return; }
    var sisa = BIZ.sisaTagihan(inv);
    if (sisa <= 0) { UI.toast(T('Invoice ini sudah lunas'), 'warn'); return; }

    var kanal = PAY.kanalTersedia();
    var grup = U.groupBy(kanal, function (c) { return c.grup; });
    var terpilih = null;

    function kartuKanal(c) {
      var r = PAY.rincian(c.id, sisa);
      return '<label class="pm' + (terpilih === c.id ? ' on' : '') + '">' +
        '<input type="radio" name="kanal" value="' + c.id + '" data-change="pilih"' +
          (terpilih === c.id ? ' checked' : '') + '>' +
        '<span class="pm__ic">' + c.ic + '</span>' +
        '<span class="pm__body"><b>' + U.esc(c.nama) + '</b>' +
          (c.catatan ? '<small>' + U.esc(c.catatan) + '</small>' : '') +
          '<small class="pm__fee">' + (c.manual ? 'Tanpa biaya layanan'
            : r.dibebankan === 'klien'
              ? 'Biaya layanan ' + U.rp(r.biaya) + ' — ditanggung pembayar'
              : 'Biaya layanan ' + U.rp(r.biaya) + ' ditanggung EXOCLEAN') + '</small>' +
        '</span>' +
        '<span class="pm__amt">' + U.rp(r.totalBayar) + '</span>' +
        '</label>';
    }

    function isi() {
      return Object.keys(grup).map(function (g) {
        return '<div class="nav-group" style="color:var(--muted);padding:14px 0 6px">' + U.esc(g) + '</div>' +
          grup[g].map(kartuKanal).join('');
      }).join('');
    }

    UI.modal({
      title: T('Pilih metode pembayaran'),
      sub: inv.no + ' ' + T('• tagihan') + ' ' + U.rp(sisa), size: 'wide',
      body: (PAY.modeSimulasi()
          ? UI.alert('warn', '<b>' + T('Mode simulasi aktif.') + '</b> ' + T('Nomor VA, QRIS, dan kode bayar di bawah dibuat') + ' ' +
              T('oleh aplikasi, bukan oleh Midtrans/Xendit — tidak bisa dibayar sungguhan.') + ' ' +
              T('Admin dapat menghubungkan gateway asli di') + ' <b>' + T('Pengaturan Pembayaran') + '</b>.', '🧪')
          : UI.alert('brand', T('Pembayaran diproses oleh') + ' <b>' + PAY.labelGateway() + '</b>' +
              ((PAY.config()[PAY.gatewayAktif()] || {}).mode !== 'production' &&
               (PAY.config()[PAY.gatewayAktif()] || {}).mode !== 'live'
                ? ' <span class="chip chip--warn">mode uji coba</span>' : '') + '.', '🔒')) +
        '<div id="pm-list">' + isi() + '</div>',
      foot: '<button class="btn btn--ghost" data-close>' + T('Batal') + '</button>' +
        '<button class="btn btn--lg" data-act="lanjut" disabled id="btn-lanjut">' + T('Lanjutkan Pembayaran') + '</button>',
      actions: {
        pilih: function (el) {
          terpilih = el.value;
          U.$$('#pm-list .pm').forEach(function (l) {
            l.classList.toggle('on', l.querySelector('input').value === terpilih);
          });
          U.$('#btn-lanjut').disabled = false;
        },
        lanjut: function (el) {
          if (!terpilih) return;
          var btn = U.$('#btn-lanjut');
          btn.disabled = true; btn.textContent = 'Memproses…';
          PAY.buatTransaksi(invoiceId, terpilih).then(function (tx) {
            tutup(el);
            halamanBayar(tx.id, onSelesai);
          }).catch(function (e) {
            btn.disabled = false; btn.textContent = T('Lanjutkan Pembayaran');
            UI.toast(e.message, 'err');
          });
        }
      }
    });
  }

  /* ================================================================ HALAMAN BAYAR */
  function halamanBayar(txId, onSelesai) {
    var tx = DB.find('paytx', txId);
    if (!tx) { UI.toast(T('Transaksi tidak ditemukan'), 'err'); return; }
    var ch = PAY.channel(tx.channelId) || {};
    var inv = DB.find('invoices', tx.invoiceId);

    var detail =
      tx.va ? kotakSalin(T('Nomor Virtual Account'), tx.va.nomor, tx.va.bank)
    : tx.kodeBayar ? kotakSalin(T('Kode pembayaran'), tx.kodeBayar, ch.nama)
    : tx.rekening ? kotakSalin('Rekening ' + tx.rekening.bank, tx.rekening.nomor, 'a.n. ' + tx.rekening.atasNama)
    : tx.qrString ? '<div style="text-align:center;padding:6px 0">' + PAY.qrSvg(tx.qrString) +
        '<div class="tbl-sub mt-1">' + (tx.gateway === 'simulasi'
          ? T('QR simulasi — tidak dapat dipindai') : T('Pindai dengan aplikasi apa pun yang mendukung QRIS')) + '</div></div>'
    : tx.deeplink ? '<div style="text-align:center;padding:10px 0">' +
        '<a class="btn btn--lg" href="' + U.esc(tx.deeplink) + '" target="_blank" rel="noopener">' +
        ch.ic + ' ' + T('Bayar dengan') + ' ' + U.esc(ch.nama) + '</a></div>'
    : tx.redirectUrl && tx.redirectUrl.indexOf('http') === 0
      ? '<div style="text-align:center;padding:10px 0">' +
        '<a class="btn btn--lg" href="' + U.esc(tx.redirectUrl) + '" target="_blank" rel="noopener">' +
        T('💳 Buka halaman pembayaran') + '</a></div>'
      : '';

    var body =
      '<div class="pay-total">' +
        '<small>' + T('Total yang harus dibayar') + '</small>' +
        '<div class="big">' + U.rp(tx.totalBayar) + '</div>' +
        (tx.dibebankan === 'klien' && tx.biaya
          ? '<small>' + T('Tagihan') + ' ' + U.rp(tx.jumlah) + ' + biaya layanan ' + U.rp(tx.biaya) + '</small>'
          : '<small>' + T('Invoice') + ' ' + U.esc(inv ? inv.no : '') + '</small>') +
      '</div>' +

      (tx.status === 'paid'
        ? UI.alert('ok', '<b>' + T('Pembayaran sudah diterima') + '</b> ' + T('pada') + ' ' + U.tglJam(tx.paidAt) +
            '. Terima kasih!', '✅')
        : tx.status === 'expired'
          ? UI.alert('danger', '<b>' + T('Batas waktu pembayaran habis.') + '</b> ' + T('Silakan buat tautan pembayaran baru.'), '⏰')
          : tx.status === 'failed'
            ? UI.alert('danger', '<b>Transaksi dibatalkan.</b> ' + U.esc(tx.catatan || ''), '⛔')
            : '<div class="pay-count" id="pay-count"></div>') +

      (tx.status === 'pending' ? '<div class="mt-3">' + detail + '</div>' : '') +

      '<div class="nav-group" style="color:var(--muted);padding:18px 0 8px">Cara membayar</div>' +
      '<ol class="pay-steps">' + PAY.instruksi(tx).map(function (s) {
        return '<li>' + U.esc(s) + '</li>'; }).join('') + '</ol>' +

      '<div class="kv mt-3" style="grid-template-columns:120px 1fr">' +
        '<dt>' + T('Metode') + '</dt><dd>' + ch.ic + ' ' + U.esc(tx.channelNama) + '</dd>' +
        '<dt>' + T('Diproses oleh') + '</dt><dd>' + U.esc(PAY.labelGateway(tx.gateway)) + '</dd>' +
        '<dt>Ref. transaksi</dt><dd><span class="code">' + U.esc(tx.no) + '</span></dd>' +
        /* Berbeda dari jam jadwal di atas: batas bayar adalah SATU TITIK
           WAKTU, sama bagi semua orang. Yang benar di sini adalah zona
           PEMBACANYA — dan tanggalnya ikut dihitung di zona itu, karena
           batas pukul 00.30 di satu zona jatuh pada hari sebelumnya di zona
           lain. */
        '<dt>' + T('Batas waktu') + '</dt><dd>' +
          (window.ZONA
            ? (function () {
                var tz = ZONA.bawaan();
                return U.tglPanjang(ZONA.tgl(tx.expiredAt, tz)) + ' • ' +
                  ZONA.jam(tx.expiredAt, tz).replace(':', '.') + ZONA.labelJam(tz);
              })()
            : U.tglPanjang(tx.expiredAt) + ' • ' + U.jam(tx.expiredAt)) + '</dd>' +
      '</div>';

    var foot = '<button class="btn btn--ghost" data-close>' + T('Tutup') + '</button>';
    if (tx.status === 'pending') {
      foot = '<button class="btn btn--ghost" data-act="salin-link">🔗 Salin tautan</button>' +
        '<button class="btn btn--ghost" data-act="cek">' + T('↻ Cek status') + '</button>' +
        (tx.gateway === 'simulasi'
          ? '<button class="btn" data-act="simulasi">' + T('🧪 Simulasikan pembayaran berhasil') + '</button>'
          : '<button class="btn" data-close>' + T('Saya sudah bayar') + '</button>');
    }

    UI.modal({
      title: T('Pembayaran') + ' ' + (ch.nama || ''), sub: tx.no, size: 'narrow',
      body: body, foot: foot,
      onMount: function (root) {
        if (tx.status !== 'pending') return;
        var box = root.querySelector('#pay-count');
        function tick() {
          var sisa = new Date(tx.expiredAt).getTime() - Date.now();
          if (sisa <= 0) {
            hentikanTimer();
            DB.update('paytx', tx.id, { status: 'expired' });
            box.innerHTML = '<span style="color:var(--danger)">' + T('Batas waktu pembayaran habis') + '</span>';
            return;
          }
          var j = Math.floor(sisa / 3600000), m = Math.floor(sisa % 3600000 / 60000), d = Math.floor(sisa % 60000 / 1000);
          box.innerHTML = '<span>Selesaikan dalam</span> <b>' +
            (j > 0 ? j + ' jam ' : '') + String(m).padStart(2, '0') + ':' + String(d).padStart(2, '0') + '</b>';
        }
        tick();
        hentikanTimer();
        timer = setInterval(tick, 1000);
      },
      actions: {
        salin: function (el) {
          navigator.clipboard.writeText(el.getAttribute('data-v')).then(function () {
            UI.toast('Disalin', 'ok'); }, function () { UI.toast('Browser menolak akses clipboard', 'err'); });
        },
        'salin-link': function () {
          navigator.clipboard.writeText(PAY.linkBayar(tx)).then(function () {
            UI.toast(T('Tautan pembayaran disalin'), 'ok'); }, function () { UI.toast(T('Gagal menyalin'), 'err'); });
        },
        cek: function (el) {
          el.textContent = 'Mengecek…';
          PAY.cekStatus(txId).then(function (t) {
            tutup(el);
            if (t.status === 'paid') { UI.toast(T('Pembayaran diterima!'), 'ok'); if (onSelesai) onSelesai(); }
            else { UI.toast(T('Status masih') + ' ' + t.status + '. Coba lagi beberapa saat.', 'warn'); halamanBayar(txId, onSelesai); }
          }).catch(function (e) { el.textContent = T('↻ Cek status'); UI.toast(e.message, 'err'); });
        },
        simulasi: function (el) {
          PAY.tandaiLunas(txId);
          tutup(el);
          UI.toast(T('Pembayaran disimulasikan berhasil — invoice diperbarui'), 'ok');
          if (onSelesai) onSelesai();
        }
      }
    });
  }

  function kotakSalin(label, nilai, sub) {
    return '<div class="pay-box">' +
      '<div class="tbl-sub">' + U.esc(label) + (sub ? ' • ' + U.esc(sub) : '') + '</div>' +
      '<div class="row"><span class="pay-box__val">' + U.esc(nilai) + '</span>' +
      '<div class="spacer"></div>' +
      '<button class="btn btn--soft btn--sm" data-act="salin" data-v="' + U.esc(nilai) + '">' + T('Salin') + '</button></div>' +
      '</div>';
  }

  /* ================================================================ ADMIN: TRANSAKSI */
  var fTx = 'semua';

  function adminTransaksi() {
    var all = U.sortBy(DB.all('paytx'), function (t) { return t.createdAt; }, true);
    var grup = {
      pending: all.filter(function (t) { return t.status === 'pending'; }),
      paid: all.filter(function (t) { return t.status === 'paid'; }),
      /* Dibatalkan berdiri sendiri, tidak dititipkan ke tab "Gagal".
         Kalau digabung, angka kegagalan tampak besar dan orang mencari
         masalah pada gateway — padahal transaksinya memang dihentikan. */
      gagal: all.filter(function (t) {
        return ['expired', 'failed'].indexOf(t.status) >= 0; }),
      dibatalkan: all.filter(function (t) { return t.status === 'dibatalkan'; }),
      semua: all
    };
    var list = grup[fTx] || all;
    var st = PAY.statistik();
    var cfg = PAY.config();

    return (PAY.modeSimulasi()
      ? UI.alert('warn', '<b>' + T('Gateway pembayaran belum tersambung.') + '</b> Sistem berjalan dalam mode simulasi — ' +
          T('transaksi dibuat lokal dan tidak menerima uang sungguhan.') + ' ' +
          '<a href="#" data-act="ke-setelan">' + T('Buka Pengaturan Pembayaran →') + '</a>', '🧪')
      : UI.alert('ok', 'Gateway aktif: <b>' + PAY.labelGateway() + '</b> (' +
          U.esc((cfg[cfg.aktif] || {}).mode || '-') + '). ' +
          T('Status pembayaran diperbarui lewat webhook yang diterima backend Anda.'), '🔒')) +
    '<div class="mb-3"></div>' +

    '<div class="grid g-4 mb-3">' +
      UI.stat({ label: T('Diterima (semua waktu)'), small: true, valueHTML: U.rpShort(st.nilai), icon: '💳',
        meta: st.lunas + ' ' + T('transaksi berhasil') }) +
      UI.stat({ label: T('Menunggu pembayaran'), value: st.pending, icon: '⏳',
        meta: st.pending ? 'tautan masih aktif' : T('tidak ada') }) +
      UI.stat({ label: 'Biaya gateway ditanggung', small: true, valueHTML: U.rpShort(st.biaya), icon: '📉',
        meta: cfg.biayaDitanggung === 'merchant' ? T('dibebankan ke EXOCLEAN') : T('dibebankan ke klien') }) +
      UI.stat({ label: 'Tingkat keberhasilan', value: st.total ? Math.round(st.lunas / st.total * 100) + '%' : '—',
        icon: '📊', meta: st.gagal + ' ' + T('gagal / kedaluwarsa') }) +
    '</div>' +

    UI.tabs([
      { key: 'semua', label: T('Semua'), n: all.length },
      { key: 'pending', label: T('Menunggu'), n: grup.pending.length },
      { key: 'paid', label: T('Berhasil'), n: grup.paid.length },
      { key: 'gagal', label: T('Gagal / kedaluwarsa'), n: grup.gagal.length },
      { key: 'dibatalkan', label: T('Dibatalkan'), n: grup.dibatalkan.length }
    ], fTx, 'tab-tx') +

    UI.card({ flush: true, body: UI.table([
      { h: 'Ref. / Waktu', r: function (t) { return '<div class="code">' + U.esc(t.no) + '</div>' +
        '<div class="tbl-sub">' + U.sejak(t.createdAt) + '</div>'; } },
      { h: T('Klien'), r: function (t) { return '<div class="tbl-title">' + U.esc(BIZ.klien(t.clientId)) + '</div>' +
        '<div class="tbl-sub">' + U.esc((DB.find('invoices', t.invoiceId) || {}).no || '—') + '</div>'; } },
      { h: T('Metode'), r: function (t) { var c = PAY.channel(t.channelId) || {};
        return '<div>' + (c.ic || '') + ' ' + U.esc(t.channelNama) + '</div>' +
          '<div class="tbl-sub">' + U.esc(PAY.labelGateway(t.gateway)) + '</div>'; } },
      { h: T('Nominal'), cls: 'num', r: function (t) { return '<b>' + U.rp(t.totalBayar) + '</b>' +
        (t.biaya ? '<div class="tbl-sub">' + T('biaya') + ' ' + U.rp(t.biaya) + '</div>' : ''); } },
      { h: T('Status'), r: function (t) {
        /* Alasannya ikut ditampilkan. Tanpa itu admin melihat sederet
           "Dibatalkan" tanpa tahu mana yang dibatalkan klien dan mana yang
           dihentikan sistem karena diganti transaksi baru. */
        var bawah = t.status === 'pending' ? 's/d ' + U.jam(t.expiredAt)
          : (t.catatan || '');
        return UI.statusChip('paytx', t.status) +
          (bawah ? '<div class="tbl-sub mt-1">' + U.esc(bawah) + '</div>' : ''); } },
      { h: '', cls: 'act', r: function (t) {
        var b = '<button class="btn btn--ghost btn--sm" data-act="lihat-tx" data-id="' + t.id + '">' + T('Lihat') + '</button>';
        if (t.status === 'pending') {
          b += ' <button class="btn btn--ghost btn--sm" data-act="tx-wa" data-id="' + t.id + '">💬</button>';
          /* Pembatalan hanya muncul untuk transaksi yang BELUM dibayar. Yang
             sudah lunas butuh pengembalian dana, dan tombolnya sengaja tidak
             ada di sini supaya tidak ada yang menutup uang masuk dengan satu
             klik yang tampak sama saja. */
          b += ' <button class="btn btn--ghost btn--sm" data-act="tx-batal" data-id="' + t.id + '">' + T('Batalkan') + '</button>';
          if (t.gateway === 'simulasi')
            b += ' <button class="btn btn--sm" data-act="tx-lunas" data-id="' + t.id + '">Tandai Lunas</button>';
        }
        return b; } }
    ], list, { icon: '💳', judul: T('Belum ada transaksi pembayaran'),
      teks: T('Transaksi muncul saat klien membayar invoice secara online.') }) });
  }

  /* ================================================================ ADMIN: PENGATURAN */
  function adminSetelan() {
    var cfg = PAY.config();
    var tidakDidukung = PAY.kanalTidakDidukung();

    function kartuGateway(id, judul, ic, ket, fields) {
      var aktif = cfg.aktif === id;
      return '<div class="card gw' + (aktif ? ' on' : '') + '">' +
        '<div class="card__body">' +
          '<div class="row" style="gap:12px;align-items:flex-start">' +
            '<div class="stat__icon" style="margin:0;font-size:20px">' + ic + '</div>' +
            '<div style="flex:1;min-width:0"><b style="font-size:14.5px">' + judul + '</b>' +
              '<div class="tbl-sub">' + ket + '</div></div>' +
            '<label class="check" style="gap:6px"><input type="radio" name="gw" value="' + id + '"' +
              (aktif ? ' checked' : '') + ' data-change="pilih-gw"><span>' + T('Aktif') + '</span></label>' +
          '</div>' +
          (fields ? '<div class="mt-3">' + fields + '</div>' : '') +
        '</div></div>';
    }

    return UI.alert('danger',
      '<b>' + T('Jangan pernah menaruh Server Key / Secret Key di sini.') + '</b> ' + T('Halaman ini hanya menyimpan') + ' ' +
      T('Client Key (boleh publik) dan alamat backend Anda. Kunci rahasia wajib berada di server —') + ' ' +
      T('lihat folder') + ' <code>server/</code> ' + T('untuk kode backend siap pakai.'), '🔐') +
    '<div class="mb-3"></div>' +

    '<div class="grid g-cards mb-3">' +
      kartuGateway('simulasi', 'Mode Simulasi', '🧪',
        T('Tanpa gateway. Transaksi dibuat lokal, status bisa dipicu manual. Untuk demo & pelatihan tim.')) +

      kartuGateway('midtrans', 'Midtrans', '🟦',
        T('Snap & Core API. VA semua bank besar, GoPay, ShopeePay, QRIS, kartu, Alfamart/Indomaret.'),
        UI.field({ name: 'mt_mode', label: 'Lingkungan', type: 'select', value: cfg.midtrans.mode,
          options: [{ value: 'sandbox', label: 'Sandbox (uji coba)' }, { value: 'production', label: 'Production (uang sungguhan)' }] }) +
        UI.field({ name: 'mt_merchantId', label: 'Merchant ID', value: cfg.midtrans.merchantId, placeholder: 'G123456789' }) +
        UI.field({ name: 'mt_clientKey', label: 'Client Key', value: cfg.midtrans.clientKey,
          placeholder: 'SB-Mid-client-xxxxxxxx', hint: T('Boleh publik. Server Key TIDAK boleh diisi di sini.') }) +
        UI.field({ name: 'mt_backendUrl', label: T('URL backend Anda'), value: cfg.midtrans.backendUrl,
          placeholder: 'https://api.exoclean.id', hint: T('Server yang menyimpan Server Key & menerima webhook.') })) +

      kartuGateway('xendit', 'Xendit', '🟪',
        'Invoice & Payment Request API. VA, QRIS, OVO, DANA, LinkAja, ShopeePay, kartu, retail.',
        UI.field({ name: 'xd_mode', label: 'Lingkungan', type: 'select', value: cfg.xendit.mode,
          options: [{ value: 'test', label: 'Test (uji coba)' }, { value: 'live', label: 'Live (uang sungguhan)' }] }) +
        UI.field({ name: 'xd_businessId', label: 'Business ID', value: cfg.xendit.businessId }) +
        UI.field({ name: 'xd_publicKey', label: 'Public Key', value: cfg.xendit.publicKey,
          placeholder: 'xnd_public_development_xxxx', hint: T('Boleh publik. Secret Key TIDAK boleh diisi di sini.') }) +
        UI.field({ name: 'xd_backendUrl', label: T('URL backend Anda'), value: cfg.xendit.backendUrl,
          placeholder: 'https://api.exoclean.id', hint: T('Server yang menyimpan Secret Key & menerima callback.') })) +
    '</div>' +

    (tidakDidukung.length ? UI.alert('warn', '<b>' + tidakDidukung.length + ' ' + T('kanal aktif tidak didukung') + ' ' +
      PAY.labelGateway() + '</b> ' + T('pada konfigurasi bawaan:') + ' ' +
      tidakDidukung.map(function (c) { return U.esc(c.nama); }).join(', ') +
      '. Kanal ini disembunyikan dari klien. Sesuaikan bila akun merchant Anda mendukungnya.', '⚠️') +
      '<div class="mb-3"></div>' : '') +

    '<div class="grid g-2">' +
      UI.card({ title: T('Kanal pembayaran'), sub: T('Yang dicentang akan muncul untuk klien'),
        body: Object.keys(U.groupBy(PAY.CHANNELS, function (c) { return c.grup; })).map(function (g) {
          var items = PAY.CHANNELS.filter(function (c) { return c.grup === g; });
          return '<div class="nav-group" style="color:var(--muted);padding:12px 0 4px">' + U.esc(g) + '</div>' +
            items.map(function (c) {
              var dukung = cfg.aktif === 'simulasi' || c.gateway.indexOf(cfg.aktif) >= 0;
              return '<label class="check" style="padding:5px 0">' +
                '<input type="checkbox" data-change="kanal" data-id="' + c.id + '"' +
                (cfg.kanalAktif.indexOf(c.id) >= 0 ? ' checked' : '') + '>' +
                '<span>' + c.ic + ' ' + U.esc(c.nama) +
                '<span class="tbl-sub"> — ' + (c.manual ? 'tanpa biaya'
                  : (c.biaya.persen ? c.biaya.persen + '%' : '') +
                    (c.biaya.persen && c.biaya.flat ? ' + ' : '') +
                    (c.biaya.flat ? U.rp(c.biaya.flat) : '')) + ' + Ppn</span>' +
                (dukung ? '' : ' <span class="chip chip--warn" style="font-size:10px">' + T('tidak didukung') + ' ' +
                  PAY.labelGateway() + '</span>') +
                '</span></label>';
            }).join('');
        }).join('') }) +

      '<div class="col">' +
        UI.card({ title: 'Kebijakan biaya',
          body: UI.field({ name: 'biayaDitanggung', label: T('Biaya layanan gateway ditanggung oleh'), type: 'select',
              value: cfg.biayaDitanggung,
              options: [{ value: 'merchant', label: T('EXOCLEAN (klien bayar sesuai tagihan)') },
                        { value: 'klien', label: T('Klien (biaya ditambahkan ke tagihan)') }],
              hint: T('Contoh: tagihan Rp1.000.000 via QRIS (0,7% + Ppn) → biaya') + ' ' +
                U.rp(PAY.biayaGateway(PAY.channel('qris'), 1000000)) + '.' }) +
            '<div class="tbl-sub">' + T('Nilai yang tercatat di invoice selalu nilai tagihan,') + ' ' +
            'bukan termasuk biaya gateway — supaya pembukuan tetap cocok.</div>' }) +

        UI.card({ title: T('Rekening transfer manual'), sub: T('Dipakai kanal Transfer Bank Manual'),
          body: UI.field({ name: 'rek_bank', label: 'Bank', value: cfg.rekening.bank }) +
            UI.field({ name: 'rek_nomor', label: T('Nomor rekening'), value: cfg.rekening.nomor }) +
            UI.field({ name: 'rek_atasNama', label: T('Atas nama'), value: cfg.rekening.atasNama }) }) +

        UI.card({ title: T('Alamat webhook'), sub: T('Daftarkan di dashboard gateway'),
          body: '<div class="tbl-sub mb-1">Midtrans → Settings → Configuration → Payment Notification URL</div>' +
            '<div class="pay-box" style="margin:0 0 12px"><span class="pay-box__val" style="font-size:12.5px">' +
            U.esc((cfg.midtrans.backendUrl || 'https://api-anda.com') + '/api/pay/webhook/midtrans') + '</span></div>' +
            '<div class="tbl-sub mb-1">Xendit → Settings → Callbacks → Invoices paid</div>' +
            '<div class="pay-box" style="margin:0"><span class="pay-box__val" style="font-size:12.5px">' +
            U.esc((cfg.xendit.backendUrl || 'https://api-anda.com') + '/api/pay/webhook/xendit') + '</span></div>' }) +
      '</div>' +
    '</div>' +

    '<div class="row mt-3"><div class="spacer"></div>' +
      '<button class="btn btn--ghost" data-act="uji">🔌 Uji koneksi backend</button>' +
      '<button class="btn btn--lg" data-act="simpan-gw">' + T('Simpan Pengaturan') + '</button></div>';
  }

  /* ================================================================ AKSI ADMIN */
  function adminAksi(root) {
    U.delegate(root, {
      'tab-tx': function (el) { fTx = el.getAttribute('data-key'); APP.refresh(); },
      'ke-setelan': function () { APP.go('setelanBayar'); },
      'lihat-tx': function (el) { halamanBayar(el.getAttribute('data-id'), APP.refresh); },
      'tx-lunas': function (el) {
        PAY.tandaiLunas(el.getAttribute('data-id'));
        UI.toast('Transaksi ditandai lunas & invoice diperbarui', 'ok');
        APP.refresh();
      },
      'tx-wa': function (el) {
        var t = DB.find('paytx', el.getAttribute('data-id'));
        var m = WA.enqueue('link_pembayaran', t.clientId, { txId: t.id }, { tipe: 'paytx', id: t.id });
        Panel.pratinjauWA(m.id, { onKirim: APP.refresh });
      },
      'tx-batal': function (el) {
        var t = DB.find('paytx', el.getAttribute('data-id'));
        if (!t) return;
        UI.konfirm({
          title: T('Batalkan transaksi') + ' ' + t.no + '?', danger: true,
          htmlText: T('Nomor Virtual Account / kode bayarnya langsung tidak berlaku, dan') + ' ' +
            T('klien harus membuat transaksi baru bila tetap ingin membayar.') + '<br><br>' +
            T('Bila ternyata klien sudah terlanjur transfer, dana itu akan dikembalikan') + ' ' +
            'bank — bukan hilang, tetapi butuh beberapa hari kerja.',
          okText: T('Ya, batalkan')
        }).then(function (ya) {
          if (!ya) return;
          try {
            PAY.batalkan(t.id, 'Dibatalkan admin');
            UI.toast('Transaksi ' + t.no + ' dibatalkan', 'ok');
            APP.refresh();
          } catch (e) { UI.toast(e.message, 'err'); }
        });
      },

      'pilih-gw': function (el) { PAY.simpanConfig({ aktif: el.value }); APP.refresh(); },
      kanal: function (el) {
        var cfg = PAY.config(), id = el.getAttribute('data-id');
        var list = cfg.kanalAktif.slice();
        if (el.checked) { if (list.indexOf(id) < 0) list.push(id); }
        else list = list.filter(function (x) { return x !== id; });
        PAY.simpanConfig({ kanalAktif: list });
      },
      'simpan-gw': function (el) {
        var f = U.readForm(el.closest('.page'));
        PAY.simpanConfig({
          biayaDitanggung: f.biayaDitanggung,
          midtrans: { mode: f.mt_mode, merchantId: f.mt_merchantId, clientKey: f.mt_clientKey, backendUrl: f.mt_backendUrl },
          xendit: { mode: f.xd_mode, businessId: f.xd_businessId, publicKey: f.xd_publicKey, backendUrl: f.xd_backendUrl },
          rekening: { bank: f.rek_bank, nomor: f.rek_nomor, atasNama: f.rek_atasNama }
        });
        /* Kunci rahasia kadang tertempel karena kebiasaan — tolak dengan jelas. */
        var mencurigakan = [f.mt_clientKey, f.xd_publicKey].filter(function (v) {
          return /server|secret/i.test(String(v || '')); });
        if (mencurigakan.length) {
          UI.toast(T('Nilai yang Anda isi terlihat seperti Server/Secret Key — hapus dan pakai Client/Public Key saja!'), 'err');
        } else UI.toast(T('Pengaturan pembayaran disimpan'), 'ok');
        APP.refresh();
      },
      uji: function (el) {
        var cfg = PAY.config();
        if (cfg.aktif === 'simulasi') { UI.toast(T('Pilih Midtrans atau Xendit dulu untuk menguji koneksi'), 'warn'); return; }
        var base = (cfg[cfg.aktif] || {}).backendUrl;
        if (!base) { UI.toast(T('URL backend belum diisi'), 'err'); return; }
        el.textContent = 'Menguji…';
        fetch(base.replace(/\/+$/, '') + '/api/pay/health')
          .then(function (r) { return r.json(); })
          .then(function (j) {
            el.textContent = '🔌 Uji koneksi backend';
            UI.modal({ title: 'Backend merespons', size: 'narrow',
              body: UI.alert('ok', T('Server pembayaran dapat dihubungi.'), '✅') +
                '<pre style="font-size:11.5px;background:#F8FAFC;padding:12px;border-radius:10px;overflow:auto;margin-top:12px">' +
                U.esc(JSON.stringify(j, null, 2)) + '</pre>',
              foot: '<button class="btn" data-close>' + T('Tutup') + '</button>' });
          })
          .catch(function (e) {
            el.textContent = '🔌 Uji koneksi backend';
            UI.modal({ title: T('Gagal menghubungi backend'), size: 'narrow',
              body: UI.alert('danger', U.esc(e.message), '⛔') +
                '<div class="tbl-sub mt-2">' +
                T('Periksa: server berjalan, URL benar (termasuk https), dan CORS ' +
                  'mengizinkan asal halaman ini ({asal}).')
                  .replace('{asal}', U.esc(location.origin)) + '</div>',
              foot: '<button class="btn" data-close>' + T('Tutup') + '</button>' });
          });
      }
    });
  }

  /* ================================================================ PAGES */
  var pagesAdmin = {
    pembayaran: { label: 'Transaksi Pembayaran', icon: '💳', grup: 'Keuangan',
      render: adminTransaksi, mount: adminAksi,
      badge: function () { return DB.where('paytx', { status: 'pending' }).length; } },
    setelanBayar: { label: 'Pengaturan Pembayaran', icon: '🔐', grup: 'Keuangan',
      sub: 'Midtrans, Xendit, kanal & biaya', render: adminSetelan, mount: adminAksi }
  };

  /* ================================================================ KEPULANGAN DARI GATEWAY
     Snap/Xendit mengembalikan klien ke aplikasi lewat Redirection Settings di
     dashboard gateway, sambil menempelkan hasilnya pada alamat:

         ?bayar=selesai&order_id=…&status_code=…&transaction_status=settlement

     Yang dipercaya di sini HANYA `order_id` — sekadar untuk tahu transaksi mana
     yang dimaksud. Status pembayarannya TIDAK PERNAH diambil dari alamat,
     karena alamat bisa diketik siapa saja: seseorang tinggal menempel
     `?transaction_status=settlement` untuk mengaku sudah membayar. Status
     sebenarnya selalu ditanyakan ulang ke gateway lewat backend, dan
     kebenarannya baru ditetapkan webhook. */
  var kepulangan = null;

  /**
   * Dibaca SEGERA saat aplikasi mulai — sebelum modul lain sempat merapikan
   * alamat — lalu alamatnya dibersihkan supaya menyegarkan halaman tidak
   * mengulang dialognya. Hasilnya baru ditampilkan oleh tampilkanKepulangan().
   */
  function bacaKepulangan() {
    var q = new URLSearchParams(location.search);
    var tanda = q.get('bayar');
    var orderId = q.get('order_id');
    if (!tanda && !orderId) return false;

    kepulangan = {
      tanda: tanda, orderId: orderId,
      petunjuk: q.get('transaction_status') || q.get('status') || null
    };
    history.replaceState({}, '', location.origin + location.pathname + location.hash);
    return true;
  }

  /** Ditampilkan setelah layar pembuka usai dan aplikasinya sudah terender. */
  function tampilkanKepulangan() {
    if (!kepulangan) return false;
    var k = kepulangan; kepulangan = null;

    var tx = PAY.txOrder(k.orderId);
    if (!tx) {
      UI.toast(k.tanda === 'gagal'
        ? T('Pembayaran tidak selesai. Silakan coba lagi dari halaman Tagihan.')
        : T('Terima kasih. Status pembayaran akan diperbarui otomatis.'),
        k.tanda === 'gagal' ? 'err' : 'info');
      return true;
    }

    /* tanya status yang sebenarnya ke gateway */
    var tanya = PAY.cekStatus ? PAY.cekStatus(tx.id) : Promise.resolve(null);
    Promise.resolve(tanya).catch(function () { return null; }).then(function () {
      var kini = DB.find('paytx', tx.id) || tx;
      dialogHasil(kini, k.tanda, k.petunjuk);
      APP.refresh();
    });
    return true;
  }

  function dialogHasil(tx, tanda, petunjukGateway) {
    var lunas = tx.status === 'paid';
    var batal = ['expired', 'failed', 'dibatalkan'].indexOf(tx.status) >= 0;
    var inv = DB.find('invoices', tx.invoiceId);

    var judul = lunas ? T('Pembayaran diterima 🎉')
      : batal ? T('Pembayaran dibatalkan')
      : tanda === 'gagal' ? T('Pembayaran gagal')
      : T('Pembayaran sedang diproses');

    var isi = lunas
      ? UI.alert('ok', T('Dana Anda sudah kami terima. Kuitansi tersimpan di menu Tagihan.'), '✅')
      : batal
        ? UI.alert('danger', T('Transaksi ini sudah tidak berlaku. Silakan buat pembayaran baru ' +
            'dari halaman Tagihan.'), '⛔')
        : tanda === 'gagal'
          ? UI.alert('danger', T('Pembayaran tidak berhasil diselesaikan. Tidak ada dana yang ' +
              'terpotong. Silakan coba lagi atau pilih metode lain.'), '⚠️')
          : UI.alert('warn', T('Kami belum menerima konfirmasi dari penyedia pembayaran. Bila Anda ' +
              'sudah membayar, statusnya akan diperbarui otomatis dalam beberapa menit — tidak ' +
              'perlu membayar ulang.'), '⏳');

    UI.modal({
      title: judul, size: 'narrow',
      body: isi +
        '<dl class="kv mt-3">' +
          '<dt>' + T('No. transaksi') + '</dt><dd class="code">' + U.esc(tx.no) + '</dd>' +
          (inv ? '<dt>' + T('Invoice') + '</dt><dd class="code">' + U.esc(inv.no) + '</dd>' : '') +
          '<dt>' + T('Metode') + '</dt><dd>' + U.esc(tx.channelNama || '—') + '</dd>' +
          '<dt>' + T('Jumlah') + '</dt><dd><b>' + U.rp(tx.totalBayar) + '</b></dd>' +
          '<dt>' + T('Status') + '</dt><dd>' + UI.statusChip('paytx', tx.status) + '</dd>' +
        '</dl>' +
        /* Keterangan alamat hanya berguna untuk menjelaskan KEGAGALAN (mis.
           "deny", "cancel"). Bila ia justru mengaku sukses sementara status
           sebenarnya bukan lunas, keterangan itu dibuang — menampilkannya
           hanya membuat pengguna percaya pada nilai yang bisa diketik siapa
           saja di bilah alamat. */
        (petunjukGateway && !lunas && !/^(settlement|capture|success|paid|completed)$/i
            .test(petunjukGateway)
          ? '<div class="tbl-sub">' + T('Keterangan dari gateway') + ': ' +
            U.esc(petunjukGateway) + '</div>'
          : ''),
      foot: (lunas ? '' :
          '<button class="btn btn--ghost" data-act="ke-tagihan">' + T('Buka Tagihan') + '</button>') +
        '<button class="btn" data-close>' + T('Tutup') + '</button>',
      actions: {
        'ke-tagihan': function (el) { tutup(el); APP.go('tagihan'); }
      }
    });
  }

  return {
    pilihMetode: pilihMetode, halamanBayar: halamanBayar,
    bacaKepulangan: bacaKepulangan, tampilkanKepulangan: tampilkanKepulangan,
    pagesAdmin: pagesAdmin, adminAksi: adminAksi
  };
})();
