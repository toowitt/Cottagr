'use client';

import { useState } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import type { Session } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SupabaseProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode;
  initialSession?: Session | null;
}) {
  const [supabaseClient] = useState(() => createSupabaseBrowserClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}
