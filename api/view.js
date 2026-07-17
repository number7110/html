import { get } from '@vercel/blob';

// アップロードされたHTMLを自ドメイン経由で配信する。
// Blob は private ストアに保存されており公開URLが存在しないため、
// 閲覧は必ずこのエンドポイント = Basic認証(middleware) の内側に限定される。
export default async function handler(req, res) {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const p = reqUrl.searchParams.get('p');
    // uploads/ 配下の安全なpathnameのみ許可
    if (!p || !/^uploads\/[\w.\-]{1,120}$/.test(p)) {
      res.status(400).send('Invalid path');
      return;
    }
    const result = await get(p, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      res.status(404).send('コンテンツが見つかりません');
      return;
    }
    const html = await new Response(result.stream).text();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // アップロードコンテンツはサンドボックス下で表示（プレゼン用に script/forms 等は許可）
    res.setHeader(
      'Content-Security-Policy',
      "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-downloads"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send('表示に失敗しました');
  }
}
