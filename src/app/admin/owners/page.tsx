import { redirect } from 'next/navigation';

export default function OwnersPage() {
  redirect('/admin/setup?section=owners');
}
