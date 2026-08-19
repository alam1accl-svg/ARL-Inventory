import { getControlTowerData, askAgent, analyzeInventory, formatReport } from '../lib/agent.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  try {
    const url = new URL(req.url, 'https://' + (req.headers.host || 'localhost'));
    const q = url.searchParams.get('q');
    const mode = url.searchParams.get('mode');
    const data = await getControlTowerData();
    if (q) {
      const a = askAgent(data, q);
      res.status(200).json(a);
    } else if (mode === 'raw') {
      res.status(200).json(analyzeInventory(data));
    } else {
      const rep = analyzeInventory(data);
      res.status(200).json({ report: rep, reportText: formatReport(rep), source: data.source });
    }
  } catch (e) {
    console.error('agent error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
