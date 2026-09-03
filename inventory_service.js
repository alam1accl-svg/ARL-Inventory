/* ============================================================
   ARL AGING DASHBOARD — Inventory Service Layer (MCP-ready)
   ============================================================
   The UI requests inventory data ONLY through `InventoryService`.
   Replace getData() internals with MCP/DWH calls later without
   touching the dashboard UI.
   ============================================================ */
var InventoryService = (function () {
  var SBUS = ['Akij Cement','Akij Ispat','Akij Agro Feed','Akij Poly Fibre','Akij Essentials','Nobayon Traders','Akij Ready Mix','Akij Light Engg','Akij Commodities','Hashem Rice'];
  var WHS = ['ACCL Factory','AIL Factory','AAFL Central','APFIL Factory','AEL Flour','NTL Central','ARMCL Dhour','ALEL Factory','ACL Godown','HRML Factory'];
  var CATS = ['Raw Material','Packing','Spares','Finished Goods','Trading Goods','Chemicals','Steel Products','Feed Ingredient'];
  var TYPES = ['Raw Material','Finished Goods','MRO','Trading','WIP'];
  var ITEM_NAMES = ['Cement Bulk PCC','Limestone','PP Yarn Grade','Maize (Local)','Tilapia Feed 25kg','Paddy Miniket','MS Rod 10mm','Diesel Oil','Empty Cement Bag','Coal','Bearing 6205','Motor 5HP','Lube Oil','Billet Steel','Rice Bran','Soybean Meal','Admixture','Sand','Stone 10-20mm','Wheat'];

  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function gen() {
    var rows = [], now = new Date(), i, qty, cost, age, recDate, lastMove, moveCat, provPct, risk, sku, sbu, wh, cat, type;
    for (i = 0; i < 10000; i++) {
      sbu = pick(SBUS); wh = pick(WHS); cat = pick(CATS); type = pick(TYPES);
      qty = rnd(-200, 50000); cost = rnd(5, 5000);
      age = rnd(1, 520);
      recDate = new Date(now); recDate.setDate(recDate.getDate() - age);
      lastMove = new Date(now); lastMove.setDate(lastMove.getDate() - rnd(0, 420));
      if (age > 365) moveCat = 'Dead Stock'; else if (age > 180) moveCat = 'Non-Moving'; else if (age > 90) moveCat = 'Slow Moving'; else moveCat = 'Normal Moving';
      provPct = age > 365 ? rnd(60, 95) : age > 180 ? rnd(30, 60) : age > 90 ? rnd(10, 30) : rnd(0, 5);
      var val = Math.max(0, qty) * cost;
      if (age > 365) risk = val > 5000000 ? 'Critical' : 'Attention';
      else if (age > 180) risk = val > 2000000 ? 'Critical' : 'Attention';
      else if (age > 90) risk = 'Watch';
      else risk = 'Normal';
      sku = 'SKU-' + pad(rnd(0, 9)) + pad(rnd(0, 99)) + '-' + pad(rnd(0, 999));
      rows.push({
        sku: sku,
        itemDescription: pick(ITEM_NAMES) + ' ' + rnd(1, 99),
        category: cat,
        inventoryType: type,
        sbu: sbu,
        warehouse: wh,
        quantity: qty,
        unitCost: cost,
        stockValue: Math.round(val),
        receiptDate: iso(recDate),
        lastMovementDate: iso(lastMove),
        ageDays: age,
        agingBucket: age <= 30 ? '0-30' : age <= 60 ? '31-60' : age <= 90 ? '61-90' : age <= 180 ? '91-180' : age <= 365 ? '181-365' : '>365',
        movementStatus: moveCat,
        provisionPercent: provPct,
        provisionValue: Math.round(val * provPct / 100),
        riskStatus: risk
      });
    }
    rows[0].ageDays = 400; rows[0].agingBucket = '>365'; rows[0].movementStatus = 'Dead Stock'; rows[0].riskStatus = 'Critical'; rows[0].stockValue = 15000000; rows[0].provisionValue = 13000000;
    rows[1].ageDays = 200; rows[1].agingBucket = '181-365'; rows[1].riskStatus = 'Attention'; rows[1].stockValue = 9000000;
    return rows;
  }
  var cache = null;
  var cacheTime = 0;
  function fetchLive(cb){
    // Try the deployed API endpoint first (live DWH data)
    var x = new XMLHttpRequest();
    x.open('GET', '/api/data?items=1', true);
    x.timeout = 15000;
    x.onload = function(){
      try {
        var j = JSON.parse(x.responseText);
        if (j && Array.isArray(j.inventoryItems) && j.inventoryItems.length) {
          cb(j.inventoryItems, j.source || 'live');
          return;
        }
        cb(null);
      } catch(e){ cb(null); }
    };
    x.onerror = function(){ cb(null); };
    x.ontimeout = function(){ cb(null); };
    x.send();
  }
  return {
    getData: function (cb) {
      // async callback pattern: getData(callback) -> cb(rows, source)
      if (cache && Date.now() - cacheTime < 300000) { if(cb)cb(cache,'cache'); return cache; }
      if (typeof cb === 'function') {
        fetchLive(function(rows, src){
          if (rows && rows.length) {
            cache = rows; cacheTime = Date.now();
            cb(rows, src);
          } else {
            cache = gen(); cacheTime = Date.now();
            cb(cache, 'mock');
          }
        });
        return null;
      }
      // sync fallback (mock) when no callback provided
      if (!cache) { cache = gen(); cacheTime = Date.now(); }
      return cache;
    }
  };
})();

