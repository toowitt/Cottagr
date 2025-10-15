import { NextRequest, NextResponse } from 'next/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { createRouteSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';

const getBearerToken = (authorization: string | null) => {
  if (!authorization) {
    return null;
  }
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabaseClient();
    const accessToken = getBearerToken(request.headers.get('authorization'));

    const {
      data: userData,
      error: userError,
    } = accessToken ? await supabase.auth.getUser(accessToken) : await supabase.auth.getUser();

    if (accessToken && userError) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!accessToken) {
      handleSupabaseAuthError(userError);
    }
    const user = userData?.user ?? null;

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRecord = await ensureUserRecord(user);

    if (!userRecord) {
      return NextResponse.json({ error: 'Could not ensure user record' }, { status: 500 });
    }

    return NextResponse.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to ensure user record';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
