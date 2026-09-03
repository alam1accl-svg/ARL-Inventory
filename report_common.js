/* ARL Report Pages - Shared JS: menu, filters, data fetch, formatting */
var D=[],P=[],A=[],TO=[],CL=[],WHP=[],BUS=[],OTIF=[],SPACE=[],MANPOWER=[],APPROVAL=[],SUM={};
var FLT={from:todayStr(),to:todayStr(),bu:"",wh:"",plant:"",txn:"",item:"",gran:"daily"};
function todayStr(){var d=new Date();var m=d.getMonth()+1,dd=d.getDate();return d.getFullYear()+"-"+("0"+m).slice(-2)+"-"+("0"+dd).slice(-2);}

var MENU=[
["index.html","\u{1F4CA} Control Tower"],
["inventory_report.html","\u{1F4E6} Inventory Report"],
["aging_report.html","\u{23F3} Aging Report"],
["aging_dashboard.html","\u{1F3E2} Aging Control Tower"],
["dio_report.html","\u{1F4C8} DIO"],
["turnover_report.html","\u{1F504} Turnover Ratio"],
["otif_report.html","\u{1F69A} OTIF"],
["pr_pending_report.html","\u{1F4CB} PR Pending Report"],
["approval_pending.html","\u{23F3} Approval Pending"],
["mro_planning.html","\u{1F527} MRO Planning"],
["space_calculation.html","\u{1F4E6} Space Calculation"],
["warehouse_agreement.html","\u{1F4C4} Warehouse Agreement"],
["manpower_information.html","\u{1F465} Manpower Information"]
];
function renderMenu(active){
var page=location.pathname.split("/").pop()||"index.html";
document.getElementById("tabs").innerHTML=MENU.map(function(m){
return '<a class="tab'+(m[0]===page?" on":"")+'" href="'+m[0]+'">'+m[1]+'</a>';
}).join("");
}

function f(v){if(Math.abs(v)>=10000000)return(v/10000000).toFixed(2)+" Cr";if(Math.abs(v)>=100000)return(v/100000).toFixed(2)+" Lac";return Number(v).toLocaleString(undefined,{maximumFractionDigits:2})}

function loadData(d){
if(d.stock&&d.stock.length)D=d.stock.map(function(x){return{s:x.s,v:x.v,c:"SBU"}});
if(d.pr&&d.pr.length)P=d.pr;
if(d.aging&&d.aging.length)A=d.aging.map(function(x){return{s:x.s,i:"Inventory",v:x.v,d:x.d,c:x.c}});
if(d.dio&&d.dio.length)TO=d.dio.map(function(x){return{s:x.s,inv:x.inv,cogs:x.cogs}});
if(d.clearance&&d.clearance.length)CL=d.clearance;
if(d.whPlant&&d.whPlant.length)WHP=d.whPlant.map(function(x){return{bu:x.bu,wh:x.wh,plant:x.plant}});
if(d.businessUnits&&d.businessUnits.length)BUS=d.businessUnits.map(function(x){return x.s});
if(d.otif&&d.otif.length)OTIF=d.otif;
if(d.space&&d.space.length)SPACE=d.space;
if(d.manpower&&d.manpower.length)MANPOWER=d.manpower;
if(d.approvalPending&&d.approvalPending.length)APPROVAL=d.approvalPending;
if(d.summary)SUM=d.summary;
if(!BUS.length){
var set={};BUS=[];
D.forEach(function(x){if(!set[x.s]){set[x.s]=1;BUS.push(x.s);}});
WHP.forEach(function(x){if(x.bu&&!set[x.bu]){set[x.bu]=1;BUS.push(x.bu);}});
BUS.sort();
}
}

