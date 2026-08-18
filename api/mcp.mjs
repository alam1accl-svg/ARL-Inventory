import { Readable } from 'node:stream';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

import { fetchAll, SNAPSHOT } from '../lib/data.mjs';

async function getControlTowerData() {
  try {
    const data = await fetchAll();
    return { ...data, source: 'live' };
  } catch (e) {
    const snap = JSON.parse(JSON.stringify(SNAPSHOT));
    snap.generatedAt = new Date().toISOString();
    return { ...snap, source: 'snapshot' };
  }
}

const mcpHandler = createMcpHandler((server) => {
  server.registerTool(
    'getControlTowerData',
    {
      title: 'Get ARL Inventory Control Tower Data',
      description:
        'Get live ARL Inventory Control Tower dashboard data from Akij Resource Limited: closing stock by SBU, top PR pending, inventory aging buckets, DIO & turnover ratios, and pending employee clearances.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await getControlTowerData();
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    },
  );
});

export default async function handler(req, res) {
  try {
    const baseURL = 'https://' + (req.headers.host || 'arl-control-tower.vercel.app');
    const url = new URL(req.url, baseURL);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers || {})) {
      if (v === undefined) continue;
      if (Array.isArray(v)) v.forEach((x) => headers.append(k, String(x)));
      else headers.set(k, String(v));
    }
    let body;
    if (req.method === 'POST' || req.method === 'PUT') {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      body = Buffer.concat(chunks);
    }
    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: body && body.length ? body : undefined,
    });
    const webRes = await mcpHandler(webReq);
    res.statusCode = webRes.status;
    webRes.headers.forEach((v, k) => res.setHeader(k, v));
    if (webRes.body) {
      Readable.fromWeb(webRes.body).pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    console.error('mcp handler error:', e);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify({ error: e.message }));
  }
}
