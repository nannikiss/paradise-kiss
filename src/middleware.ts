import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if ((path.startsWith('/panel') || path.startsWith('/admin')) && !user) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }

  if (path.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id, is_suspended, roles(is_staff)')
      .eq('id', user.id)
      .single();

    const isStaff = (profile?.roles as { is_staff?: boolean } | null)?.is_staff;
    if (!profile || profile.is_suspended || !isStaff) {
      return NextResponse.redirect(new URL('/panel', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/panel/:path*', '/admin/:path*'],
};
