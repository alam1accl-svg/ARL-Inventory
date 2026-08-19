import { Readable } from 'node:stream';
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

import { getControlTowerData, analyzeInventory, askAgent } from '../lib/agent.mjs';

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

  server.registerTool(
    'getInventoryAgentInsights',
    {
      title: 'Get ARL Inventory AI Agent Insights',
      description:
        'Get the AI inventory agent full analysis: group health score, per-SBU risk scores, prioritized risks (negative stock, obsolescence, high DIO, stale PRs), predictions (stock-out risk, obsolescence trajectory, cash release potential) and a prioritized action plan for Akij Resource Limited.',
      inputSchema: z.object({}),
    },
    async () => {
      const data = await getControlTowerData();
      const rep = analyzeInventory(data);
      return {
        content: [{ type: 'text', text: JSON.stringify(rep, null, 2) }],
      };
    },
  );

  server.registerTool(
    'askInventoryAgent',
    {
      title: 'Ask the ARL Inventory AI Agent',
      description:
        'Ask the ARL Inventory AI Agent a natural language question about Akij Resource Limited inventory. Examples: "executive summary", "what is the DIO of Akij Cement?", "which stock is obsolete?", "top risks", "recommendations", "status of Akij Ispat".',
      inputSchema: z.object({
        question: z.string().describe('Natural language question about inventory, stock, aging, DIO, PRs, clearance, risks or recommendations'),
      }),
    },
    async ({ question }) => {
      const data = await getControlTowerData();
      const a = askAgent(data, question);
      return {
        content: [{ type: 'text', text: a.answer + '\n\n[intent: ' + a.intent + ' | source: ' + a.source + ' | ' + a.generatedAt + ']' }],
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
