// アップロードされたHTMLを自ドメイン経由で配信する。
// これにより Blob の公開URLを直接晒さず、閲覧も Basic認証(middleware) の内側に留める。
export default async function handler(req, res) {
  try {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const target = reqUrl.searchParams.get('u');
    if (!target) {
      res.status(400).send('Missing url');
      return;
    }
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      res.status(400).send('Invalid url');
      return;
    }
    // Vercel Blob の公開ストレージ以外は拒否（SSRF対策）
    if (parsed.protocol !== 'https:' || !/(^|\.)blob\.vercel-storage\.com$/.test(parsed.hostname)) {
      res.status(400).send('Forbidden url');
      return;
    }
    const upstream = await fetch(parsed.toString());
    if (!upstream.ok) {
      res.status(502).send('コンテンツの取得に失敗しました');
      return;
    }
    const html = await upstream.text();
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