function renderFilters(){
var buOpts=BUS.map(function(x){return '<option value="'+x.replace(/"/g,"&quot;")+'"'+(FLT.bu===x?" selected":"")+'>'+x+'</option>'}).join("");
var gran=["daily","weekly","monthly","yearly"],gl=["Daily","Weekly","Monthly","Yearly"];
var gOpts=gran.map(function(x,i){return '<option value="'+x+'"'+(FLT.gran===x?" selected":"")+'>'+gl[i]+'</option>'}).join("");
var plantFiltered=buPlantOptions(FLT.bu);
var pOpts=plantFiltered.map(function(x){return '<option value="'+x.replace(/"/g,"&quot;")+'"'+(FLT.plant===x?" selected":"")+'>'+x+'</option>'}).join("");
var whFiltered=whOptions(FLT.bu,FLT.plant);
var wOpts=whFiltered.map(function(x){return '<option value="'+x.replace(/"/g,"&quot;")+'"'+(FLT.wh===x?" selected":"")+'>'+x+'</option>'}).join("");
var h='<div class="card"><div class="card-h"><h3>&#x1F50D; Filters</h3><span style="font-size:9px;color:var(--t3)">'+BUS.length+' Business Units</span></div><div class="card-b"><div class="filter-grid">';
h+='<label>Business Unit<select id="fBU" onchange="updateFilters()"><option value="">All Business Units</option>'+buOpts+'</select></label>';
h+='<label>Plant<select id="fPlant" '+(FLT.bu?"":"disabled")+' onchange="updateFilters()"><option value="">All Plants</option>'+pOpts+'</select></label>';
h+='<label>Warehouse<select id="fWH" '+(FLT.plant?"":"disabled")+' onchange="updateFilters()"><option value="">All Warehouses</option>'+wOpts+'</select></label>';
h+='<label>Search Item Name / Code<input type="text" id="fItem" placeholder="Search item name / code..." value="'+FLT.item.replace(/"/g,"&quot;")+'" oninput="updateFilters()"></label>';
h+='<label>Timeframe<select id="fGran" onchange="updateFilters()">'+gOpts+'</select></label>';
h+='</div></div></div>';
return h;
}

function buPlantOptions(bu){
var seen={},names=[];
WHP.forEach(function(x){if(bu&&x.bu!==bu)return;if(x.plant&&!seen[x.plant]){seen[x.plant]=1;names.push(x.plant);}});
names.sort();return names;
}
function whOptions(bu,plant){
var seen={},names=[];
WHP.forEach(function(x){if(bu&&x.bu!==bu)return;if(plant&&x.plant!==plant)return;if(x.wh&&!seen[x.wh]){seen[x.wh]=1;names.push(x.wh);}});
names.sort();return names;
}

// Geo + item filter that applies to any report row keyed by business unit
function geoOK(buName){
if(!buName)return true;
var b=(buName||"").toLowerCase();
if(FLT.bu&&b.indexOf(FLT.bu.toLowerCase())<0)return false;
if(FLT.plant){var ok=false;WHP.forEach(function(x){if(x.bu===buName&&x.plant===FLT.plant)ok=true;});if(!ok)return false;}
if(FLT.wh){var ok2=false;WHP.forEach(function(x){if(x.bu===buName&&x.wh===FLT.wh)ok2=true;});if(!ok2)return false;}
return true;
}
function itemOK(name,code){
if(!FLT.item)return true;
var q=FLT.item.toLowerCase();
if(name&&String(name).toLowerCase().indexOf(q)>=0)return true;
if(code&&String(code).toLowerCase().indexOf(q)>=0)return true;
return false;
}
function granFilter(q){return q;} // Timeframe placeholder - applies to date-based reports

function updateFilters(){
var g=function(id){var e=document.getElementById(id);return e?e.value:""};
var prevBu=FLT.bu,prevPlant=FLT.plant,prevGran=FLT.gran;
FLT.from=g("fFrom");FLT.to=g("fTo");FLT.bu=g("fBU");FLT.wh=g("fWH");FLT.plant=g("fPlant");FLT.txn=g("fTxn");FLT.item=g("fItem");FLT.gran=g("fGran")||"daily";
// Auto date range by Timeframe
if(FLT.gran!==prevGran){
var now=new Date(),d0=new Date(now),d1=new Date(now);
if(FLT.gran==="daily"){d0=now;d1=now;}
else if(FLT.gran==="weekly"){d0.setDate(now.getDate()-6);d1=now;}
else if(FLT.gran==="monthly"){d0=new Date(now.getFullYear(),now.getMonth(),1);d1=now;}
else if(FLT.gran==="yearly"){d0=new Date(now.getFullYear(),0,1);d1=now;}
function iso(x){return x.getFullYear()+"-"+("0"+(x.getMonth()+1)).slice(-2)+"-"+("0"+x.getDate()).slice(-2);}
FLT.from=iso(d0);FLT.to=iso(d1);
var f1=document.getElementById("fFrom");if(f1)f1.value=FLT.from;
var f2=document.getElementById("fTo");if(f2)f2.value=FLT.to;
}
if(FLT.bu!==prevBu){FLT.plant="";FLT.wh="";}
if(FLT.plant!==prevPlant&&FLT.bu===prevBu){FLT.wh="";}
if(!FLT.bu){FLT.plant="";FLT.wh="";}
if(!FLT.plant){FLT.wh="";}
refreshFilters();renderReport();
}
function refreshFilters(){
var el=document.getElementById("fPlant");
if(el){var names=buPlantOptions(FLT.bu);var h='<option value="">All Plants</option>';names.forEach(function(n){h+='<option value="'+n.replace(/"/g,"&quot;")+'"'+(FLT.plant===n?" selected":"")+'>'+n+'</option>';});el.innerHTML=h;el.disabled=!!FLT.bu?false:true;}
var el2=document.getElementById("fWH");
if(el2){var names2=whOptions(FLT.bu,FLT.plant);var h2='<option value="">All Warehouses</option>';names2.forEach(function(n){h2+='<option value="'+n.replace(/"/g,"&quot;")+'"'+(FLT.wh===n?" selected":"")+'>'+n+'</option>';});el2.innerHTML=h2;el2.disabled=!!FLT.plant?false:true;}
}

function initReport(renderFn){
renderMenu();
var saved=null;try{saved=localStorage.getItem("arlTheme")}catch(e){}
applyTheme(saved||"black");
var lu=document.getElementById("lastUpdate");if(lu)lu.textContent=new Date().toLocaleTimeString();
fetch("/api/data",{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}).then(function(d){
loadData(d);renderFilters();renderFn();
}).catch(function(){
loadData({});renderFilters();renderFn();
});
}

var THEMES={
white:{primary:"#111827",primaryDark:"#374151",primaryLight:"#6B7280",bg:"#F8FAFC",card:"#FFFFFF",card2:"#F3F4F6",border:"#E5E7EB",t1:"#111827",t2:"#374151",t3:"#6B7280",hover:"#F3F4F6",active:"#111827",sidebar:"#FFFFFF",sideText:"#374151",chart1:"#111827",chart2:"#6B7280",chart3:"#9CA3AF"},
black:{primary:"#0EA5A4",primaryDark:"#003333",primaryLight:"#5EEAD4",bg:"#060b14",card:"#0d1525",card2:"#131d33",border:"#1a2744",t1:"#e2e8f0",t2:"#94a3b8",t3:"#4b5563",hover:"#1a2744",active:"#0EA5A4",sidebar:"#0d1525",sideText:"#e2e8f0",chart1:"#0EA5A4",chart2:"#FBBF24",chart3:"#57C3FF"},
yellow:{primary:"#F4B400",primaryDark:"#C58A00",primaryLight:"#FCD34D",bg:"#FFFDF5",card:"#FFFFFF",card2:"#FFF8D6",border:"#F3E5AB",t1:"#1F2937",t2:"#374151",t3:"#6B7280",hover:"#FFF8D6",active:"#F4B400",sidebar:"#FFFFFF",sideText:"#374151",chart1:"#F4B400",chart2:"#C58A00",chart3:"#FCD34D"},
orange:{primary:"#F97316",primaryDark:"#C2410C",primaryLight:"#FDBA74",bg:"#FFF7ED",card:"#FFFFFF",card2:"#FFEDD5",border:"#FED7AA",t1:"#1F2937",t2:"#374151",t3:"#6B7280",hover:"#FFEDD5",active:"#F97316",sidebar:"#FFFFFF",sideText:"#374151",chart1:"#F97316",chart2:"#C2410C",chart3:"#FDBA74"},
blue:{primary:"#2563EB",primaryDark:"#1D4ED8",primaryLight:"#93C5FD",bg:"#F5F9FF",card:"#FFFFFF",card2:"#EFF6FF",border:"#DBEAFE",t1:"#111827",t2:"#374151",t3:"#64748B",hover:"#EFF6FF",active:"#2563EB",sidebar:"#FFFFFF",sideText:"#374151",chart1:"#2563EB",chart2:"#60A5FA",chart3:"#93C5FD"},
pink:{primary:"#DB2777",primaryDark:"#9D174D",primaryLight:"#F9A8D4",bg:"#FFF7FB",card:"#FFFFFF",card2:"#FCE7F3",border:"#FBCFE8",t1:"#1F2937",t2:"#374151",t3:"#6B7280",hover:"#FCE7F3",active:"#DB2777",sidebar:"#FFFFFF",sideText:"#374151",chart1:"#DB2777",chart2:"#9D174D",chart3:"#F9A8D4"}
};
function shade(hex,pct){
  var n=parseInt(String(hex).replace('#',''),16);
  if(isNaN(n))return hex;
  var r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(pct<0){r=Math.round(r*(1+pct));g=Math.round(g*(1+pct));b=Math.round(b*(1+pct));}
  else{r=Math.round(r+(255-r)*pct);g=Math.round(g+(255-g)*pct);b=Math.round(b+(255-b)*pct);}
  return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function applyTheme(name){
var t=THEMES[name]||THEMES.blue;
var r=document.documentElement.style;
r.setProperty("--theme-primary",t.primary);r.setProperty("--theme-primary-dark",t.primaryDark);r.setProperty("--theme-primary-light",t.primaryLight);
r.setProperty("--theme-background",t.bg);r.setProperty("--theme-card",t.card);r.setProperty("--theme-card2",t.card2);
r.setProperty("--theme-border",t.border);r.setProperty("--theme-text",t.t1);r.setProperty("--theme-muted",t.t3);
r.setProperty("--theme-hover",t.hover);r.setProperty("--theme-active",t.active);
r.setProperty("--theme-sidebar",t.sidebar);r.setProperty("--theme-sidebar-text",t.sideText);
r.setProperty("--theme-chart-primary",t.chart1);r.setProperty("--theme-chart-secondary",t.chart2);r.setProperty("--theme-chart-tertiary",t.chart3);
r.setProperty("--bg",t.bg);r.setProperty("--card",t.card);r.setProperty("--card2",t.card2);
r.setProperty("--t1",t.t1);r.setProperty("--t2",t.t2);r.setProperty("--t3",t.t3);
r.setProperty("--border",t.border);
r.setProperty("--teal",t.primary);r.setProperty("--gold",t.primaryDark);r.setProperty("--teal2",t.primary);
r.setProperty("--topbar","linear-gradient(180deg,"+t.card+","+t.bg+")");
r.setProperty("--usertxt",t.t1);
r.setProperty("--chart-a",t.chart1);r.setProperty("--chart-b",t.chart2);r.setProperty("--chart-c",t.chart3);
r.setProperty("--chart-d",shade(t.chart1,0.65));r.setProperty("--chart-e",shade(t.chart2,0.6));
var dot=document.getElementById("themeDot");if(dot)dot.style.background="linear-gradient(135deg,"+t.primary+","+t.primaryDark+")";
document.querySelectorAll(".theme-opt").forEach(function(x){x.classList.toggle("active",x.getAttribute("data-c")===name);});
try{localStorage.setItem("arlTheme",name)}catch(e){}
}
function toggleTheme(){var p=document.getElementById("themePop");if(p)p.classList.toggle("open");}
document.addEventListener("click",function(e){
var p=document.getElementById("themePop");
if(p&&p.classList.contains("open")&&!p.contains(e.target))p.classList.remove("open");
});
