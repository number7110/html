import { put } from '@vercel/blob';

// 生のリクエストボディを受け取りたいので Vercel の bodyParser を無効化
export const config = { api: { bodyParser: false } };

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function sanitizeFilename(name) {
  const base = String(name || 'untitled').split(/[\\/]/).pop();
  let safe = base.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').replace(/^[_.]+/, '');
  if (!safe) safe = 'untitled';
  if (!/\.html?$/i.test(safe)) safe += '.html';
  return safe.slice(0, 100);
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BYTES) {
      const err = new Error('File too large');
      err.statusCode = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filename = sanitizeFilename(url.searchParams.get('filename'));
    const body = await readBody(req);
    if (!body || body.length === 0) {
      res.status(400).json({ error: 'アップロードするファイルが空です' });
      return;
    }
    // タイムスタンプ接頭辞で一意化＆時系列ソート可能に
    const pathname = `uploads/${Date.now()}-${filename}`;
    const blob = await put(pathname, body, {
      access: 'private',
      contentType: 'text/html; charset=utf-8',
      addRandomSuffix: false,
    });
    // 公開URLは存在しない(privateストア)。閲覧は必ず /api/view?p=<pathname> 経由。
    res.status(200).json({ ok: true, name: filename, pathname: blob.pathname, viewPath: '/api/view?p=' + encodeURIComponent(blob.pathname) });
  } catch (err) {
    const status = err?.statusCode || 500;
    const message = status === 413 ? 'ファイルが大きすぎます（最大5MB）' : (err?.message || 'アップロードに失敗しました');
    res.status(status).json({ error: message });
  }
}
