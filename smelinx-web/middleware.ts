import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = { matcher: ["/dashboard/:path*"] };

export function middleware(req: NextRequest) {
  const smx = req.cookies.get("smx")?.value; // presence flag set only on login
  if (!smx) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}
