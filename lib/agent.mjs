import { fetchAll, SNAPSHOT } from './data.mjs';

function fmt(v) {
  const a = Math.abs(v || 0);
  if (a >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (a >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
  if (a >= 1e5) return (v / 1e5).toFixed(2) + ' Lac';
  return Math.round(v || 0).toLocaleString();
}

function daysSince(ds) {
  if (!ds) return null;
  const s = String(ds);
  const t = new Date(s.length <= 10 ? s + 'T00:00:00Z' : s).getTime();
  if (isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

function nameKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/m\/s/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(ltd|limited|co|company|pvt|private|industries|industry|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keyMatch(a, b) {
  const ka = nameKey(a), kb = nameKey(b);
  if (!ka || !kb) return false;
  return ka === kb || ka.startsWith(kb) || kb.startsWith(ka);
}

function findByKey(list, name, field) {
  field = field || 's';
  return list.find(x => keyMatch(x[field], name)) || null;
}

let CACHE = null, CACHE_AT = 0;

export async function getControlTowerData() {
  if (CACHE && Date.now() - CACHE_AT < 60000) return CACHE;
  let out;
  try {
    const data = await fetchAll();
    out = { ...data, source: 'live' };
  } catch (e) {
    const snap = JSON.parse(JSON.stringify(SNAPSHOT));
    snap.generatedAt = new Date().toISOString();
    out = { ...snap, source: 'snapshot' };
  }
  CACHE = out;
  CACHE_AT = Date.now();
  return out;
}

export function analyzeInventory(d) {
  const stock = d.stock || [];
  const pr = d.pr || [];
  const aging = d.aging || [];
  const dio = d.dio || [];
  const clearance = d.clearance || [];

  const pos = stock.filter(x => x.v > 0);
  const neg = stock.filter(x => x.v < 0);
  const totalPos = pos.reduce((s, x) => s + x.v, 0);
  const totalNeg = neg.reduce((s, x) => s + x.v, 0);

  const dioRows = dio.map(x => {
    const inv = x.inv || 0, cogs = x.cogs || 0;
    return {
      s: x.s, inv, cogs,
      turnover: cogs / Math.max(Math.abs(inv), 1),
      dioDays: cogs > 0 ? (inv / cogs) * 365 : null
    };
  });

  const obsolete = aging.filter(x => x.c === 'Obsolete' && x.v > 0);
  const nonMoving = aging.filter(x => x.c === 'Non-Moving' && x.v > 0);
  const slow = aging.filter(x => x.c === 'Slow-Moving' && x.v > 0);
  const idleCash = obsolete.concat(nonMoving, slow).reduce((s, x) => s + x.v, 0);

  const sbuScores = stock.map(x => {
    let score = 100;
    const issues = [];
    if (x.v < 0) {
      score -= 40;
      if (Math.abs(x.v) > 1e11) score -= 25;
      issues.push('Negative stock ' + fmt(x.v) + ' BDT' + (Math.abs(x.v) > 1e11 ? ' (systemic anomaly)' : ''));
    }
    const ag = findByKey(aging, x.s);
    let agingStatus = null, idleDays = null;
    if (ag) {
      agingStatus = ag.c;
      idleDays = ag.d;
      if (ag.c === 'Obsolete') { score -= 25; issues.push('Obsolete: ' + fmt(ag.v) + ' idle ' + ag.d + 'd'); }
      else if (ag.c === 'Non-Moving') { score -= 15; issues.push('Non-moving: ' + fmt(ag.v) + ' idle ' + ag.d + 'd'); }
      else if (ag.c === 'Slow-Moving') { score -= 8; issues.push('Slow-moving: ' + fmt(ag.v) + ' idle ' + ag.d + 'd'); }
    }
    const dr = findByKey(dioRows, x.s);
    let dioDays = null, turnover = null;
    if (dr) {
      turnover = +(dr.cogs / Math.max(Math.abs(dr.inv), 1)).toFixed(2);
      if (dr.dioDays !== null && isFinite(dr.dioDays) && dr.dioDays > 0 && dr.dioDays < 2000) {
        dioDays = Math.round(dr.dioDays);
        if (dioDays > 365) { score -= 20; issues.push('DIO ' + dioDays + 'd (high risk)'); }
        else if (dioDays > 120) { score -= 10; issues.push('DIO ' + dioDays + 'd (watch)'); }
      }
    }
    const prRow = findByKey(pr, x.s);
    let prPending = 0, prStale = false;
    if (prRow) {
      prPending = prRow.q;
      const ds = daysSince(prRow.d);
      if (ds !== null && ds > 90) {
        prStale = true;
        score -= 5;
        issues.push('PR pipeline stale ' + ds + 'd');
      }
    }
    return {
      sbu: x.s,
      score: Math.max(0, Math.min(100, Math.round(score))),
      stockValue: x.v,
      dioDays, turnover, agingStatus, idleDays, prPending, prStale,
      issues
    };
  });

  const ranked = sbuScores.slice().sort((a, b) => a.score - b.score);
  const critical = ranked.filter(x => x.score < 40);
  const watch = ranked.filter(x => x.score >= 40 && x.score < 70);
  const healthy = ranked.filter(x => x.score >= 70);
  const healthScore = Math.round(sbuScores.reduce((s, x) => s + x.score, 0) / Math.max(sbuScores.length, 1));
  const healthLabel = healthScore >= 75 ? 'Healthy' : healthScore >= 55 ? 'Moderate' : 'At Risk';

  const validDio = dioRows.filter(r => r.dioDays !== null && r.dioDays > 0 && r.dioDays < 2000);
  const avgDio = validDio.length ? Math.round(validDio.reduce((s, r) => s + r.dioDays, 0) / validDio.length) : null;

  const risks = [];
  neg.slice().sort((a, b) => a.v - b.v).forEach(x => risks.push({
    severity: 'CRITICAL', sbu: x.s,
    issue: 'Negative stock ' + fmt(x.v) + ' BDT',
    action: Math.abs(x.v) > 1e11
      ? 'Magnitude suggests systemic posting error — escalate to finance for immediate GL vs WMS reconciliation.'
      : 'Reconcile GL vs WMS: unposted GRNs, invoice timing or valuation error. Post corrections after warehouse count.'
  }));
  obsolete.forEach(x => risks.push({
    severity: 'HIGH', sbu: x.s,
    issue: 'Obsolete inventory ' + fmt(x.v) + ' BDT idle ' + x.d + ' days',
    action: 'Board approval for write-down/disposal; try inter-SBU transfer or distressed sale first.'
  }));
  nonMoving.filter(x => x.v > 1e7).forEach(x => risks.push({
    severity: 'HIGH', sbu: x.s,
    issue: 'Non-moving ' + fmt(x.v) + ' BDT idle ' + x.d + ' days',
    action: 'Verify demand; liquidate within 90 days before crossing the 365d obsolescence threshold.'
  }));
  dioRows.filter(r => r.dioDays && r.dioDays > 365 && r.dioDays < 2000).forEach(r => risks.push({
    severity: 'MEDIUM', sbu: r.s,
    issue: 'DIO ' + Math.round(r.dioDays) + ' days — capital locked (' + fmt(r.inv) + ' BDT)',
    action: 'Reduce reorder quantities; push sales campaigns to burn excess stock.'
  }));
  pr.filter(p => (daysSince(p.d) || 0) > 90).forEach(p => risks.push({
    severity: 'MEDIUM', sbu: p.s,
    issue: 'PR pipeline stale since ' + p.d + ' (' + fmt(p.q) + ' qty pending)',
    action: 'Re-validate requisitions; cancel obsolete PR lines to clean the pipeline.'
  }));

  const predictions = [];
  dioRows.filter(r => r.dioDays !== null && r.dioDays > 0 && r.dioDays < 30).forEach(r => {
    const prRow = findByKey(pr, r.s);
    if (prRow) predictions.push({
      sbu: r.s,
      prediction: 'Stock-out risk in ~' + Math.round(r.dioDays) + ' days at current COGS run-rate',
      basis: 'DIO ' + Math.round(r.dioDays) + 'd with active PR pipeline of ' + fmt(prRow.q) + ' qty — expedite fulfillment'
    });
  });
  aging.filter(x => (x.c === 'Slow-Moving' || x.c === 'Non-Moving') && x.v > 0 && x.d < 365).forEach(x => predictions.push({
    sbu: x.s,
    prediction: 'Will become Obsolete in ' + (365 - x.d) + ' days if no movement',
    basis: fmt(x.v) + ' BDT idle ' + x.d + 'd; movement needed before the 365d threshold'
  }));
  predictions.push({
    sbu: 'Group',
    prediction: 'Up to ' + fmt(idleCash) + ' BDT cash releasable from idle stock',
    basis: 'Obsolete + Non-moving + Slow-moving inventory across ' + (obsolete.length + nonMoving.length + slow.length) + ' SBUs'
  });

  const clearanceTotal = clearance.reduce((s, x) => s + (x.c || 0), 0);
  const clearanceSalary = clearance.reduce((s, x) => s + (x.sal || 0), 0);
  const prTotalQty = pr.reduce((s, x) => s + (x.q || 0), 0);
  const prTotalCount = pr.reduce((s, x) => s + (x.n || 0), 0);

  const recommendations = [];
  if (neg.length) recommendations.push({
    priority: 'P1', title: 'Reconcile negative stock (' + neg.length + ' SBUs)',
    impactValue: Math.abs(totalNeg),
    detail: 'Worst: ' + neg.slice().sort((a, b) => a.v - b.v).slice(0, 3).map(x => x.s + ' (' + fmt(x.v) + ')').join(', '),
    owner: 'Finance + Inventory'
  });
  if (obsolete.length) recommendations.push({
    priority: 'P1', title: 'Liquidate obsolete inventory',
    impactValue: obsolete.reduce((s, x) => s + x.v, 0),
    detail: obsolete.map(x => x.s + ': ' + fmt(x.v) + ' (' + x.d + 'd idle)').join('; '),
    owner: 'HOD + Finance'
  });
  if (nonMoving.length) recommendations.push({
    priority: 'P2', title: 'Dispose non-moving stock before it turns obsolete',
    impactValue: nonMoving.reduce((s, x) => s + x.v, 0),
    detail: nonMoving.map(x => x.s + ': ' + fmt(x.v) + ' (' + x.d + 'd idle)').join('; '),
    owner: 'SBU Heads'
  });
  const slowVal = slow.reduce((s, x) => s + x.v, 0);
  if (slow.length) recommendations.push({
    priority: 'P2', title: 'Activate slow-moving stock (discount / bundle / transfer)',
    impactValue: slowVal,
    detail: slow.map(x => x.s + ': ' + fmt(x.v) + ' (' + x.d + 'd idle)').join('; '),
    owner: 'Sales + SCM'
  });
  const worstDio = dioRows.filter(r => r.dioDays && r.dioDays > 120 && r.dioDays < 2000).sort((a, b) => b.dioDays - a.dioDays).slice(0, 3);
  if (worstDio.length) recommendations.push({
    priority: 'P2', title: 'DIO reduction program for top offenders',
    impactValue: worstDio.reduce((s, x) => s + x.inv, 0),
    detail: worstDio.map(r => r.s + ' (' + Math.round(r.dioDays) + 'd)').join(', ') + ' — target below 120 days',
    owner: 'SCM'
  });
  const stalePr = pr.filter(p => (daysSince(p.d) || 0) > 90);
  if (stalePr.length) recommendations.push({
    priority: 'P3', title: 'Clean stale PR pipeline',
    impactValue: stalePr.reduce((s, x) => s + x.q, 0),
    detail: stalePr.map(p => p.s + ' since ' + p.d).join('; '),
    owner: 'Procurement'
  });
  if (clearanceTotal > 0) recommendations.push({
    priority: 'P3', title: 'Clear employee clearance backlog (' + clearanceTotal.toLocaleString() + ' cases)',
    impactValue: clearanceSalary,
    detail: 'Top: ' + clearance.slice(0, 3).map(x => x.s + ' (' + x.c + ')').join(', ') + '. Salary exposure ' + fmt(clearanceSalary) + ' BDT/month.',
    owner: 'HR + Admin'
  });
  recommendations.sort((a, b) => b.impactValue - a.impactValue);

  return {
    generatedAt: new Date().toISOString(),
    source: d.source || 'snapshot',
    overall: {
      healthScore, healthLabel,
      activeSBUs: stock.length,
      positiveStock: totalPos, negativeStock: totalNeg,
      idleCash, avgDio,
      criticalSBUs: critical.length, watchSBUs: watch.length, healthySBUs: healthy.length
    },
    totals: { prTotalQty, prTotalCount, clearanceTotal, clearanceSalary },
    sbuScores: ranked,
    risks, predictions, recommendations
  };
}

export function formatReport(rep) {
  const o = rep.overall, t = rep.totals;
  const L = [];
  L.push('🤖 ARL INVENTORY AGENT — FULL ANALYSIS REPORT');
  L.push('Generated: ' + new Date(rep.generatedAt).toLocaleString() + ' | Source: ' + (rep.source === 'live' ? 'Live DWH' : 'DWH snapshot'));
  L.push('');
  L.push('1ï¸âƒ£ GROUP HEALTH: ' + o.healthScore + '/100 (' + o.healthLabel + ')');
  L.push('   • Active SBUs: ' + o.activeSBUs + '  (' + o.criticalSBUs + ' critical / ' + o.watchSBUs + ' watch / ' + o.healthySBUs + ' healthy)');
  L.push('   • Positive stock: ' + fmt(o.positiveStock) + ' BDT | Negative: ' + fmt(o.negativeStock) + ' BDT');
  L.push('   • Idle cash locked: ' + fmt(o.idleCash) + ' BDT | Avg DIO: ' + (o.avgDio === null ? 'n/a' : o.avgDio + 'd'));
  L.push('   • PR pipeline: ' + t.prTotalQty.toLocaleString() + ' qty / ' + t.prTotalCount.toLocaleString() + ' PRs (top SBUs)');
  L.push('   • Clearance backlog: ' + t.clearanceTotal.toLocaleString() + ' employees | Salary exposure: ' + fmt(t.clearanceSalary) + ' BDT/mo');
  L.push('');
  const crit = rep.sbuScores.filter(x => x.score < 70).slice(0, 8);
  if (crit.length) {
    L.push('2ï¸âƒ£ SBUs NEEDING ATTENTION (lowest health scores)');
    crit.forEach(x => L.push('   • ' + x.sbu + ' — ' + x.score + '/100' + (x.issues.length ? ' — ' + x.issues.join('; ') : '')));
    L.push('');
  }
  L.push('3ï¸âƒ£ RISKS (' + rep.risks.length + ')');
  rep.risks.slice(0, 10).forEach(r => L.push('   [' + r.severity + '] ' + r.sbu + ': ' + r.issue + '\n      â†’ ' + r.action));
  L.push('');
  L.push('4ï¸âƒ£ PREDICTIONS');
  rep.predictions.slice(0, 8).forEach(p => L.push('   • ' + p.sbu + ': ' + p.prediction + '\n      basis: ' + p.basis));
  L.push('');
  L.push('5ï¸âƒ£ PRIORITIZED ACTION PLAN');
  rep.recommendations.forEach((r, i) => L.push('   ' + r.priority + '.' + (i + 1) + ' ' + r.title + ' (impact: ' + fmt(r.impactValue) + ' BDT)\n      ' + r.detail + '  [Owner: ' + r.owner + ']'));
  L.push('');
  L.push('— ARL Inventory AI Agent | Akij Resource Limited | Inventory Material Department (Demand & Supply)');
  return L.join('\n');
}

function findSBUInQuestion(ql, stock) {
  const tokCount = {};
  stock.forEach(x => nameKey(x.s).split(' ').forEach(w => {
    if (w.length >= 4) tokCount[w] = (tokCount[w] || 0) + 1;
  }));
  let best = null, bestHits = 0;
  for (const x of stock) {
    const toks = [...new Set(nameKey(x.s).split(' ').filter(w => w.length >= 4 && tokCount[w] === 1))];
    const hits = toks.filter(w => new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(ql)).length;
    if (hits > bestHits) { bestHits = hits; best = x; }
  }
  return bestHits > 0 ? best : null;
}

function aSBU(d, rep, x) {
  const sc = rep.sbuScores.find(s => keyMatch(s.sbu, x.s)) || { score: null, issues: [] };
  const dr = findByKey((d.dio || []).map(r => ({ s: r.s, inv: r.inv, cogs: r.cogs })), x.s);
  const prRow = findByKey(d.pr || [], x.s);
  const L = [];
  L.push('🏭 ' + x.s + ' — ' + (sc.score !== null ? 'Health Score ' + sc.score + '/100 (' + (sc.score >= 70 ? 'Healthy' : sc.score >= 40 ? 'Watch' : 'Critical') + ')' : 'no score'));
  L.push('   • Stock value: ' + fmt(x.v) + ' BDT (' + (x.v >= 0 ? 'Positive' : 'NEGATIVE âš ï¸') + ')');
  if (sc.dioDays !== null && sc.dioDays !== undefined) L.push('   • DIO: ' + sc.dioDays + 'd | Turnover: ' + sc.turnover + 'x');
  if (sc.agingStatus) L.push('   • Aging: ' + sc.agingStatus + (sc.idleDays ? ' (' + sc.idleDays + 'd idle)' : ''));
  if (prRow) L.push('   • PR pending: ' + prRow.q.toLocaleString() + ' qty across ' + prRow.n.toLocaleString() + ' PRs (last: ' + prRow.d + (sc.prStale ? ' — STALE âš ï¸' : '') + ')');
  if (sc.issues.length) L.push('   • Issues: ' + sc.issues.join('; '));
  const adv = sc.score >= 70 ? 'Status OK — maintain current controls.' : sc.issues.length ? 'Advice: ' + (sc.issues[0].indexOf('Negative') === 0 ? 'reconcile stock with finance immediately.' : 'address the flagged issue this month.') : 'monitor closely.';
  L.push('   • ' + adv);
  return L.join('\n');
}

function aSummary(d, rep) {
  const o = rep.overall, t = rep.totals;
  const L = [];
  L.push('📊 ARL INVENTORY — EXECUTIVE SUMMARY');
  L.push('Group health score: ' + o.healthScore + '/100 (' + o.healthLabel + ')');
  L.push('');
  L.push('• Active SBUs: ' + o.activeSBUs + ' (' + o.criticalSBUs + ' critical, ' + o.watchSBUs + ' watch, ' + o.healthySBUs + ' healthy)');
  L.push('• Positive stock: ' + fmt(o.positiveStock) + ' BDT');
  L.push('• Negative stock: ' + fmt(o.negativeStock) + ' BDT' + (o.negativeStock < -1e11 ? ' — dominated by the Akij Essentials anomaly' : ' — reconciliation needed'));
  L.push('• Idle cash locked (slow/non-moving/obsolete): ' + fmt(o.idleCash) + ' BDT');
  L.push('• Avg DIO: ' + (o.avgDio === null ? 'n/a' : o.avgDio + ' days'));
  L.push('• PR pipeline (top SBUs): ' + t.prTotalQty.toLocaleString() + ' qty / ' + t.prTotalCount.toLocaleString() + ' PRs');
  L.push('• Clearance backlog: ' + t.clearanceTotal.toLocaleString() + ' employees (' + fmt(t.clearanceSalary) + ' BDT/mo salary exposure)');
  L.push('');
  L.push('🎯 #1 action: ' + (rep.recommendations[0] ? rep.recommendations[0].title + ' — impact ' + fmt(rep.recommendations[0].impactValue) + ' BDT' : 'maintain current controls'));
  return L.join('\n');
}

function aAging(d, rep) {
  const aging = (d.aging || []).slice().sort((a, b) => (b.d || 0) - (a.d || 0));
  const L = ['â³ IDLE INVENTORY ANALYSIS'];
  ['Obsolete', 'Non-Moving', 'Slow-Moving'].forEach(cat => {
    const rows = aging.filter(x => x.c === cat);
    if (!rows.length) { L.push('• ' + cat + ': none'); return; }
    const val = rows.reduce((s, x) => s + Math.max(x.v, 0), 0);
    const negRows = rows.filter(x => x.v < 0).length;
    L.push('• ' + cat + ': ' + rows.length + ' SBU(s), ' + fmt(val) + ' BDT' + (negRows ? ' (+' + negRows + ' negative-value item(s) excluded — reconciliation issue)' : ''));
    rows.forEach(x => L.push('    - ' + x.s + ': ' + fmt(x.v) + ' (' + x.d + 'd idle)' + (x.v < 0 ? ' âš ï¸ negative value' : '')));
  });
  L.push('');
  L.push('💰 Cash locked in idle stock: ' + fmt(rep.overall.idleCash) + ' BDT');
  return L.join('\n');
}

function aDIO(d, rep) {
  const rows = (d.dio || []).map(x => ({
    s: x.s,
    dioDays: x.cogs > 0 ? (x.inv / x.cogs) * 365 : null,
    turnover: x.cogs / Math.max(Math.abs(x.inv), 1)
  })).filter(r => r.dioDays !== null).sort((a, b) => b.dioDays - a.dioDays);
  const L = ['📈 DIO & TURNOVER RATIO (YTD 2026)'];
  rows.forEach(r => {
    const flag = r.dioDays > 365 ? ' âš ï¸ HIGH' : r.dioDays > 120 ? ' âš ï¸ watch' : ' âœ“';
    L.push('• ' + r.s + ': ' + Math.round(r.dioDays) + 'd | ' + r.turnover.toFixed(2) + 'x' + flag);
  });
  L.push('');
  L.push('Avg DIO: ' + (rep.overall.avgDio === null ? 'n/a' : rep.overall.avgDio + 'd') + ' | Benchmark: <120 days healthy');
  return L.join('\n');
}

function aPR(d) {
  const pr = (d.pr || []).slice().sort((a, b) => (b.q || 0) - (a.q || 0));
  const L = ['📋 PR PIPELINE — TOP SBUs BY PENDING QTY'];
  pr.forEach((x, i) => {
    const ds = daysSince(x.d);
    L.push((i + 1) + '. ' + x.s + ': ' + x.q.toLocaleString() + ' qty | ' + x.n.toLocaleString() + ' PRs | ' + x.it.toLocaleString() + ' items | last: ' + x.d + (ds > 90 ? ' âš ï¸ stale (' + ds + 'd)' : ''));
  });
  const totQ = pr.reduce((s, x) => s + x.q, 0), totN = pr.reduce((s, x) => s + x.n, 0);
  L.push('');
  L.push('Total (top ' + pr.length + '): ' + totQ.toLocaleString() + ' qty across ' + totN.toLocaleString() + ' PRs');
  return L.join('\n');
}

function aClearance(d) {
  const cl = (d.clearance || []).slice().sort((a, b) => (b.c || 0) - (a.c || 0));
  const tot = cl.reduce((s, x) => s + (x.c || 0), 0);
  const sal = cl.reduce((s, x) => s + (x.sal || 0), 0);
  const L = ['👥 EMPLOYEE CLEARANCE PENDING (PeopleDesk)'];
  L.push('Total: ' + tot.toLocaleString() + ' cases across ' + cl.length + ' companies | Salary exposure: ' + fmt(sal) + ' BDT/month');
  L.push('');
  cl.slice(0, 10).forEach((x, i) => L.push((i + 1) + '. ' + x.s + ': ' + x.c + ' cases (' + fmt(x.sal) + ' BDT/mo)'));
  if (cl.length > 10) L.push('… and ' + (cl.length - 10) + ' more companies');
  return L.join('\n');
}

function aRisks(rep) {
  const L = ['âš ï¸ TOP RISKS (by severity)'];
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
  rep.risks.slice().sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3)).slice(0, 12).forEach(r => {
    L.push('[' + r.severity + '] ' + r.sbu + ': ' + r.issue);
    L.push('   â†’ ' + r.action);
  });
  if (!rep.risks.length) L.push('No material risks detected. âœ“');
  return L.join('\n');
}

function aPredict(rep) {
  const L = ['🔮 PREDICTIONS'];
  rep.predictions.forEach(p => {
    L.push('• ' + p.sbu + ': ' + p.prediction);
    L.push('   basis: ' + p.basis);
  });
  return L.join('\n');
}

function aRecommend(rep) {
  const L = ['🎯 RECOMMENDED ACTION PLAN (by value impact)'];
  rep.recommendations.forEach((r, i) => {
    L.push((i + 1) + '. [' + r.priority + '] ' + r.title + ' — impact ' + fmt(r.impactValue) + ' BDT');
    L.push('   ' + r.detail);
    L.push('   Owner: ' + r.owner);
  });
  return L.join('\n');
}

function aTop(d, rep, worst) {
  if (worst) {
    const L = ['🚨 WORST SBUs (lowest health scores)'];
    rep.sbuScores.slice(0, 5).forEach((x, i) => L.push((i + 1) + '. ' + x.sbu + ' — ' + x.score + '/100' + (x.issues.length ? ' — ' + x.issues.join('; ') : '')));
    return L.join('\n');
  }
  const L = ['🏆 TOP PERFORMERS'];
  const topVal = (d.stock || []).slice().sort((a, b) => b.v - a.v).slice(0, 5);
  L.push('By stock value:');
  topVal.forEach((x, i) => L.push((i + 1) + '. ' + x.s + ': ' + fmt(x.v) + ' BDT'));
  const topScore = rep.sbuScores.slice().reverse().slice(0, 5);
  L.push('');
  L.push('By health score:');
  topScore.forEach((x, i) => L.push((i + 1) + '. ' + x.sbu + ': ' + x.score + '/100'));
  return L.join('\n');
}

function aNegative(d) {
  const neg = (d.stock || []).filter(x => x.v < 0).sort((a, b) => a.v - b.v);
  const tot = neg.reduce((s, x) => s + x.v, 0);
  const L = ['🚨 NEGATIVE STOCK — ' + neg.length + ' SBUs'];
  neg.forEach((x, i) => L.push((i + 1) + '. ' + x.s + ': ' + fmt(x.v) + ' BDT'));
  L.push('');
  L.push('Impact: ' + fmt(tot) + ' BDT distortion on group inventory.');
  L.push('Action: reconcile GL journals vs WMS movements — check unposted GRNs, invoice timing and valuation postings.');
  return L.join('\n');
}

const HELP = [
  '🤖 ARL INVENTORY AI AGENT — I can answer questions like:',
  '• "Executive summary" / "How are we doing?"',
  '• "What is the DIO of Akij Cement?" / "DIO analysis"',
  '• "Which stock is obsolete?" / "slow moving items"',
  '• "Negative stock" / "Top risks" / "Predictions"',
  '• "PR pipeline" / "pending requisitions"',
  '• "Employee clearance status"',
  '• "Recommendations" / "What should we do?"',
  '• "Top performers" / "Worst SBUs"',
  '',
  'Tip: mention any SBU name (e.g. "Akij Ispat", "cement", "essentials") for a full SBU profile.'
].join('\n');

export function askAgent(d, q) {
  const question = String(q || '').trim();
  const ql = question.toLowerCase();
  const rep = analyzeInventory(d);
  let intent = 'unknown', answer = dontKnow(question);

  const sbu = findSBUInQuestion(ql, d.stock || []);
  if (sbu && !/^(help|what can you)/.test(ql)) {
    intent = 'sbu-profile';
    answer = aSBU(d, rep, sbu);
  } else if (/^(hi|hello|hey|assalamu|salam|good (morning|afternoon|evening)|how are you|how do you do|thanks|thank you|bye|goodbye)\b/.test(ql)) {
    intent = 'greet'; answer = aGreet(ql);
  } else if (/help|what can you do|capabilities|how do you work|who are you/.test(ql)) {
    intent = 'help'; answer = HELP;
  } else if (/negative|below zero/.test(ql)) {
    intent = 'negative'; answer = aNegative(d);
  } else if (/obsolete|non.?moving|slow|aging|idle|old stock/.test(ql)) {
    intent = 'aging'; answer = aAging(d, rep);
  } else if (/\bdio\b|days inventory|turnover|holding days|stock days/.test(ql)) {
    intent = 'dio'; answer = aDIO(d, rep);
  } else if (/\bpr\b|\bprs\b|requisition|purchase request/.test(ql)) {
    intent = 'pr'; answer = aPR(d);
  } else if (/clearance|resign|people.?desk|employee/.test(ql)) {
    intent = 'clearance'; answer = aClearance(d);
  } else if (/predict|forecast|stock.?out|out of stock|will run|cover/.test(ql)) {
    intent = 'predict'; answer = aPredict(rep);
  } else if (/risk|alert|warn|problem|danger|issue/.test(ql)) {
    intent = 'risk'; answer = aRisks(rep);
  } else if (/recommend|action|advice|suggest|improve|plan|what should|next step/.test(ql)) {
    intent = 'recommend'; answer = aRecommend(rep);
  } else if (/worst|poor|weakest|bad sbu/.test(ql)) {
    intent = 'worst'; answer = aTop(d, rep, true);
  } else if (/top|best|highest|biggest|largest|performer/.test(ql)) {
    intent = 'top'; answer = aTop(d, rep, false);
  } else if (/summary|overview|status|health|how are|report|kpi|situation/.test(ql)) {
    intent = 'summary'; answer = aSummary(d, rep);
  }

  return {
    question,
    intent,
    answer,
    generatedAt: new Date().toISOString(),
    source: d.source || 'snapshot'
  };
}

function dontKnow(q) {
  const L = [];
  L.push('🤖 I did not understand that question.');
  L.push('');
  L.push('You asked: "' + String(q || '').substring(0, 120) + '"');
  L.push('');
  L.push('I can help you with ARL Inventory & Warehouse Management. Try asking:');
  L.push('• "Executive summary" — group health, stock, DIO, risks');
  L.push('• "What is the DIO of Akij Cement?" — any SBU profile');
  L.push('• "Which stock is obsolete?" / "aging analysis"');
  L.push('• "Negative stock" / "top risks" / "recommendations"');
  L.push('• "PR pipeline" / "clearance status" / "predictions"');
  L.push('• "Top performers" / "worst SBUs"');
  L.push('');
  L.push('Or type "help" to see all capabilities.');
  return L.join('\n');
}

function aGreet(ql) {
  const L = [];
  L.push('Assalamu Alaikum! 👋');
  L.push('');
  if (/how are you|how do you do/.test(ql)) {
    L.push('I am doing great, thank you! I am monitoring ARL inventory 24/7 across all SBUs.');
  } else if (/thanks|thank you/.test(ql)) {
    L.push('You are most welcome! Ask me anytime about ARL inventory or warehouse management.');
  } else if (/bye|goodbye/.test(ql)) {
    L.push('Goodbye! I will be here whenever you need me. Take care!');
  } else {
    L.push('I am the AI Agent of ARL Inventory Management.');
  }
  L.push('');
  L.push('You can ask me about:');
  L.push('• Inventory Management — stock, DIO, aging, turnover');
  L.push('• Warehouse Management — space, warehouses, plants');
  L.push('• Procurement — PR pipeline, approvals, reorder levels');
  L.push('• Risks & recommendations — negative stock, obsolete, stock-outs');
  L.push('');
  L.push('Type "help" to see all things I can do, or just ask!');
  return L.join('\n');
}
