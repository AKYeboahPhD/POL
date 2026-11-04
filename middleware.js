import { NextResponse } from 'next/server';
export function middleware(req) {
  const h = req.headers.get('authorization') || '';
  const [u, p] = h.startsWith('Basic ') ? atob(h.slice(6)).split(':') : [];
  if (u === process.env.ADMIN_USER && p === process.env.ADMIN_PASSWORD) return NextResponse.next();
  return new NextResponse('Admin login required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Gather admin"' } });
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
