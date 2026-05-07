import { api } from '../utils/api.js';

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
}

function qs(q: Record<string, unknown> | undefined): string {
  if (!q) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export interface UserRow {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateInput {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  status?: 'ACTIVE' | 'INACTIVE';
  roleCodes: string[];
}

export interface UserUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: UserStatus;
  roleCodes?: string[];
}

export interface ListUsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: UserStatus;
}

export const usersApi = {
  list: async (q?: ListUsersQuery): Promise<PageResult<UserRow>> =>
    (await api.get(`/users${qs(q)}`)).data,
  get: async (id: string): Promise<UserRow> => (await api.get(`/users/${id}`)).data,
  create: async (input: UserCreateInput): Promise<UserRow> =>
    (await api.post('/users', input)).data,
  update: async (id: string, input: UserUpdateInput): Promise<UserRow> =>
    (await api.patch(`/users/${id}`, input)).data,
  deactivate: async (id: string): Promise<UserRow> =>
    (await api.delete(`/users/${id}`)).data,
};

/* ------------------------------------------------------------------ */
/* Roles (read-only)                                                  */
/* ------------------------------------------------------------------ */

export interface RoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
}

export interface RoleCreateInput {
  code: string;
  name: string;
  description?: string | null;
  permissions?: string[];
}

export interface RoleUpdateInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
}

export interface PermissionRow {
  code: string;
  resource: string;
  action: string;
}

export const rolesApi = {
  list: async (): Promise<{ items: RoleRow[] }> => (await api.get('/roles')).data,
  get: async (id: string): Promise<RoleRow> => (await api.get(`/roles/${id}`)).data,
  create: async (input: RoleCreateInput): Promise<RoleRow> =>
    (await api.post('/roles', input)).data,
  update: async (id: string, input: RoleUpdateInput): Promise<RoleRow> =>
    (await api.patch(`/roles/${id}`, input)).data,
  remove: async (id: string): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },
  permissions: async (): Promise<{ items: PermissionRow[] }> =>
    (await api.get('/roles/_catalogue/permissions')).data,
};

/* ------------------------------------------------------------------ */
/* Audit                                                              */
/* ------------------------------------------------------------------ */

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  changes: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface ListAuditQuery {
  page?: number;
  pageSize?: number;
  resource?: string;
  resourceId?: string;
  actorId?: string;
  actor?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  list: async (q?: ListAuditQuery): Promise<PageResult<AuditLogRow>> =>
    (await api.get(`/audit-logs${qs(q)}`)).data,
};

/* ------------------------------------------------------------------ */
/* Role-Menu access matrix                                            */
/* ------------------------------------------------------------------ */

export interface RoleMenuItem {
  menuId: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  updatedAt: string | null;
}

export interface RoleMenuMatrix {
  role: { id: string; code: string; name: string };
  items: RoleMenuItem[];
}

export interface RoleMenuEntry {
  menuId: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export const roleAccessApi = {
  getMenus: async (roleId: string): Promise<RoleMenuMatrix> =>
    (await api.get(`/admin/role-access/${roleId}/menus`)).data,
  putMenus: async (roleId: string, entries: RoleMenuEntry[]): Promise<{ ok: true; count: number }> =>
    (await api.put(`/admin/role-access/${roleId}/menus`, { entries })).data,
};
