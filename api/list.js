import { list } from '@vercel/blob';

export default async function handler(req, res) {
  try {
    const { blobs } = await list({ prefix: 'uploads/' });
    const items = blobs
      .map((b) => {
        const base = b.pathname.replace(/^uploads\//, '');
        const m = base.match(/^(\d+)-(.*)$/);
        // blob URL はクライアントに一切返さない(閲覧は /api/view?p= 経由のみ)
        return {
          name: m ? m[2] : base,
          pathname: b.pathname,
          size: b.size,
          uploadedAt: b.uploadedAt,
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err?.message || '一覧の取得に失敗しました' });
  }
}
