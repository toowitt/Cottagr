
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const password = formData.get('password') as string;
  
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    redirect('/admin/login?error=invalid');
  }

  const cookieStore = await cookies();
  cookieStore.set('auth', 'ok', {
    httpOnly: true,
    maxAge: 24 * 60 * 60, // 1 day
    path: '/',
  });

  redirect('/admin');
}
