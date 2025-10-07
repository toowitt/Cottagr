import { redirect } from 'next/navigation';

export default function OrganizationsPage() {
  redirect('/admin/setup?section=organizations');
}
