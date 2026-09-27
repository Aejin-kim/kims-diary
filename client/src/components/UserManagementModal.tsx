// =========================================================
// 쭌이형제네 가족 회원 승인 및 권한 관리 모달 (UserManagementModal.tsx)
// =========================================================
import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  ShieldCheck,
  Shield,
  GraduationCap,
  BookOpen,
  Clock,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  Lock,
  UserCheck,
} from 'lucide-react';
import { ManagedUser, UserProfile, UserRole } from '../types/assessment';
import { StudentProfile } from '../types/student';
import {
  fetchAllUsers,
  fetchStudents,
  approveUser,
  updateUserRole,
  toggleUserApproval,
  deleteUser,
} from '../services/assessmentService';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserUpdated?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'staff' | 'student'>('all');
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);

  const operatorRole = currentUser?.role || 'student';
  const isSuperAdmin = operatorRole === 'super_admin';
  const isAdmin = operatorRole === 'admin' || isSuperAdmin;

  const loadUsersList = async () => {
    setIsLoading(true);
    try {
      const [list, students] = await Promise.all([
        fetchAllUsers(),
        fetchStudents().catch(() => []),
      ]);
      setUsers(list);
      setStudentsList(students);
    } catch (err) {
      console.error('회원 목록 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsersList();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter users based on tab & search
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'pending') return !u.isApproved;
    if (activeTab === 'staff') return u.isApproved && (u.role === 'super_admin' || u.role === 'admin' || u.role === 'evaluator' || u.role === 'teacher');
    if (activeTab === 'student') return u.isApproved && u.role === 'student';
    return true;
  });

  const pendingCount = users.filter((u) => !u.isApproved).length;
  const staffCount = users.filter((u) => u.isApproved && (u.role === 'super_admin' || u.role === 'admin' || u.role === 'evaluator' || u.role === 'teacher')).length;
  const studentRoleCount = users.filter((u) => u.isApproved && u.role === 'student').length;

  // 1. 회원 승인 처리
  const handleApprove = async (user: ManagedUser, assignedRole: UserRole = 'student') => {
    setProcessingUid(String(user.id));
    try {
      await approveUser(String(user.uid || user.id), assignedRole, operatorRole);
      await loadUsersList();
      onUserUpdated?.();
      alert(`'${user.name}'님의 가입을 승인하였습니다.`);
    } catch (err: any) {
      alert(`승인 처리 실패: ${err.message}`);
    } finally {
      setProcessingUid(null);
    }
  };

  // 2. 권한 변경 (제약조건: 자기 이상의 권한은 변경 불가, 최고관리자 본인 강등 불가)
  const handleRoleChange = async (user: ManagedUser, newRole: UserRole) => {
    const isSelf =
      (currentUser?.email && String(user.email).toLowerCase() === String(currentUser.email).toLowerCase()) ||
      (currentUser?.id && (String(user.uid) === String(currentUser.id) || String(user.id) === String(currentUser.id)));

    // 최고관리자 본인의 권한은 스스로 강등할 수 없음
    if (isSelf && user.role === 'super_admin' && newRole !== 'super_admin') {
      alert('최고관리자 본인의 권한은 시스템 보호를 위해 스스로 강등할 수 없습니다.');
      return;
    }

    // 일반 관리자는 최고관리자의 권한을 변경할 수 없음
    if (!isSuperAdmin && user.role === 'super_admin') {
      alert('일반 관리자는 최고관리자의 권한을 수정할 수 없습니다.');
      return;
    }
    // 일반 관리자는 타인을 최고관리자로 승격할 수 없음
    if (!isSuperAdmin && newRole === 'super_admin') {
      alert('일반 관리자는 최고관리자 권한을 부여할 수 없습니다.');
      return;
    }

    setProcessingUid(String(user.id));
    try {
      await updateUserRole(String(user.uid || user.id), newRole, operatorRole, user.role, Boolean(isSelf));
      await loadUsersList();
      onUserUpdated?.();
      alert(`'${user.name}'님의 권한을 '${getRoleLabel(newRole)}'(으)로 변경했습니다.`);
    } catch (err: any) {
      alert(`권한 변경 실패: ${err.message}`);
    } finally {
      setProcessingUid(null);
    }
  };

  // 3. 승인 취소 (대기 상태로 전환 - 본인 및 최고관리자 보호)
  const handleToggleApproval = async (user: ManagedUser) => {
    const isSelf =
      (currentUser?.email && String(user.email).toLowerCase() === String(currentUser.email).toLowerCase()) ||
      (currentUser?.id && (String(user.uid) === String(currentUser.id) || String(user.id) === String(currentUser.id)));

    if (isSelf) {
      alert('현재 로그인된 본인 계정은 대기 상태로 전환할 수 없습니다.');
      return;
    }

    if (user.role === 'super_admin') {
      alert('최고관리자 계정은 대기 상태로 전환할 수 없습니다.');
      return;
    }

    const nextState = !user.isApproved;
    const confirmMsg = nextState
      ? `'${user.name}'님의 가입을 승인하시겠습니까?`
      : `'${user.name}'님을 승인 대기 상태로 전환하시겠습니까? (로그인 시 대기 화면이 표시됩니다)`;

    if (!window.confirm(confirmMsg)) return;

    setProcessingUid(String(user.id));
    try {
      await toggleUserApproval(String(user.uid || user.id), nextState, operatorRole, user.role, Boolean(isSelf));
      await loadUsersList();
      onUserUpdated?.();
    } catch (err: any) {
      alert(`상태 변경 실패: ${err.message}`);
    } finally {
      setProcessingUid(null);
    }
  };

  // 4. 회원 삭제 (제약조건: 본인 계정 및 최고관리자 계정 삭제 절대 불가)
  const handleDeleteUser = async (user: ManagedUser) => {
    const isSelf =
      (currentUser?.email && String(user.email).toLowerCase() === String(currentUser.email).toLowerCase()) ||
      (currentUser?.id && (String(user.uid) === String(currentUser.id) || String(user.id) === String(currentUser.id)));

    if (isSelf) {
      alert('현재 로그인된 본인 계정은 스스로 삭제할 수 없습니다.');
      return;
    }

    if (user.role === 'super_admin') {
      alert('최고관리자 계정은 시스템 보호를 위해 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`정말로 '${user.name}' (${user.email}) 계정을 삭제하시겠습니까?\n삭제된 계정은 다시 로그인해야 가입이 진행됩니다.`)) {
      return;
    }

    setProcessingUid(String(user.id));
    try {
      await deleteUser(String(user.uid || user.id), operatorRole, user.role, Boolean(isSelf));
      await loadUsersList();
      onUserUpdated?.();
      alert(`'${user.name}' 계정을 삭제했습니다.`);
    } catch (err: any) {
      alert(`삭제 실패: ${err.message}`);
    } finally {
      setProcessingUid(null);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return '최고관리자';
      case 'admin':
        return '관리자';
      case 'evaluator':
      case 'teacher':
        return '평가자';
      case 'student':
        return '평가대상자(학생)';
      default:
        return '회원';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">가족 회원 승인 및 권한 관리</h3>
                {isSuperAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-700" />
                    <span>최고관리자 권한</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-indigo-700" />
                    <span>일반관리자 권한</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Google 계정으로 가입한 가족 구성원의 가입을 승인하고 권한을 지정합니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadUsersList}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Concept Distinction Notice Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-600">
          <span>💡 <strong>안내:</strong> 본 화면은 웹사이트 로그인 계정(Google ID)의 접근 권한을 관리하는 화면입니다. 학생의 실제 글쓰기 및 평가 기록은 [학생 관리] 메뉴에서 별도로 영구 보존됩니다.</span>
        </div>

        {/* Tab & Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              전체 ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>승인 대기 ({pendingCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              관리자 / 평가자 ({staffCount})
            </button>
            <button
              onClick={() => setActiveTab('student')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              학생 역할 계정 ({studentRoleCount})
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="이름 또는 이메일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* User List Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
          {isLoading && users.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-indigo-500" />
              <p className="text-xs">회원 목록을 불러오는 중입니다...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">등록된 회원이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">Google 계정으로 로그인한 가족 회원이 여기에 나타납니다.</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">선택한 조건의 회원이 없습니다.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {activeTab === 'student'
                  ? '로그인 권한(Role)이 [학생]으로 지정된 회원이 없습니다. (관리자/평가자 탭 또는 전체 탭을 확인하세요)'
                  : 'Google 계정으로 로그인한 가족 회원이 여기에 나타납니다.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isTargetSuperAdmin = user.role === 'super_admin';
              const isCurrentUser = Boolean(
                (currentUser?.email && String(user.email).toLowerCase() === String(currentUser.email).toLowerCase()) ||
                (currentUser?.id && (String(user.uid) === String(currentUser.id) || String(user.id) === String(currentUser.id)))
              );
              const canEditThisUser = isSuperAdmin || (!isTargetSuperAdmin && isAdmin);
              const isProcessing = processingUid === String(user.id);

              const isStudentRegistered = studentsList.some(
                (st) => (st.googleEmail || '').trim().toLowerCase() === (user.email || '').trim().toLowerCase()
              );

              return (
                <div
                  key={user.id}
                  className={`py-3.5 px-3 rounded-2xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !user.isApproved
                      ? 'bg-amber-50/60 border border-amber-200/80 my-1'
                      : isCurrentUser
                      ? 'bg-indigo-50/30 border border-indigo-100/80'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Left: User Profile Info */}
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                        {user.name.slice(0, 1)}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{user.name}</span>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                            나 (현재 계정)
                          </span>
                        )}
                        {/* Status Badge */}
                        {user.isApproved ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>승인완료</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>승인대기</span>
                          </span>
                        )}
                        {/* IB Student Profile Registered Badge */}
                        {isStudentRegistered && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-indigo-600" />
                            <span>IB 학생 등록됨</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-mono text-slate-600">{user.email}</span>
                        <span>•</span>
                        <span>Google 계정</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Role Control & Actions */}
                  <div className="flex items-center flex-wrap gap-2 self-end sm:self-center">
                    {/* Approve Button (If pending) */}
                    {!user.isApproved && (
                      <button
                        onClick={() => handleApprove(user, 'student')}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>가입 승인하기</span>
                      </button>
                    )}

                    {/* Role Dropdown */}
                    <div className="relative">
                      {isCurrentUser && isTargetSuperAdmin ? (
                        <div
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 text-purple-800 border border-purple-200 cursor-not-allowed"
                          title="최고관리자 본인 계정의 권한은 보호됩니다."
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span>최고관리자 (보호됨)</span>
                        </div>
                      ) : canEditThisUser ? (
                        <select
                          value={user.role}
                          disabled={isProcessing}
                          onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 transition cursor-pointer"
                        >
                          {/* Super admin only options */}
                          {isSuperAdmin && (
                            <option value="super_admin">최고관리자</option>
                          )}
                          <option value="admin">관리자</option>
                          <option value="evaluator">평가자</option>
                          <option value="student">학생</option>
                        </select>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
                          title="일반 관리자는 최고관리자의 권한을 변경할 수 없습니다."
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>{getRoleLabel(user.role)}</span>
                        </div>
                      )}
                    </div>

                    {/* Toggle Approval Button (Only for approved users - NEVER for self or super_admin) */}
                    {user.isApproved && canEditThisUser && !isCurrentUser && !isTargetSuperAdmin && (
                      <button
                        onClick={() => handleToggleApproval(user)}
                        disabled={isProcessing}
                        className="px-2.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
                        title="승인을 취소하고 대기 상태로 전환합니다."
                      >
                        대기 전환
                      </button>
                    )}

                    {/* Delete User Button (본인 계정 및 최고관리자 계정은 삭제 잠금 보호) */}
                    {canEditThisUser && (
                      isCurrentUser || isTargetSuperAdmin ? (
                        <div
                          className="p-1.5 text-slate-300 rounded-xl flex items-center justify-center cursor-not-allowed"
                          title={isCurrentUser ? "현재 로그인된 본인 계정은 스스로 삭제할 수 없습니다." : "최고관리자 계정은 시스템 보호를 위해 삭제할 수 없습니다."}
                        >
                          <Lock className="w-4 h-4 text-slate-300" />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={isProcessing}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer disabled:opacity-50"
                          title="회원 계정 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">권한 규칙:</span>
            <span>최초 가입자는 최고관리자 자동 지정, 이후 가입자는 관리자 승인 후 이용 가능합니다.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
export default UserManagementModal;
