import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerEnv } from "@/lib/supabase/env";

const protectedPrefixes = ["/dashboard", "/setup", "/unlock"];
const authPaths = ["/login", "/register"];

function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let supabaseUrl: string;
  let publishableKey: string;

  try {
    const config = getSupabaseServerEnv();
    supabaseUrl = config.url;
    publishableKey = config.publishableKey;
  } catch (error) {
    console.error("Supabase Auth configuration failure:", error);
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headersToSet).forEach(([name, value]) =>
          response.headers.set(name, value)
        );
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (
      isProtectedPath(request.nextUrl.pathname) &&
      (error || !data?.claims)
    ) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (
      !error &&
      data?.claims &&
      authPaths.includes(request.nextUrl.pathname)
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch (error) {
    console.error("Supabase session verification failed:", error);
    if (isProtectedPath(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return response;
}
