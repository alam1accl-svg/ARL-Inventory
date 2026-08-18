import { fetchAll, SNAPSHOT } from '../lib/data.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  try {
    const data = await fetchAll();
    res.status(200).json(data);
  } catch (e) {
    console.error('data fetch error:', e.message, '- serving snapshot');
    const snap = JSON.parse(JSON.stringify(SNAPSHOT));
    snap.generatedAt = new Date().toISOString();
    res.status(200).json({ ...snap, source: 'snapshot' });
  }
}
