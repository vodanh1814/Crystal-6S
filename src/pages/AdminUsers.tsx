import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Shield, UserCheck, Key, Loader2, MapPin, CheckSquare, Square } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/context';
import { Modal } from '../components/Modal';
import type { UserWithAreas, Area } from '../api/types';

export const AdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { t } = useI18n();

  const [users, setUsers] = useState<UserWithAreas[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);

  // User Modal (Create / Edit)
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithAreas | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'auditor' | 'manager' | 'viewer'>('auditor');
  const [active, setActive] = useState(1);
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Area Assignment Modal (row-level quick assign)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignUser, setAssignUser] = useState<UserWithAreas | null>(null);
  const [assignAreaIds, setAssignAreaIds] = useState<number[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, areasRes] = await Promise.all([
        api.get<{ users: UserWithAreas[] }>('/users'),
        api.get<{ areas: Area[] }>('/areas?all=1'),
      ]);
      setUsers(usersRes.users || []);
      setAreas(areasRes.areas || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setPassword('');
    setRole('auditor');
    setActive(1);
    setSelectedAreaIds([]);
    setError(null);
    setUserModalOpen(true);
  };

  const openEditModal = (targetUser: UserWithAreas) => {
    setEditingUser(targetUser);
    setUsername(targetUser.username);
    setFullName(targetUser.full_name);
    setPassword('');
    setRole(targetUser.role);
    setActive(targetUser.active);
    setSelectedAreaIds(targetUser.areas.map((a) => a.area_id));
    setError(null);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const area_ids = role === 'manager' ? selectedAreaIds : [];

      if (editingUser) {
        const payload: any = {
          full_name: fullName,
          role,
          active,
          area_ids,
        };
        if (password) {
          payload.password = password;
        }
        await api.put(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', {
          username,
          full_name: fullName,
          password,
          role,
          area_ids,
        });
      }
      setUserModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModal = (targetUser: UserWithAreas) => {
    setAssignUser(targetUser);
    setAssignAreaIds(targetUser.areas.map((a) => a.area_id));
    setAssignModalOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!assignUser) return;
    setAssignSaving(true);

    try {
      await api.put(`/users/${assignUser.id}/areas`, { area_ids: assignAreaIds });
      setAssignModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update assignments');
    } finally {
      setAssignSaving(false);
    }
  };

  const isSelf = (targetId: number) => currentUser?.id === targetId;

  const toggleAllModalAreas = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedAreaIds(areas.map((a) => a.id));
    } else {
      setSelectedAreaIds([]);
    }
  };

  const toggleAllAssignAreas = (selectAll: boolean) => {
    if (selectAll) {
      setAssignAreaIds(areas.map((a) => a.id));
    } else {
      setAssignAreaIds([]);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('admin_users_title')}</h1>
          <p className="text-sm text-slate-500 font-medium">
            {users.length} {t('users')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm shadow-blue-600/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('create')}</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">{t('username')}</th>
                  <th className="py-3.5 px-4">{t('full_name')}</th>
                  <th className="py-3.5 px-4">{t('status')}</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">{t('areas')}</th>
                  <th className="py-3.5 px-4 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  let roleBadgeCls = 'bg-slate-100 text-slate-700 border-slate-200';
                  let roleLabel = u.role as string;
                  if (u.role === 'admin') {
                    roleBadgeCls = 'bg-purple-100 text-purple-800 border-purple-200';
                    roleLabel = 'Admin';
                  } else if (u.role === 'auditor') {
                    roleBadgeCls = 'bg-blue-100 text-blue-800 border-blue-200';
                    roleLabel = 'Auditor';
                  } else if (u.role === 'manager') {
                    roleBadgeCls = 'bg-amber-100 text-amber-800 border-amber-200';
                    roleLabel = 'Area MNG';
                  } else if (u.role === 'viewer') {
                    roleBadgeCls = 'bg-slate-100 text-slate-700 border-slate-200';
                    roleLabel = 'Viewer';
                  }

                  const canAssignAreas = u.role === 'manager';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-black text-slate-900">{u.username}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{u.full_name}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            u.active === 1
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.active === 1 ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${roleBadgeCls}`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {u.role === 'admin' ? (
                          <span className="text-purple-700 font-bold italic">Tất cả khu vực (Toàn quyền)</span>
                        ) : u.role === 'auditor' ? (
                          <span className="text-blue-700 font-bold italic">
                            Toàn nhà máy (Đi chấm 5S & Verify đóng lỗi)
                          </span>
                        ) : u.role === 'viewer' ? (
                          <span className="text-slate-400 italic">Tất cả khu vực (Chỉ xem)</span>
                        ) : u.areas.length === 0 ? (
                          <span className="text-rose-500 font-medium italic">{t('not_assigned')}</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {u.areas.map((a, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[11px] font-bold border bg-amber-50 text-amber-800 border-amber-200"
                              >
                                {a.area_code}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {canAssignAreas && (
                          <button
                            onClick={() => openAssignModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-300 text-xs font-bold text-blue-700 cursor-pointer transition"
                            title="Phân quyền khu vực"
                          >
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            <span>Phân quyền KV</span>
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer transition"
                          title={t('edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>{t('edit')}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Edit User with Direct Area Grid */}
      <Modal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingUser ? `${t('edit')} - ${editingUser.username}` : t('create')}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!editingUser ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  {t('username')}
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                  placeholder="username"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  {t('username')}
                </label>
                <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm">
                  {username}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('full_name')}
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                placeholder="Nguyễn Văn A"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {editingUser ? `${t('reset_password')} (để trống nếu không đổi)` : t('password')}
              </label>
              <input
                type="password"
                minLength={6}
                required={!editingUser}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Vai trò (Role)
              </label>
              <select
                value={role}
                disabled={editingUser ? isSelf(editingUser.id) : false}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm font-semibold disabled:bg-slate-100"
              >
                <option value="auditor">Auditor (Kiểm tra viên 5S)</option>
                <option value="manager">Area MNG (Quản lý khu vực)</option>
                <option value="admin">Admin (Quản trị viên)</option>
                <option value="viewer">Viewer (Chỉ xem)</option>
              </select>
            </div>
          </div>

          {editingUser && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="activeUserCheckbox"
                disabled={isSelf(editingUser.id)}
                checked={active === 1}
                onChange={(e) => setActive(e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              />
              <label htmlFor="activeUserCheckbox" className="text-sm font-semibold text-slate-800">
                {t('active')}
              </label>
            </div>
          )}

          {/* Area Selection Grid (Only displayed for Area MNG 'manager') */}
          {role === 'auditor' && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
              💡 <strong>Auditor (Đánh giá viên 5S):</strong> Không thuộc riêng khu vực nào — có quyền đi chấm điểm 5S và kiểm tra / xác nhận đóng lỗi (Verify) cho toàn bộ các khu vực trong nhà máy.
            </div>
          )}

          {role === 'manager' && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Phân quyền khu vực phụ trách (Area MNG — Quản lý khắc phục lỗi)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Chọn khu vực giao cho Area MNG này cập nhật ảnh After ({selectedAreaIds.length}/{areas.length} khu vực)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAllModalAreas(true)}
                    className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => toggleAllModalAreas(false)}
                    className="text-xs font-semibold text-slate-500 hover:underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-slate-50/60">
                {areas.map((a) => {
                  const isChecked = selectedAreaIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAreaIds([...selectedAreaIds, a.id]);
                          } else {
                            setSelectedAreaIds(selectedAreaIds.filter((id) => id !== a.id));
                          }
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="truncate">{a.code} - {a.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setUserModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Single-Role Area Assignments (Row-level action) */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Phân quyền khu vực - ${assignUser?.username} (${assignUser?.role === 'auditor' ? 'Auditor' : 'Area MNG'})`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <p className="text-slate-500 font-medium">
              Tích chọn các khu vực giao cho {assignUser?.full_name} ({assignAreaIds.length}/{areas.length} khu vực)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleAllAssignAreas(true)}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={() => toggleAllAssignAreas(false)}
                className="font-semibold text-slate-500 hover:underline cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50/50">
            {areas.map((a) => {
              const isChecked = assignAreaIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition select-none ${
                    isChecked
                      ? assignUser?.role === 'auditor'
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-2xs'
                        : 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignAreaIds([...assignAreaIds, a.id]);
                        } else {
                          setAssignAreaIds(assignAreaIds.filter((id) => id !== a.id));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-bold">{a.code}</span>
                    <span className="text-slate-500 truncate text-[11px]">{a.name}</span>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveAssignments}
              disabled={assignSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {assignSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t('save')}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
