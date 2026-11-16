import { redirect } from 'next/navigation';

/**
 * Public registration is decommissioned.
 * Hospital staff accounts must be provisioned internally by administrators
 * at /dashboard/admin/staff.
 */
export default function Signup() {
  redirect('/login');
}
