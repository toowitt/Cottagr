import { createServerSupabaseActionClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import { requirePropertyMembership, PropertyMembershipWithRelations } from '@/lib/auth/propertyMembership';

export class ActionAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function getActionUserRecord() {
  const supabase = await createServerSupabaseActionClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);

  const user = userData?.user ?? null;
  if (!user || !user.email) {
    throw new ActionAuthError('Unauthorized');
  }

  const userRecord = await ensureUserRecord(user);
  if (!userRecord) {
    throw new ActionAuthError('Unauthorized');
  }

  return userRecord;
}

export async function ensureActionPropertyMembership(propertyId: number): Promise<PropertyMembershipWithRelations> {
  const userRecord = await getActionUserRecord();
  return requirePropertyMembership(userRecord.id, propertyId);
}
