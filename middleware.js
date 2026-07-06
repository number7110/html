export const config = { matcher: '/:path*' };

export default function middleware(request) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  const auth = request.headers.get('authorization');
  if (user && pass && auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded === btoa(`${user}:${pass}`)) {
      return; // 認証OK: 静的ファイルへ通す
    }
  }
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ai-native-sapling"' },
  });
}
