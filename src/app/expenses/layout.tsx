import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';

export default async function ExpensesLayout({ children }: { children: ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/expenses');
  }

  await ensureUserRecord(user);

  return <>{children}</>;
}
