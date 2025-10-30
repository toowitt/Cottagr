import { createRouteSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';

export class RouteAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const UnauthorizedError = new RouteAuthError('Unauthorized', 401);
export const ForbiddenError = new RouteAuthError('Forbidden', 403);

export async function getRouteUserRecord() {
  const supabase = await createRouteSupabaseClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);

  const user = userData?.user ?? null;
  if (!user) {
    throw UnauthorizedError;
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    throw UnauthorizedError;
  }

  return userRecord;
}

export function assertPropertyAccess(userRecord: Awaited<ReturnType<typeof ensureUserRecord>>, propertyId: number) {
  const memberships = userRecord?.memberships ?? [];
  const match = memberships.find((membership) => membership.propertyId === propertyId);
  if (!match) {
    throw ForbiddenError;
  }
  return match;
}

export function getAccessiblePropertyIds(userRecord: Awaited<ReturnType<typeof ensureUserRecord>>) {
  return new Set((userRecord?.memberships ?? []).map((membership) => membership.propertyId));
}
