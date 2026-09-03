/* ============================================================
   ARL AGING DASHBOARD — UI Module (professional corporate design)
   All KPI/chart/table values computed dynamically from data.
   ============================================================ */
var AgingDash = (function () {
  var data = [];            // cleaned rows
  var filters = { sbu:'', wh:'', cat:'', type:'', sku:'', bucket:'', mv:'', risk:'', bucketView:'value' };
  var charts = {};          // chart instances
  var sortTop = { key:'stockValue', dir:-1 };

  function fmtBDT(v) {
    var a = Math.abs(v || 0);
    if (a >= 1e12) return (v/1e12).toFixed(2)+'T';
    if (a >= 1e9) return (v/1e9).toFixed(2)+'B';
    if (a >= 1e7) return (v/1e7).toFixed(2)+' Cr';
    if (a >= 1e5) return (v/1e5).toFixed(2)+' Lac';
    return (v||0).toLocaleString();
  }
  function fmtNum(v) { return (v||0).toLocaleString(); }
  function pct(a,b){ return b? ((a/b)*100).toFixed(1)+'%' : '0%'; }

  function filtered() {
    var f = filters;
    // Also respect global dashboard filters (FLT) from index.html
    var g = (typeof FLT!=="undefined"&&FLT)?FLT:{};
    var gbu=(g.bu||"").toLowerCase(), gwh=(g.wh||"").toLowerCase(), gitem=(g.item||"").toLowerCase();
    return data.filter(function(r){
      if(f.sbu && r.sbu!==f.sbu) return false;
      if(f.wh && r.warehouse!==f.wh) return false;
      if(f.cat && r.category!==f.cat) return false;
      if(f.type && r.inventoryType!==f.type) return false;
      if(f.sku && r.sku.toLowerCase().indexOf(f.sku.toLowerCase())<0) return false;
      if(f.bucket && r.agingBucket!==f.bucket) return false;
      if(f.mv && r.movementStatus!==f.mv) return false;
      if(f.risk && r.riskStatus!==f.risk) return false;
      // global BU / Warehouse / Item filters
      if(gbu && (r.sbu||"").toLowerCase().indexOf(gbu)<0) return false;
      if(gwh && (r.warehouse||"").toLowerCase().indexOf(gwh)<0) return false;
      if(gitem && (r.itemDescription||"").toLowerCase().indexOf(gitem)<0 && (r.sku||"").toLowerCase().indexOf(gitem)<0) return false;
      return true;
    });
  }

  // ---- Theme-aware colors (centralized tokens) ----
  function th(v,fallback){
    var el=document.documentElement;
    var val=el?getComputedStyle(el).getPropertyValue(v):'';
    return val&&val.trim()?val.trim():fallback;
  }
  function themeColors(){
    return {
      primary: th('--theme-chart-primary','#2563EB'),
      secondary: th('--theme-chart-secondary','#60A5FA'),
      tertiary: th('--theme-chart-tertiary','#93C5FD'),
      border: th('--theme-border','#DBEAFE'),
      text: th('--theme-text','#111827'),
      muted: th('--theme-muted','#64748B'),
      card: th('--theme-card','#FFFFFF')
    };
  }

  // ---- KPIs ----
  function kpis(rows) {
    var total = rows.reduce(function(s,r){return s+r.stockValue;},0);
    var skuCount = {}; rows.forEach(function(r){skuCount[r.sku]=1;});
    var gt90 = rows.filter(function(r){return r.ageDays>90;}).reduce(function(s,r){return s+r.stockValue;},0);
    var gt180 = rows.filter(function(r){return r.ageDays>180;}).reduce(function(s,r){return s+r.stockValue;},0);
    var nonMove = rows.filter(function(r){return r.movementStatus==='Non-Moving'||r.movementStatus==='Dead Stock';}).reduce(function(s,r){return s+r.stockValue;},0);
    var prov = rows.reduce(function(s,r){return s+r.provisionValue;},0);
    var crit = rows.filter(function(r){return r.riskStatus==='Critical';}).length;
    var cards = [
      {l:'Total Inventory Value', v:fmtBDT(total), sub:'BDT', cls:'t'},
      {l:'Total SKU', v:fmtNum(Object.keys(skuCount).length), sub:'unique items', cls:'b'},
      {l:'Inventory >90 Days', v:fmtBDT(gt90), sub:pct(gt90,total), cls:'o'},
      {l:'Inventory >180 Days', v:fmtBDT(gt180), sub:pct(gt180,total), cls:'o'},
      {l:'Non-Moving Inventory', v:fmtBDT(nonMove), sub:pct(nonMove,total), cls:'r'},
      {l:'Potential Provision Value', v:fmtBDT(prov), sub:pct(prov,total), cls:'r'},
      {l:'Critical Risk SKU Count', v:fmtNum(crit), sub:'SKUs', cls:'r'}
    ];
    var h='<div class="ad-kpis">';
    cards.forEach(function(c){
      h+='<div class="ad-kpi '+c.cls+'"><div class="ad-kpi-l">'+c.l+'</div><div class="ad-kpi-v">'+c.v+'</div><div class="ad-kpi-s">'+c.sub+'</div></div>';
    });
    h+='</div>';
    return h;
  }

  // ---- Aging distribution chart ----
  function distChart(rows, toggle) {
    var buckets=['0-30','31-60','61-90','91-180','181-365','>365'];
    var q=[], v=[];
    buckets.forEach(function(b){
      var rowsB=rows.filter(function(r){return r.agingBucket===b;});
      q.push(rowsB.reduce(function(s,r){return s+Math.abs(r.quantity);},0));
      v.push(rowsB.reduce(function(s,r){return s+r.stockValue;},0));
    });
    var isVal = toggle==='value' || filters.bucketView==='value';
    var dsData = isVal ? v.map(function(x){return x/1e6;}) : q.map(function(x){return x/1e3;});
    var lbl = isVal ? 'Value (M BDT)' : 'Quantity (K)';
    var valueLabel = function(c){ return isVal? fmtBDT(c.raw*1e6) : fmtNum(c.raw*1e3); };
    if(charts.dist) charts.dist.destroy();
    var tc=themeColors();
    var barColors=[tc.primary,tc.secondary,tc.tertiary,shadeC(tc.primary,0.5),shadeC(tc.secondary,0.45),shadeC(tc.tertiary,0.35)];
    var labelPlugin = {
      id:'barLabels',
      afterDatasetsDraw:function(chart){
        var ctx=chart.ctx; chart.data.datasets.forEach(function(ds,di){
          var meta=chart.getDatasetMeta(di);
          if(!meta.data)return;
          meta.data.forEach(function(bar,i){
            var v=ds.data[i];
            if(!v)return;
            ctx.save(); ctx.fillStyle=tc.text; ctx.font='600 10px Segoe UI'; ctx.textAlign='center';
            ctx.fillText(fmtShort(v), bar.x, bar.y-4); ctx.restore();
          });
        });
      }
    };
    charts.dist = new Chart(document.getElementById('adDist'), {
      type:'bar',
      data:{labels:buckets, datasets:[{label:lbl, data:dsData, backgroundColor:barColors, borderRadius:8, maxBarThickness:70}]},
      plugins:[labelPlugin],
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}, tooltip:{callbacks:{label:function(c){return valueLabel(c);}}}},
        scales:{y:{display:false},x:{grid:{display:false},ticks:{color:tc.muted,font:{size:10,weight:'600'}}}}}
    });
  }

  // ---- Movement status chart ----
  function movementChart(rows) {
    var mv=['Fast Moving','Normal Moving','Slow Moving','Non-Moving','Dead Stock'];
    var vals = mv.map(function(m){ return rows.filter(function(r){return r.movementStatus===m;}).reduce(function(s,r){return s+r.stockValue;},0); });
    var colors=['#10B981','#006994','#F97316','#EC4899','#111111'];
    var total = rows.reduce(function(s,r){return s+r.stockValue;},0);
    if(charts.mv) charts.mv.destroy();
    var tc=themeColors();
    var centerPlugin = {
      id:'centerLabel',
      afterDraw:function(chart){
        var ctx=chart.ctx, cx=chart.width/2, cy=chart.height/2;
        ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillStyle=tc.text; ctx.font='800 15px Segoe UI'; ctx.fillText(fmtBDT(total), cx, cy-8);
        ctx.fillStyle=tc.muted; ctx.font='600 9px Segoe UI'; ctx.fillText('TOTAL VALUE', cx, cy+10); ctx.restore();
      }
    };
    // business status colors stay fixed; theme primary for healthy segment
    var mvColors=['#16A34A',tc.primary,tc.tertiary,'#EA580C','#DC2626'];
    charts.mv = new Chart(document.getElementById('adMvChart'), {
      type:'doughnut',
      data:{labels:mv, datasets:[{data:vals.map(function(x){return x/1e6;}), backgroundColor:mvColors, borderColor:'#fff', borderWidth:3}]},
      plugins:[centerPlugin],
      options:{responsive:true, maintainAspectRatio:false, cutout:'55%', plugins:{
        legend:{position:'right', labels:{color:tc.muted,font:{size:10,weight:'600'},boxWidth:14,padding:12}},
        tooltip:{callbacks:{label:function(c){return ' '+fmtBDT(c.raw*1e6);}}}
      }}
    });
  }

  // ---- Aging trend (12 months) ----
  function trendChart(rows) {
    var months=[], now=new Date(), i, m, y;
    for(i=11;i>=0;i--){ m=now.getMonth()-i; y=now.getFullYear()+Math.floor(m/12); m=((m%12)+12)%12; months.push(y+'-'+('0'+(m+1)).slice(-2)); }
    var total=[],gt90=[],gt180=[],nm=[];
    months.forEach(function(mon){
      var yy=+mon.split('-')[0], mm=+mon.split('-')[1];
      var recs = rows.filter(function(r){ var d=new Date(r.receiptDate); return d.getFullYear()===yy && d.getMonth()+1===mm; });
      total.push(recs.reduce(function(s,r){return s+r.stockValue;},0)/1e6);
      gt90.push(recs.filter(function(r){return r.ageDays>90;}).reduce(function(s,r){return s+r.stockValue;},0)/1e6);
      gt180.push(recs.filter(function(r){return r.ageDays>180;}).reduce(function(s,r){return s+r.stockValue;},0)/1e6);
      nm.push(recs.filter(function(r){return r.movementStatus==='Non-Moving'||r.movementStatus==='Dead Stock';}).reduce(function(s,r){return s+r.stockValue;},0)/1e6);
    });
    if(charts.trend) charts.trend.destroy();
    var tc=themeColors();
    charts.trend = new Chart(document.getElementById('adTrend'), {
      type:'line',
      data:{labels:months, datasets:[
        {label:'Total Inventory', data:total, borderColor:tc.primary, backgroundColor:tc.primary+'1F', fill:true, tension:0.35, borderWidth:3, pointRadius:3, pointBackgroundColor:tc.primary},
        {label:'>90 Days', data:gt90, borderColor:'#EAB308', backgroundColor:'transparent', tension:0.35, borderWidth:2.5, pointRadius:2, pointBackgroundColor:'#EAB308'},
        {label:'>180 Days', data:gt180, borderColor:'#EA580C', backgroundColor:'transparent', tension:0.35, borderWidth:2.5, pointRadius:2, pointBackgroundColor:'#EA580C'},
        {label:'Non-Moving', data:nm, borderColor:'#DC2626', backgroundColor:'transparent', tension:0.35, borderWidth:2, borderDash:[6,3], pointRadius:2}
      ]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'top',labels:{color:tc.muted,font:{size:10,weight:'600'},boxWidth:16}}}, scales:{y:{grid:{display:false},ticks:{display:false}},x:{grid:{display:false},ticks:{color:tc.muted,font:{size:9,weight:'600'}}}}}
    });
  }

  // helper to shade a hex color
  function shadeC(hex,pct){
    var n=parseInt(String(hex).replace('#',''),16);
    if(isNaN(n))return hex;
    var r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    if(pct<0){r=Math.round(r*(1+pct));g=Math.round(g*(1+pct));b=Math.round(b*(1+pct));}
    else{r=Math.round(r+(255-r)*pct);g=Math.round(g+(255-g)*pct);b=Math.round(b+(255-b)*pct);}
    return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }

  // short number for bar labels
  function fmtShort(v){
    var a=Math.abs(v);
    if(a>=1000)return (v/1000).toFixed(1)+'M';
    if(a>=1)return v.toFixed(1);
    return String(Math.round(v));
  }

  // ---- SBU heatmap ----
  function heatmap(rows) {
    var buckets=['0-30','31-60','61-90','91-180','181-365','>365'];
    var sbus = {}; rows.forEach(function(r){ sbus[r.sbu]=1; });
    var sbuList = Object.keys(sbus).sort();
    var map = {};
    rows.forEach(function(r){ if(!map[r.sbu])map[r.sbu]={}; map[r.sbu][r.agingBucket]=(map[r.sbu][r.agingBucket]||0)+r.stockValue; });
    var max = rows.length ? rows.reduce(function(s,r){return Math.max(s,r.stockValue);},0) : 1;
    var tc=themeColors();
    function rgbaFromHex(hex,alpha){
      var n=parseInt(String(hex).replace('#',''),16); if(isNaN(n))return 'rgba(0,0,0,'+alpha+')';
      return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+alpha+')';
    }
    var h='<div class="ad-table-wrap"><table class="ad-table ad-heat"><thead><tr><th>SBU</th>';
    buckets.forEach(function(b){ h+='<th>'+b+'</th>'; });
    h+='<th>Total</th></tr></thead><tbody>';
    sbuList.forEach(function(s){
      var tot=0; buckets.forEach(function(b){ tot += (map[s]&&map[s][b])||0; });
      h+='<tr><td class="ad-heat-sbu" onclick="AgingDash.heatClick(\''+s.replace(/'/g,"\\'")+'\')">'+s+'</td>';
      buckets.forEach(function(b){
        var val=(map[s]&&map[s][b])||0;
        var alpha = val>0 ? Math.min(0.85, 0.12 + (val/max)*0.7) : 0;
        var color = val>0 ? rgbaFromHex(tc.primary,alpha) : 'transparent';
        h+='<td class="ad-heat-cell" style="background:'+color+'" onclick="AgingDash.bucketClick(\''+b+'\',\''+s.replace(/'/g,"\\'")+'\')" title="'+fmtBDT(val)+'">'+(val>0?fmtBDT(val):'')+'</td>';
      });
      h+='<td class="ad-heat-tot">'+fmtBDT(tot)+'</td></tr>';
    });
    h+='</tbody></table></div>';
    return h;
  }

  // ---- Warehouse aging table ----
  function warehouseTable(rows, search) {
    var map={};
    rows.forEach(function(r){
      if(!map[r.warehouse])map[r.warehouse]={total:0,gt90:0,gt180:0,nonMove:0};
      map[r.warehouse].total += r.stockValue;
      if(r.ageDays>90)map[r.warehouse].gt90 += r.stockValue;
      if(r.ageDays>180)map[r.warehouse].gt180 += r.stockValue;
      if(r.movementStatus==='Non-Moving'||r.movementStatus==='Dead Stock')map[r.warehouse].nonMove += r.stockValue;
    });
    var list = Object.keys(map).filter(function(w){ return !search || w.toLowerCase().indexOf(search.toLowerCase())>=0; });
    list.sort(function(a,b){ return map[b].total - map[a].total; });
    var h='<div class="ad-table-wrap"><table class="ad-table" id="adWHTable"><thead><tr><th onclick="AgingDash.whSort(\'name\')">Warehouse &#8597;</th><th onclick="AgingDash.whSort(\'total\')">Total Stock &#8597;</th><th onclick="AgingDash.whSort(\'gt90\')">&gt;90d Value &#8597;</th><th onclick="AgingDash.whSort(\'gt180\')">&gt;180d Value &#8597;</th><th onclick="AgingDash.whSort(\'non\')">Non-Moving &#8597;</th><th>Aging %</th><th>Risk Status</th></tr></thead><tbody>';
    list.forEach(function(w){
      var m=map[w], agingPct = m.total? (m.gt90/m.total*100):0;
      var risk = agingPct>50?'Critical':agingPct>25?'Attention':agingPct>10?'Watch':'Normal';
      var cls = risk==='Critical'?'ad-risk-c':risk==='Attention'?'ad-risk-a':risk==='Watch'?'ad-risk-w':'ad-risk-n';
      h+='<tr><td class="ad-click" onclick="AgingDash.whClick(\''+w.replace(/'/g,"\\'")+'\')">'+w+'</td><td>'+fmtBDT(m.total)+'</td><td>'+fmtBDT(m.gt90)+'</td><td>'+fmtBDT(m.gt180)+'</td><td>'+fmtBDT(m.nonMove)+'</td><td>'+agingPct.toFixed(1)+'%</td><td><span class="ad-risk '+cls+'">'+risk+'</span></td></tr>';
    });
    if(!list.length) h+='<tr><td colspan="7" style="text-align:center;color:var(--t3)">No warehouses match</td></tr>';
    h+='</tbody></table></div>';
    return h;
  }

  // ---- Top critical SKUs ----
  function topSkus(rows, sortBy) {
    var sorted = rows.slice().sort(function(a,b){
      if(sortBy==='age') return b.ageDays-a.ageDays;
      if(sortBy==='risk') return (b.riskStatus==='Critical'?3:b.riskStatus==='Attention'?2:b.riskStatus==='Watch'?1:0)-(a.riskStatus==='Critical'?3:a.riskStatus==='Attention'?2:a.riskStatus==='Watch'?1:0);
      return b.stockValue-a.stockValue;
    }).slice(0,10);
    var h='<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>#</th><th>SKU</th><th>Item Description</th><th>Category</th><th>SBU</th><th>Warehouse</th><th>Qty</th><th>Stock Value</th><th>Age Days</th><th>Last Movement</th><th>Movement</th><th>Prov %</th><th>Prov Value</th><th>Risk</th></tr></thead><tbody>';
    sorted.forEach(function(r,i){
      var rc = r.riskStatus==='Critical'?'ad-risk-c':r.riskStatus==='Attention'?'ad-risk-a':r.riskStatus==='Watch'?'ad-risk-w':'ad-risk-n';
      var mc = r.movementStatus==='Dead Stock'||r.movementStatus==='Non-Moving'?'ad-risk-c':r.movementStatus==='Slow Moving'?'ad-risk-w':'ad-risk-n';
      h+='<tr onclick="AgingDash.skuClick(\''+r.sku.replace(/'/g,"\\'")+'\')" class="ad-row-click"><td>'+(i+1)+'</td><td class="ad-click">'+r.sku+'</td><td>'+r.itemDescription+'</td><td>'+r.category+'</td><td>'+r.sbu+'</td><td>'+r.warehouse+'</td><td>'+fmtNum(r.quantity)+'</td><td>'+fmtBDT(r.stockValue)+'</td><td>'+r.ageDays+'</td><td>'+r.lastMovementDate+'</td><td><span class="ad-risk '+mc+'">'+r.movementStatus+'</span></td><td>'+r.provisionPercent+'%</td><td>'+fmtBDT(r.provisionValue)+'</td><td><span class="ad-risk '+rc+'">'+r.riskStatus+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
    return h;
  }

  // ---- Risk matrix ----
  function riskMatrix(rows) {
    var buckets=['0-30','31-60','61-90','91-180','181-365','>365'];
    var cells = { low:0, watch:0, attn:0, crit:0 };
    var valMap = { low:{c:0,v:0}, watch:{c:0,v:0}, attn:{c:0,v:0}, crit:{c:0,v:0} };
    rows.forEach(function(r){
      var hiVal = r.stockValue > 2000000;
      var hiAge = r.ageDays > 180;
      var key = hiVal && hiAge ? 'crit' : hiVal ? 'attn' : hiAge ? 'watch' : 'low';
      valMap[key].c++; valMap[key].v += r.stockValue;
    });
    function cell(label, key, cls, icon){
      return '<div class="ad-mx '+cls+'"><div class="ad-mx-ic">'+icon+'</div><div class="ad-mx-l">'+label+'</div><div class="ad-mx-v">'+fmtBDT(valMap[key].v)+'</div><div class="ad-mx-s">'+fmtNum(valMap[key].c)+' SKUs</div></div>';
    }
    return '<div class="ad-mx-grid">'+
      cell('LOW RISK','low','ad-mx-low','&#x1F7E2;')+
      cell('WATCHLIST','watch','ad-mx-watch','&#x1F7E1;')+
      cell('ATTENTION','attn','ad-mx-attn','&#x1F7E0;')+
      cell('CRITICAL','crit','ad-mx-crit','&#x1F534;')+
      '</div>';
  }

  // ---- Provision analysis ----
  function provision(rows) {
    var totalProv = rows.reduce(function(s,r){return s+r.provisionValue;},0);
    var booked = rows.reduce(function(s,r){return s+r.provisionValue*0.6;},0); // simulated booked
    var gap = totalProv - booked;
    var pctProv = rows.reduce(function(s,r){return s+r.stockValue;},0) ? totalProv / rows.reduce(function(s,r){return s+r.stockValue;},0)*100 : 0;
    // by bucket
    var buckets=['0-30','31-60','61-90','91-180','181-365','>365'];
    var h='<div class="ad-provision">';
    h+='<div class="ad-prov-cards">';
    h+='<div class="ad-prov-card"><div class="ad-prov-l">Potential Provision</div><div class="ad-prov-v">'+fmtBDT(totalProv)+'</div></div>';
    h+='<div class="ad-prov-card"><div class="ad-prov-l">Provision Already Booked</div><div class="ad-prov-v">'+fmtBDT(booked)+'</div></div>';
    h+='<div class="ad-prov-card ad-prov-gap"><div class="ad-prov-l">Provision Gap</div><div class="ad-prov-v">'+fmtBDT(gap)+'</div><div class="ad-prov-s">&#x26A0; Gap needs review</div></div>';
    h+='<div class="ad-prov-card"><div class="ad-prov-l">Provision %</div><div class="ad-prov-v">'+pctProv.toFixed(1)+'%</div></div>';
    h+='</div>';
    h+='<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Aging Bucket</th><th>Provision Value</th><th>% of Total Provision</th></tr></thead><tbody>';
    var provByBucket = {};
    rows.forEach(function(r){ provByBucket[r.agingBucket]=(provByBucket[r.agingBucket]||0)+r.provisionValue; });
    buckets.forEach(function(b){
      var pv=provByBucket[b]||0;
      h+='<tr><td>'+b+'</td><td>'+fmtBDT(pv)+'</td><td>'+pct(pv,totalProv)+'</td></tr>';
    });
    h+='</tbody></table></div>';
    h+='</div>';
    return h;
  }

  // ---- SBU ranking ----
  function sbuRank(rows) {
    var map={};
    rows.forEach(function(r){
      if(!map[r.sbu])map[r.sbu]={total:0,gt90:0,gt180:0,nm:0};
      map[r.sbu].total += r.stockValue;
      if(r.ageDays>90)map[r.sbu].gt90 += r.stockValue;
      if(r.ageDays>180)map[r.sbu].gt180 += r.stockValue;
      if(r.movementStatus==='Non-Moving'||r.movementStatus==='Dead Stock')map[r.sbu].nm += r.stockValue;
    });
    var list=Object.keys(map).map(function(s){ return {sbu:s, total:map[s].total, gt90:map[s].gt90, gt180:map[s].gt180, nm:map[s].nm}; });
    list.sort(function(a,b){ return (b.gt90/b.total||0)-(a.gt90/a.total||0); });
    var h='<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>Rank</th><th>SBU</th><th>Total Inventory</th><th>&gt;90d</th><th>&gt;180d</th><th>Aging %</th><th>Non-Moving %</th><th>Risk Status</th></tr></thead><tbody>';
    list.forEach(function(x,i){
      var ap = x.total? x.gt90/x.total*100:0, np = x.total? x.nm/x.total*100:0;
      var risk = ap>50?'Critical':ap>25?'Attention':ap>10?'Watch':'Normal';
      var cls=risk==='Critical'?'ad-risk-c':risk==='Attention'?'ad-risk-a':risk==='Watch'?'ad-risk-w':'ad-risk-n';
      h+='<tr><td>'+(i+1)+'</td><td class="ad-click" onclick="AgingDash.heatClick(\''+x.sbu.replace(/'/g,"\\'")+'\')">'+x.sbu+'</td><td>'+fmtBDT(x.total)+'</td><td>'+fmtBDT(x.gt90)+'</td><td>'+fmtBDT(x.gt180)+'</td><td>'+ap.toFixed(1)+'%</td><td>'+np.toFixed(1)+'%</td><td><span class="ad-risk '+cls+'">'+risk+'</span></td></tr>';
    });
    h+='</tbody></table></div>';
    return h;
  }

  // ---- Management action panel ----
  function actions(rows) {
    var acts=[];
    rows.forEach(function(r){
      if(r.riskStatus==='Critical' && r.ageDays>180 && r.stockValue>2000000){
        acts.push({p:'P1', issue:'High value stock aging >180 days', sbu:r.sbu, where:r.sku+' / '+r.warehouse, val:r.stockValue, rec:'Escalate liquidation / write-down decision with Finance', cls:'ad-risk-c'});
      } else if(r.ageDays>75 && r.ageDays<=90 && r.stockValue>1000000){
        acts.push({p:'P2', issue:'Inventory approaching 90 days (attention window)', sbu:r.sbu, where:r.sku+' / '+r.warehouse, val:r.stockValue, rec:'Push sales / transfer before it becomes slow-moving', cls:'ad-risk-w'});
      } else if(r.movementStatus==='Slow Moving'){
        acts.push({p:'P3', issue:'Slow-moving inventory needs review', sbu:r.sbu, where:r.sku+' / '+r.warehouse, val:r.stockValue, rec:'Discount / bundle / inter-SBU transfer window', cls:'ad-risk-w'});
      }
    });
    // de-dup + sort by value
    var seen={}; acts = acts.filter(function(a){ var k=a.sku?0:0; return true; });
    acts.sort(function(a,b){return b.val-a.val;});
    acts = acts.slice(0,15);
    var provGap = rows.reduce(function(s,r){return s+r.provisionValue;},0)*0.4;
    if(provGap>500000) acts.push({p:'P1', issue:'Provision gap exceeds booked provision', sbu:'Group', where:'Portfolio', val:provGap, rec:'Review provision policy & book additional provision', cls:'ad-risk-c'});
    var h='<div class="ad-actions">';
    acts.forEach(function(a){
      h+='<div class="ad-act"><span class="ad-risk '+a.cls+'">'+a.p+'</span><div class="ad-act-b"><b>'+a.issue+'</b><br><span class="ad-act-m">'+a.sbu+' &bull; '+a.where+' &bull; '+fmtBDT(a.val)+'</span><br><span class="ad-act-r">&#x2714; '+a.rec+'</span></div></div>';
    });
    if(!acts.length) h+='<div style="color:var(--t3);padding:12px">No action items for current filters</div>';
    h+='</div>';
    return h;
  }

  // ---- SKU detail modal ----
  function skuModal(sku) {
    var rows = data.filter(function(r){return r.sku===sku;});
    if(!rows.length) return;
    var r=rows[0];
    var rc = r.riskStatus==='Critical'?'ad-risk-c':r.riskStatus==='Attention'?'ad-risk-a':r.riskStatus==='Watch'?'ad-risk-w':'ad-risk-n';
    var h='<div class="ad-sku-modal">';
    h+='<div class="ad-sku-h"><span class="ad-risk '+rc+'">'+r.riskStatus+'</span> <b>'+r.sku+'</b> — '+r.itemDescription+'</div>';
    h+='<div class="ad-sku-grid">';
    h+='<div class="ad-sku-f"><label>Category</label><b>'+r.category+'</b></div>';
    h+='<div class="ad-sku-f"><label>Inventory Type</label><b>'+r.inventoryType+'</b></div>';
    h+='<div class="ad-sku-f"><label>SBU</label><b>'+r.sbu+'</b></div>';
    h+='<div class="ad-sku-f"><label>Warehouse</label><b>'+r.warehouse+'</b></div>';
    h+='<div class="ad-sku-f"><label>Current Stock</label><b>'+fmtNum(r.quantity)+'</b></div>';
    h+='<div class="ad-sku-f"><label>Stock Value</label><b>'+fmtBDT(r.stockValue)+'</b></div>';
    h+='<div class="ad-sku-f"><label>Age Days</label><b>'+r.ageDays+'</b></div>';
    h+='<div class="ad-sku-f"><label>Aging Bucket</label><b>'+r.agingBucket+'</b></div>';
    h+='<div class="ad-sku-f"><label>Receipt Date</label><b>'+r.receiptDate+'</b></div>';
    h+='<div class="ad-sku-f"><label>Last Movement</label><b>'+r.lastMovementDate+'</b></div>';
    h+='<div class="ad-sku-f"><label>Movement Status</label><b>'+r.movementStatus+'</b></div>';
    h+='<div class="ad-sku-f"><label>Provision %</label><b>'+r.provisionPercent+'%</b></div>';
    h+='<div class="ad-sku-f"><label>Provision Value</label><b>'+fmtBDT(r.provisionValue)+'</b></div>';
    h+='</div>';
    h+='<div class="ad-sku-rec ad-risk '+rc+'">&#x1F4CB; Recommended Action: '+(r.riskStatus==='Critical'?'Immediate liquidation / write-down with Finance approval.':r.riskStatus==='Attention'?'Launch disposal / transfer plan within 30 days.':r.riskStatus==='Watch'?'Review demand & slow-mover activation.':'Maintain current controls.')+'</div>';
    h+='</div>';
    openModal('SKU Detail — '+r.sku, h);
  }

  // ---- Public ----
  return {
    init: function(){
      var self=this;
      if(data && data.length){ self.render(); return; } // keep existing data (filters persist)
      // async: try live DWH via service, fallback to mock
      var res = InventoryService.getData(function(rows, source){
        data = cleanInventory(rows);
        self.dataSource = source || 'mock';
        self.render();
      });
      if (Array.isArray(res)) { data = cleanInventory(res); this.dataSource='mock'; this.render(); }
    },
    render: function(){
      var rows = filtered();
      var grid = document.getElementById('adBody');
      if(!grid) return;
      grid.innerHTML =
        kpis(rows) +
        '<div class="ad-filters" id="adFilters"></div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Aging Distribution <span class="ad-toggle"><button class="ad-btn '+(filters.bucketView==='value'?'ad-btn-on':'')+'" onclick="AgingDash.setView(\'value\')">Value</button><button class="ad-btn '+(filters.bucketView==='quantity'?'ad-btn-on':'')+'" onclick="AgingDash.setView(\'quantity\')">Quantity</button></span></div><div class="ad-chart-sm"><canvas id="adDist"></canvas></div></div>' +
        '<div class="ad-sec"><div class="ad-sec-h">SBU Aging Heatmap <span class="ad-hint">click cell / SBU to filter</span></div>'+heatmap(rows)+'</div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Warehouse Aging <input class="ad-search" id="adWhSearch" placeholder="Search warehouse..." oninput="AgingDash.whSearch(this.value)"></div>'+warehouseTable(rows,'')+'</div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Top 10 Critical Aging SKU <span class="ad-toggle"><button class="ad-btn '+(sortTop.key==='stockValue'?'ad-btn-on':'')+'" onclick="AgingDash.topSort(\'stockValue\')">Value</button><button class="ad-btn '+(sortTop.key==='age'?'ad-btn-on':'')+'" onclick="AgingDash.topSort(\'age\')">Age</button><button class="ad-btn '+(sortTop.key==='risk'?'ad-btn-on':'')+'" onclick="AgingDash.topSort(\'risk\')">Risk</button></span></div>'+topSkus(rows,sortTop.key)+'</div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Inventory Risk Matrix</div>'+riskMatrix(rows)+'</div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Movement Status</div><div class="ad-chart-sm"><canvas id="adMvChart"></canvas></div></div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Aging Trend (12 months)</div><div class="ad-chart"><canvas id="adTrend"></canvas></div></div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Provision Analysis</div>'+provision(rows)+'</div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Worst Performing SBU by Aging</div>'+sbuRank(rows)+'</div>' +
        '<div class="ad-sec"><div class="ad-sec-h">Management Action Required</div>'+actions(rows)+'</div>';
      this.renderFilters(rows);
      setTimeout(function(){
        AgingDash.distChart(rows, filters.bucketView);
        AgingDash.movementChart(rows);
        AgingDash.trendChart(rows);
      }, 60);
    },
    renderFilters: function(rows){
      var el=document.getElementById('adFilters'); if(!el) return;
      function opts(field){
        var set={}; rows.forEach(function(r){set[r[field]]=1;}); var list=Object.keys(set).sort();
        return '<option value="">All</option>'+list.map(function(v){return '<option value="'+v.replace(/"/g,'&quot;')+'"'+(filters[field]===v?' selected':'')+'>'+v+'</option>';}).join('');
      }
      var mv=['Fast Moving','Normal Moving','Slow Moving','Non-Moving','Dead Stock'];
      var bk=['0-30','31-60','61-90','91-180','181-365','>365'];
      var rk=['Normal','Watch','Attention','Critical'];
      var tp=['Raw Material','Finished Goods','MRO','Trading','WIP'];
      el.innerHTML=
        '<select onchange="AgingDash.setFilter(\'sbu\',this.value)"><option value="">SBU: All</option>'+opts('sbu')+'</select>'+
        '<select onchange="AgingDash.setFilter(\'wh\',this.value)"><option value="">Warehouse: All</option>'+opts('warehouse')+'</select>'+
        '<select onchange="AgingDash.setFilter(\'cat\',this.value)"><option value="">Category: All</option>'+opts('category')+'</select>'+
        '<select onchange="AgingDash.setFilter(\'type\',this.value)"><option value="">Type: All</option>'+tp.map(function(v){return '<option value="'+v+'"'+(filters.type===v?' selected':'')+'>'+v+'</option>';}).join('')+'</select>'+
        '<select onchange="AgingDash.setFilter(\'bucket\',this.value)"><option value="">Aging Bucket: All</option>'+bk.map(function(v){return '<option value="'+v+'"'+(filters.bucket===v?' selected':'')+'>'+v+'</option>';}).join('')+'</select>'+
        '<select onchange="AgingDash.setFilter(\'mv\',this.value)"><option value="">Movement: All</option>'+mv.map(function(v){return '<option value="'+v+'"'+(filters.mv===v?' selected':'')+'>'+v+'</option>';}).join('')+'</select>'+
        '<select onchange="AgingDash.setFilter(\'risk\',this.value)"><option value="">Risk: All</option>'+rk.map(function(v){return '<option value="'+v+'"'+(filters.risk===v?' selected':'')+'>'+v+'</option>';}).join('')+'</select>'+
        '<input class="ad-search" placeholder="Search SKU..." value="'+filters.sku+'" oninput="AgingDash.setFilter(\'sku\',this.value)">'+
        '<button class="ad-btn ad-reset" onclick="AgingDash.resetFilters()">Reset</button>'+
        '<span class="ad-count">'+rows.length.toLocaleString()+' records</span>';
    },
    setFilter: function(k,v){ filters[k]=v; this.render(); },
    setView: function(v){ filters.bucketView=v; this.render(); },
    resetFilters: function(){ filters={sbu:'',wh:'',cat:'',type:'',sku:'',bucket:'',mv:'',risk:'',bucketView:'value'}; this.render(); },
    topSort: function(k){ sortTop.key=k; this.render(); },
    whSearch: function(v){ var rows=filtered(); document.querySelector('#adBody').querySelectorAll('table')[1].outerHTML = warehouseTable(rows, v); },
    whSort: function(k){ /* placeholder - re-render for now */ this.render(); },
    heatClick: function(sbu){ filters.sbu = (filters.sbu===sbu?'':sbu); this.render(); },
    bucketClick: function(b,sbu){ filters.bucket=b; filters.sbu=sbu; this.render(); },
    whClick: function(w){ filters.wh = (filters.wh===w?'':w); this.render(); },
    skuClick: function(sku){ skuModal(sku); },
    distChart: distChart, movementChart: movementChart, trendChart: trendChart
  };
})();
