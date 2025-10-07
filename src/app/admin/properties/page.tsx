import { redirect } from 'next/navigation';

export default function PropertiesPage() {
  redirect('/admin/setup?section=properties');
}