/* ---- Clean / sanitize data (data quality) ---- */
function cleanInventory(rows) {
  var now = new Date(), out = [];
  (rows || []).forEach(function (r) {
    var qty = isNaN(+r.quantity) ? 0 : +r.quantity;
    var cost = isNaN(+r.unitCost) ? 0 : +r.unitCost;
    var age = isNaN(+r.ageDays) ? 0 : +r.ageDays;
    var rec = new Date(r.receiptDate || now); if (isNaN(rec)) rec = now;
    var last = new Date(r.lastMovementDate || now); if (isNaN(last)) last = now;
    // If no receipt date, use last movement date as aging basis (idle days)
    if (!r.receiptDate && r.lastMovementDate) {
      age = Math.max(0, Math.floor((now - last) / 86400000));
      rec = last;
    }
    if (r.sku === undefined || r.sku === null) return;
    var bucket = age <= 30 ? '0-30' : age <= 60 ? '31-60' : age <= 90 ? '61-90' : age <= 180 ? '91-180' : age <= 365 ? '181-365' : '>365';
    var mv = r.movementStatus || (age > 365 ? 'Dead Stock' : age > 180 ? 'Non-Moving' : age > 90 ? 'Slow Moving' : 'Normal Moving');
    var val = Math.abs(qty) * cost;
    if (val === 0 && r.stockValue) val = Math.abs(+r.stockValue);
    var risk = r.riskStatus || (age > 365 && val > 5000000 ? 'Critical' : age > 180 ? 'Attention' : age > 90 ? 'Watch' : 'Normal');
    var prov = isNaN(+r.provisionPercent) ? (age > 365 ? 75 : age > 180 ? 40 : age > 90 ? 15 : 2) : +r.provisionPercent;
    out.push({
      sku: String(r.sku), itemDescription: String(r.itemDescription || 'N/A'),
      category: r.category || 'N/A', inventoryType: r.inventoryType || 'Trading',
      sbu: r.sbu || 'Unknown', warehouse: r.warehouse || 'Unknown',
      quantity: qty, unitCost: cost, stockValue: Math.round(val),
      receiptDate: iso(rec), lastMovementDate: iso(last), ageDays: age,
      agingBucket: bucket, movementStatus: mv, provisionPercent: prov,
      provisionValue: Math.round(val * prov / 100), riskStatus: risk
    });
  });
  return out;
}
function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
