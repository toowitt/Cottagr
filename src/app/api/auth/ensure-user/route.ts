import { NextResponse } from 'next/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { createRouteSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createRouteSupabaseClient();
    const {
      data: userData,
      error: userError,
    } = await supabase.auth.getUser();
    handleSupabaseAuthError(userError);
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
