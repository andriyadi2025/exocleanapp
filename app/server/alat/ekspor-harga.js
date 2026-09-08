/* Menyusun katalog harga bawaan server (harga-bawaan.json) dari js/exo-data.js —
   dievaluasi di sandbox vm dengan window tiruan, jadi angka tarif hanya punya
   satu sumber. Jalankan ulang bila exo-data.js berubah: node alat/ekspor-harga.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'js', 'exo-data.js'), 'utf8');
const ctx = { window: {}, navigator: { language: 'id' }, localStorage: { getItem: () => null, setItem: () => {} }, document: { documentElement: { lang: 'id' } }, console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const D = ctx.EXO_DATA;
if (!D || !D.SERVICES) throw new Error('EXO_DATA tidak terbaca');
const katalog = {
  versi: 'bawaan-' + new Date().toISOString().slice(0, 10), sumber: 'js/exo-data.js', at: new Date().toISOString(),
  jasa: Object.fromEntries(Object.keys(D.SERVICES).map((id) => [id, { tarif: D.SERVICES[id].rate, satuan: D.SERVICES[id].unit, aktif: true }])),
  addon: Object.fromEntries(Object.keys(D.ADDON_SETS).map((id) => [id, D.ADDON_SETS[id].map((a) => ({ id: a.id, harga: a.price }))])),
  juru: Object.fromEntries((D.CLEANERS || []).map((c) => [c.id, Number(c.factor) || 1])),
  faktorMin: D.MIN_FACTOR || 0.76, faktorMaks: 1.6,
  voucher: { [D.VOUCHER.code]: { potongan: D.VOUCHER.amount, min: D.VOUCHER.min, aktif: true } },
  biayaAplikasi: D.PLATFORM_FEE, biayaRegu: D.CREW_FEE,
  langganan: { layanan: D.LANGGANAN.layanan, pilihan: D.LANGGANAN.pilihan.map((p) => ({ id: p.id, diskon: p.diskon })) },
  minQty: D.MIN_QTY, stepQty: D.STEP_QTY,
  flash: [],
  ekstra: { maksPerItem: 500000, maksPersenDasar: 50 }
};
const out = path.join(__dirname, '..', 'harga-bawaan.json');
fs.writeFileSync(out, JSON.stringify(katalog, null, 1));
console.log('harga-bawaan.json ditulis: ' + Object.keys(katalog.jasa).length + ' jasa, ' + Object.keys(katalog.juru).length + ' juru, ' + Object.keys(katalog.addon).length + ' set add-on');
