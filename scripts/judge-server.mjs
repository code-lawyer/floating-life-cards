import http from 'node:http';

const port = Number(process.env.JUDGE_PORT || 8787);
const host = process.env.JUDGE_HOST || '127.0.0.1';
const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const model = process.env.LLM_MODEL || '';
const apiKey = process.env.LLM_API_KEY || '';
const allowedOrigins = new Set(
  (process.env.JUDGE_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',').map((value) => value.trim()).filter(Boolean),
);
const requests = new Map();

function corsHeaders(origin) {
  const allowed = allowedOrigins.has(origin) ? origin : '';
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': allowed } : {}),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Origin',
  };
}

function send(response, status, payload, origin = '') {
  response.writeHead(status, corsHeaders(origin));
  response.end(JSON.stringify(payload));
}

function allowRequest(address) {
  const now = Date.now();
  const recent = (requests.get(address) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 30) return false;
  recent.push(now);
  requests.set(address, recent);
  return true;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 32_768) {
        reject(new Error('BODY_TOO_LARGE'));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('INVALID_JSON')); }
    });
    request.on('error', reject);
  });
}

function promptFor(payload) {
  const card = payload?.card || {};
  const intent = payload?.intent || {};
  return [
    `章节：${String(payload?.chapter || '').slice(0, 80)}`,
    `局面：${String(payload?.situation || '').slice(0, 300)}`,
    `玩家打出：${String(card.title || '').slice(0, 80)}（${String(card.approach || '')}）`,
    `这张牌的记忆：${String(card.memory || '').slice(0, 240)}`,
    `世界打出：${String(intent.title || '').slice(0, 80)}（${String(intent.approach || '')}）`,
    `世界牌含义：${String(intent.text || '').slice(0, 200)}`,
    '',
    '写一段不超过70个汉字的克制现实主义叙述，描述这段旧记忆如何被带进当前局面。不要宣布输赢，不要Markdown，不要引号。',
  ].join('\n');
}

function extractText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((item) => item?.text || '').join('');
  return '';
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin || '';
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders(origin));
    response.end();
    return;
  }
  if (request.method !== 'POST' || request.url !== '/judge') {
    send(response, 404, { error: 'Only POST /judge is available.' }, origin);
    return;
  }
  if (!allowedOrigins.has(origin)) {
    send(response, 403, { error: 'Origin is not allowed. Set JUDGE_ALLOWED_ORIGINS if needed.' }, origin);
    return;
  }
  if (!allowRequest(request.socket.remoteAddress || 'unknown')) {
    send(response, 429, { error: 'Too many requests. Try again in one minute.' }, origin);
    return;
  }
  if (!apiKey || !model) {
    send(response, 503, { error: 'Set LLM_API_KEY and LLM_MODEL before starting the judge.' }, origin);
    return;
  }
  try {
    const payload = await readJson(request);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let upstream;
    try {
      upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          max_tokens: 120,
          messages: [
            { role: 'system', content: '你是《浮生牌局》的叙事裁判。语言克制、具体、现实，不评价玩家。' },
            { role: 'user', content: promptFor(payload) },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!upstream.ok) {
      send(response, 502, { error: `LLM upstream returned ${upstream.status}.` }, origin);
      return;
    }
    const result = await upstream.json();
    const text = extractText(result).replace(/[\r\n#*_`]/g, ' ').trim().slice(0, 140);
    if (!text) {
      send(response, 502, { error: 'LLM upstream returned no text.' }, origin);
      return;
    }
    send(response, 200, { text }, origin);
  } catch (error) {
    const message = error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'Request body is too large.' : 'Judge request failed.';
    send(response, 400, { error: message }, origin);
  }
});

server.listen(port, host, () => {
  console.log(`Floating Life judge listening at http://${host}:${port}/judge`);
  if (!apiKey || !model) console.log('Set LLM_API_KEY and LLM_MODEL, then restart this command.');
  console.log(`Allowed browser origins: ${[...allowedOrigins].join(', ')}`);
});
