import { NextResponse } from 'next/server';
import { createRouteSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { claimInviteByToken, InviteClaimError } from '@/lib/auth/claimInvite';
import { verifyInvite } from '@/server/lib/invites/signing';

const SIGNED_FLAG_ENABLED = process.env.FEATURE_SIGNED_INVITES === 'true';

export async function POST(request: Request) {
  const url = new URL(request.url);
  const tokenSignedQuery = url.searchParams.get('tokenSigned')?.trim() ?? '';

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token.trim() : '';
  const tokenSignedBody = typeof body?.tokenSigned === 'string' ? body.tokenSigned.trim() : '';

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(error);

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const signedToken = tokenSignedQuery || tokenSignedBody;

  if (SIGNED_FLAG_ENABLED && signedToken) {
    const secret = process.env.INVITE_TOKEN_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Signed invite secret not configured' }, { status: 500 });
    }

    try {
      const payload = verifyInvite(signedToken, secret);

      if (payload.sub && payload.sub.toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json({ error: 'Invite token does not belong to this user' }, { status: 403 });
      }

      if (!payload.nonce) {
        return NextResponse.json({ error: 'Signed invite missing correlation id' }, { status: 400 });
      }

      const { membership, alreadyClaimed } = await claimInviteByToken(payload.nonce, user.id, user.email);
      return NextResponse.json({ membership, alreadyClaimed, tokenType: 'signed' });
    } catch (error) {
      if (error instanceof InviteClaimError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }

      console.warn('Signed invite verification failed', error);
      return NextResponse.json({ error: 'Invalid signed invite' }, { status: 401 });
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const { membership, alreadyClaimed } = await claimInviteByToken(token, user.id, user.email);
    return NextResponse.json({ membership, alreadyClaimed, tokenType: 'opaque' });
  } catch (error) {
    if (error instanceof InviteClaimError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Invite claim failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
