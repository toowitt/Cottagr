import { MembershipRole, PropertyMembershipRole } from '@prisma/client';

export const isManagerRole = (role: PropertyMembershipRole) =>
  role === 'MANAGER' || role === 'OWNER';

export const canManageOwners = (role: PropertyMembershipRole) => role === 'OWNER';

export const isOrgAdmin = (role: MembershipRole) => role === 'OWNER_ADMIN';
