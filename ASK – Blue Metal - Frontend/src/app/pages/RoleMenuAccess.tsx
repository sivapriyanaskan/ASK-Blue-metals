import { useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Search,
  Shield,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  rolesApi,
  roleAccessApi,
  type RoleRow,
  type RoleMenuItem,
  type RoleMenuEntry,
} from '../services/iamApi';
import { describeError } from '../services/mastersApi';

type PermAction = 'canView' | 'canCreate' | 'canEdit' | 'canDelete';
const PERMS: { key: PermAction; label: string }[] = [
  { key: 'canView', label: 'View' },
  { key: 'canCreate', label: 'Create' },
  { key: 'canEdit', label: 'Edit' },
  { key: 'canDelete', label: 'Delete' },
];

interface MenuNode extends RoleMenuItem {
  children: MenuNode[];
}

const buildTree = (items: RoleMenuItem[]): MenuNode[] => {
  const map = new Map<string, MenuNode>();
  items.forEach((it) => map.set(it.menuId, { ...it, children: [] }));
  const roots: MenuNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: MenuNode[]) => {
    arr.sort((a, b) => a.sortOrder - b.sortOrder);
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
};

interface CreateForm {
  code: string;
  name: string;
  description: string;
}

export const RoleMenuAccess = () => {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<RoleMenuItem[]>([]);
  const [edits, setEdits] = useState<Record<string, RoleMenuEntry>>({});
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({ code: '', name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* -------------------- Load roles -------------------- */
  const loadRoles = async (preferId?: string) => {
    setLoadingRoles(true);
    setError(null);
    try {
      const r = await rolesApi.list();
      setRoles(r.items);
      if (r.items.length > 0) {
        const next = preferId && r.items.find((x) => x.id === preferId) ? preferId : r.items[0].id;
        setSelectedId(next);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(describeError(err, 'Failed to load roles'));
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    void loadRoles();
  }, []);

  /* -------------------- Load matrix for selected role -------------------- */
  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      setEdits({});
      return;
    }
    setLoadingMatrix(true);
    setError(null);
    setSuccess(null);
    roleAccessApi
      .getMenus(selectedId)
      .then((res) => {
        console.log(`Loaded menus for role ${selectedId}:`, res.items);
        setItems(res.items);
        const map: Record<string, RoleMenuEntry> = {};
        res.items.forEach((m) => {
          map[m.menuId] = {
            menuId: m.menuId,
            canView: m.canView,
            canCreate: m.canCreate,
            canEdit: m.canEdit,
            canDelete: m.canDelete,
          };
        });
        setEdits(map);
        setExpanded(new Set(res.items.filter((m) => m.parentId === null).map((m) => m.menuId)));
      })
      .catch((err) => {
        console.error('Failed to load menu access:', err);
        setError(describeError(err, 'Failed to load menu access'));
      })
      .finally(() => setLoadingMatrix(false));
  }, [selectedId]);

  const tree = useMemo(() => buildTree(items), [items]);
  const selectedRole = roles.find((r) => r.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    if (!search.trim()) return tree;
    const q = search.trim().toLowerCase();
    const matches = (n: MenuNode): MenuNode | null => {
      const childMatches = n.children.map(matches).filter((x): x is MenuNode => x !== null);
      const self = n.name.toLowerCase().includes(q) || n.code.toLowerCase().includes(q);
      if (self || childMatches.length > 0) {
        return { ...n, children: childMatches.length > 0 ? childMatches : n.children };
      }
      return null;
    };
    return tree.map(matches).filter((x): x is MenuNode => x !== null);
  }, [tree, search]);

  const dirty = useMemo(() => {
    return items.some((m) => {
      const e = edits[m.menuId];
      if (!e) return false;
      return (
        e.canView !== m.canView ||
        e.canCreate !== m.canCreate ||
        e.canEdit !== m.canEdit ||
        e.canDelete !== m.canDelete
      );
    });
  }, [items, edits]);

  /* -------------------- Toggle helpers -------------------- */
  const togglePerm = (menuId: string, perm: PermAction) => {
    setEdits((prev) => {
      const cur = prev[menuId];
      if (!cur) return prev;
      return { ...prev, [menuId]: { ...cur, [perm]: !cur[perm] } };
    });
  };

  const toggleAllForMenu = (menuId: string, value: boolean) => {
    setEdits((prev) => {
      const cur = prev[menuId];
      if (!cur) return prev;
      return {
        ...prev,
        [menuId]: { menuId, canView: value, canCreate: value, canEdit: value, canDelete: value },
      };
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const grantAll = () => {
    setEdits((prev) => {
      const next: Record<string, RoleMenuEntry> = {};
      Object.values(prev).forEach((e) => {
        next[e.menuId] = { ...e, canView: true, canCreate: true, canEdit: true, canDelete: true };
      });
      return next;
    });
  };

  const revokeAll = () => {
    setEdits((prev) => {
      const next: Record<string, RoleMenuEntry> = {};
      Object.values(prev).forEach((e) => {
        next[e.menuId] = { ...e, canView: false, canCreate: false, canEdit: false, canDelete: false };
      });
      return next;
    });
  };

  /* -------------------- Save matrix -------------------- */
  const onSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await roleAccessApi.putMenus(selectedId, Object.values(edits));
      const refreshed = await roleAccessApi.getMenus(selectedId);
      setItems(refreshed.items);
      const map: Record<string, RoleMenuEntry> = {};
      refreshed.items.forEach((m) => {
        map[m.menuId] = {
          menuId: m.menuId,
          canView: m.canView,
          canCreate: m.canCreate,
          canEdit: m.canEdit,
          canDelete: m.canDelete,
        };
      });
      setEdits(map);
      setSuccess('Menu access saved successfully.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(describeError(err, 'Failed to save menu access'));
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- Create role -------------------- */
  const onCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const code = createForm.code.trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
        throw new Error('Code must be UPPER_SNAKE_CASE (e.g. SHIFT_LEAD)');
      }
      const created = await rolesApi.create({
        code,
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        permissions: [],
      });
      setShowCreate(false);
      setCreateForm({ code: '', name: '', description: '' });
      await loadRoles(created.id);
      setSuccess(`Role "${created.name}" created.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setCreateError(describeError(err, 'Failed to create role'));
    } finally {
      setCreating(false);
    }
  };

  /* -------------------- Delete role -------------------- */
  const onDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await rolesApi.remove(confirmDelete.id);
      setConfirmDelete(null);
      await loadRoles();
      setSuccess('Role deleted.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(describeError(err, 'Failed to delete role'));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  /* -------------------- Render -------------------- */
  const renderRow = (n: MenuNode, depth: number): React.ReactNode => {
    const e = edits[n.menuId];
    if (!e) return null;
    const allOn = e.canView && e.canCreate && e.canEdit && e.canDelete;
    const someOn = !allOn && (e.canView || e.canCreate || e.canEdit || e.canDelete);
    const hasKids = n.children.length > 0;
    const isExpanded = expanded.has(n.menuId);
    return (
      <>
        <tr key={n.menuId} className="border-b border-gray-100 hover:bg-gray-50">
          <td className="px-3 py-2">
            <div className="flex items-center gap-1" style={{ paddingLeft: `${depth * 16}px` }}>
              {hasKids ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(n.menuId)}
                  className="text-gray-500 hover:text-gray-800"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <span className="w-4 inline-block" />
              )}
              <span className="text-sm text-gray-900">{n.name}</span>
              <span className="text-[10px] font-mono text-gray-400 ml-2">{n.code}</span>
            </div>
          </td>
          {PERMS.map((p) => (
            <CheckboxCell key={p.key} menuId={n.menuId} perm={p.key} />
          ))}
          <td className="px-3 py-2 text-center">
            <button
              type="button"
              onClick={() => toggleAllForMenu(n.menuId, !allOn)}
              className="text-xs text-blue-600 hover:underline"
              title={allOn ? 'Revoke all' : 'Grant all'}
            >
              {allOn ? 'None' : someOn ? 'All' : 'All'}
            </button>
          </td>
        </tr>
        {hasKids && isExpanded && n.children.map((c) => renderRow(c, depth + 1))}
      </>
    );
  };

  const CheckboxCell = ({ menuId, perm }: { menuId: string; perm: PermAction }) => {
    const e = edits[menuId];
    if (!e) return <td className="px-3 py-2 text-center" />;
    const checked = e[perm];

    const getColorClasses = (action: PermAction, isChecked: boolean): string => {
      const colorScheme: Record<PermAction, { checked: string; unchecked: string }> = {
        canView: {
          checked: 'bg-green-500 text-white ring-2 ring-green-600 hover:bg-green-600',
          unchecked: 'bg-gray-200 text-gray-400 ring-2 ring-gray-300 hover:bg-gray-300',
        },
        canCreate: {
          checked: 'bg-blue-500 text-white ring-2 ring-blue-600 hover:bg-blue-600',
          unchecked: 'bg-gray-200 text-gray-400 ring-2 ring-gray-300 hover:bg-gray-300',
        },
        canEdit: {
          checked: 'bg-amber-500 text-white ring-2 ring-amber-600 hover:bg-amber-600',
          unchecked: 'bg-gray-200 text-gray-400 ring-2 ring-gray-300 hover:bg-gray-300',
        },
        canDelete: {
          checked: 'bg-red-500 text-white ring-2 ring-red-600 hover:bg-red-600',
          unchecked: 'bg-gray-200 text-gray-400 ring-2 ring-gray-300 hover:bg-gray-300',
        },
      };
      return isChecked ? colorScheme[action].checked : colorScheme[action].unchecked;
    };

    return (
      <td className="px-3 py-2 text-center">
        <button
          type="button"
          onClick={() => togglePerm(menuId, perm)}
          className={`inline-flex items-center justify-center p-2 rounded-lg transition-all font-semibold ${getColorClasses(
            perm,
            checked
          )}`}
          aria-label={`${perm} ${menuId}`}
        >
          {checked ? (
            <CheckSquare className="w-5 h-5" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>
      </td>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage roles and configure menu-level access permissions for each role.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setCreateError(null); setShowCreate(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Create Role
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">{success}</div>}

      <div className="grid grid-cols-12 gap-6">
        {/* Roles list */}
        <div className="col-span-4 bg-white rounded-lg border border-gray-300 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-300 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-800">Roles ({roles.length})</span>
          </div>
          {loadingRoles ? (
            <div className="p-6 text-center text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : roles.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No roles found. Create one to get started.</div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[70vh] overflow-y-auto">
              {roles.map((r) => (
                <div
                  key={r.id}
                  className={`px-4 py-3 flex items-start gap-2 hover:bg-gray-50 ${selectedId === r.id ? 'bg-blue-50' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{r.name}</span>
                      {r.isSystem && (
                        <span className="ml-auto text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded shrink-0">
                          System
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5 truncate">{r.code}</div>
                    {r.description && (
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{r.description}</div>
                    )}
                  </button>
                  {!r.isSystem && (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(r)}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Delete role"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matrix */}
        <div className="col-span-8 bg-white rounded-lg border border-gray-300 overflow-hidden">
          {!selectedRole ? (
            <div className="p-12 text-center text-gray-500">Select a role to manage menu access.</div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-300 flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedRole.name}</h2>
                  <p className="text-xs text-gray-500 font-mono">{selectedRole.code}</p>
                </div>
                {selectedRole.isSystem && (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">System Role</span>
                )}
              </div>

              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menus…"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button type="button" onClick={grantAll} className="text-xs text-blue-600 hover:underline">
                  Grant all
                </button>
                <button type="button" onClick={revokeAll} className="text-xs text-gray-600 hover:underline">
                  Revoke all
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={!dirty || saving}
                  className="ml-auto inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>

              {loadingMatrix ? (
                <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading menu access…
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-300 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Menu</th>
                        {PERMS.map((p) => (
                          <th key={p.key} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-20">
                            {p.label}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Toggle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                            No menus match your search.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((n) => renderRow(n, 0))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create role modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create Role</h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {createError && (
                <div className="p-2 bg-red-50 border border-red-200 text-red-800 rounded text-sm">{createError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SHIFT_LEAD"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">UPPER_SNAKE_CASE. Cannot be changed later.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Shift Lead"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                Menu access is empty by default. After creation, configure access from the matrix on the right.
              </p>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={!createForm.code.trim() || !createForm.name.trim() || creating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Delete Role?</h2>
            </div>
            <div className="px-6 py-4 text-sm text-gray-700">
              Permanently delete <span className="font-semibold">{confirmDelete.name}</span> ({confirmDelete.code})?
              This will also remove all its menu and feature access.
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-50 hover:bg-red-700"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
