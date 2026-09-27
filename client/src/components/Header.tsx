// =========================================================
// 쭌이형제네 상단 네비게이션 헤더 (Header.tsx)
// =========================================================
import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  TrendingUp,
  User,
  ChevronDown,
  Heart,
  Home,
  Camera,
  LogOut,
  ShieldCheck,
  Shield,
  GraduationCap,
  BookOpen,
  Users,
  Edit3,
} from 'lucide-react';
import { IBProgram, UserRole, UserProfile } from '../types/assessment';
import { StudentProfile } from '../types/student';
import { AIHomeServerStatus } from '../services/aiBridgeService';

interface HeaderProps {
  program: IBProgram;
  onProgramChange: (p: IBProgram) => void;
  onOpenGuideModal: () => void;
  onOpenPortfolioModal: () => void;
  onOpenStudentModal: () => void;
  currentStudent: StudentProfile | null;
  onEvaluate?: () => void;
  isEvaluating?: boolean;
  userRole?: UserRole;
  userProfile?: UserProfile | null;
  onLoginWithGoogle?: () => void;
  onLogout?: () => void;
  isLoggingIn?: boolean;
  onOpenAiAdmin?: () => void;
  onOpenUserManagement?: () => void;
  aiServerStatus?: AIHomeServerStatus | null;
  onRefreshAiStatus?: () => void;
  currentSubsystem?: 'hub' | 'album' | 'ib_assessment';
  onSubsystemChange?: (s: 'hub' | 'album' | 'ib_assessment') => void;
  isEvaluatorInStudentMode?: boolean;
  onToggleEvaluatorStudentMode?: () => void;
}

// =========================================================
// IB Program Descriptions & Constants
// =========================================================
const IB_PROGRAM_TOOLTIPS: Record<
  IBProgram,
  { name: string; target: string; desc: string }
> = {
  PYP: {
    name: 'Primary Years Programme',
    target: '초등 과정 (만 3세 ~ 12세)',
    desc: '학생 주도 탐구 중심 학습. 관찰과 생각을 자유롭게 서술하며 탐구 태도를 형성하는 평가 단계입니다.',
  },
  MYP: {
    name: 'Middle Years Programme',
    target: '중등 과정 (만 11세 ~ 16세)',
    desc: '비판적 사고 및 분석 중심 논증 에세이. IB 4대 준거(Criterion A~D)에 따른 논리적 일관성과 구성을 중점 평가합니다.',
  },
  DP: {
    name: 'Diploma Programme',
    target: '고등 대입 과정 (만 16세 ~ 19세)',
    desc: '심화 학술 에세이(소논문 EE) 및 지식론(TOK) 연계. 엄격한 학술적 정합성과 반론 수용성, 인식론적 성찰을 요구합니다.',
  },
};

// =========================================================
// Header Component Layout
// =========================================================
export const Header: React.FC<HeaderProps> = ({
  program,
  onProgramChange,
  onOpenGuideModal,
  onOpenPortfolioModal,
  onOpenStudentModal,
  currentStudent,
  onEvaluate,
  isEvaluating,
  userProfile,
  onLoginWithGoogle,
  onLogout,
  isLoggingIn = false,
  onOpenAiAdmin,
  onOpenUserManagement,
  aiServerStatus,
  currentSubsystem = 'hub',
  onSubsystemChange,
  isEvaluatorInStudentMode,
  onToggleEvaluatorStudentMode,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const role = userProfile?.role || 'student';
  const isStaff = role === 'super_admin' || role === 'admin' || role === 'evaluator' || role === 'teacher';

  const renderRoleBadge = (roleName: UserRole) => {
    switch (roleName) {
      case 'super_admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-purple-700" />
            <span>최고관리자</span>
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
            <Shield className="w-3 h-3 text-indigo-700" />
            <span>관리자</span>
          </span>
        );
      case 'evaluator':
      case 'teacher':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-sky-700" />
            <span>평가자</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-emerald-700" />
            <span>가족 회원</span>
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
      {/* Brand & Subsystem Selector */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => onSubsystemChange && onSubsystemChange('hub')}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm ring-2 ring-indigo-100 cursor-pointer hover:opacity-90 transition"
          title="쭌이형제네 포털 홈으로"
        >
          <Heart className="w-5 h-5 fill-white text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1
              onClick={() => onSubsystemChange && onSubsystemChange('hub')}
              className="text-base sm:text-lg font-black text-slate-900 tracking-tight cursor-pointer hover:text-indigo-700 transition"
            >
              쭌이형제네
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              가족 포털
            </span>
          </div>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {currentSubsystem === 'ib_assessment'
              ? '서브시스템 2.2 · IB 서술형 다면평가'
              : currentSubsystem === 'album'
              ? '서브시스템 2.1 · 가족앨범 (향후 개발)'
              : '가족 통합 포털 허브'}
          </p>
        </div>

        {/* Subsystem Navigation Pills */}
        {onSubsystemChange && (
          <div className="hidden md:flex items-center gap-1 ml-2 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => onSubsystemChange('hub')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                currentSubsystem === 'hub'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-slate-600" />
              <span>포털 홈</span>
            </button>

            <button
              onClick={() => onSubsystemChange('album')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                currentSubsystem === 'album'
                  ? 'bg-white text-amber-800 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-amber-600" />
              <span>가족앨범</span>
              <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-normal">준비중</span>
            </button>

            <button
              onClick={() => onSubsystemChange('ib_assessment')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                currentSubsystem === 'ib_assessment'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>IB 다면평가</span>
            </button>
          </div>
        )}
      </div>

      {/* Program Selector & Controls */}
      <div className="flex items-center flex-wrap gap-2">
        {/* IB Assessment System Controls (Only shown when active) */}
        {currentSubsystem === 'ib_assessment' && (
          <>
            {/* Student Selector Pill (Only for Staff / Evaluator in dashboard mode) */}
            {isStaff && !isEvaluatorInStudentMode && (
              <button
                onClick={onOpenStudentModal}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl transition text-xs font-medium text-slate-800 shadow-2xs group cursor-pointer"
                title="학생 전환, 신규 등록 및 학생별 평가 이력 보기"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {currentStudent ? currentStudent.name.slice(0, 1) : <User className="w-3 h-3" />}
                </div>
                <div className="text-left flex items-center gap-1.5">
                  <span className="font-bold text-indigo-950">
                    {currentStudent ? currentStudent.name : '학생 선택'}
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                    {currentStudent ? `IB ${currentStudent.program}` : '미지정'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 transition" />
              </button>
            )}

            {/* IB Program Level Tabs (Only for Staff / Evaluator in dashboard mode) */}
            {isStaff && !isEvaluatorInStudentMode && (
              <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-medium">
                {(['PYP', 'MYP', 'DP'] as IBProgram[]).map((p) => {
                  const tip = IB_PROGRAM_TOOLTIPS[p];
                  return (
                    <div key={p} className="relative group">
                      <button
                        onClick={() => onProgramChange(p)}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          program === p
                            ? 'bg-white text-indigo-700 font-bold shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {p}
                      </button>

                      {/* Floating Hover Tooltip */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 bg-slate-900 text-white rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none text-left">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                        <div className="flex items-center justify-between gap-1 mb-1 border-b border-slate-800 pb-1">
                          <span className="font-bold text-amber-300 text-xs">IB {p}</span>
                          <span className="text-[10px] text-slate-400">{tip.target}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-200 mb-1">{tip.name}</div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{tip.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rubric/Guide Setting Button (Only for Staff / Evaluators) */}
            {isStaff && (
              <button
                onClick={onOpenGuideModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
                title="채점자 평가 개요 및 원본 자료 설정"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>채점 가이드 &amp; 원본</span>
              </button>
            )}

            {/* Portfolio Growth Analysis Button (Visible to both Student & Staff) */}
            <button
              onClick={onOpenPortfolioModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
              title="아이별 누적 성장 및 오류 통계 대시보드"
            >
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
              <span>성장 분석</span>
            </button>
          </>
        )}

        {/* Single Unified AI Setting Button (Only for Staff / Evaluators / Admins) */}
        {isStaff && onOpenAiAdmin && (
          <button
            onClick={onOpenAiAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition shadow-2xs cursor-pointer"
            title="Gemini AI 모델 및 API 설정 열기"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  aiServerStatus?.aiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>AI 설정</span>
              {aiServerStatus?.latencyMs !== undefined && (
                <span className="font-mono text-[10px] text-slate-500 hidden sm:inline">
                  ({aiServerStatus.latencyMs}ms)
                </span>
              )}
            </span>
          </button>
        )}

        {/* Evaluator <-> Student Mode Toggle Button for Evaluators */}
        {currentSubsystem === 'ib_assessment' && onToggleEvaluatorStudentMode && (role === 'evaluator' || role === 'admin' || role === 'super_admin' || role === 'teacher') && (
          <button
            onClick={onToggleEvaluatorStudentMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer border shadow-2xs ${
              isEvaluatorInStudentMode
                ? 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
            title={isEvaluatorInStudentMode ? '평가자 대시보드로 복귀' : '학생 모드로 전환하여 글 작성하기'}
          >
            {isEvaluatorInStudentMode ? (
              <>
                <GraduationCap className="w-3.5 h-3.5 text-purple-700" />
                <span>평가자 대시보드 복귀</span>
              </>
            ) : (
              <>
                <Edit3 className="w-3.5 h-3.5 text-indigo-700" />
                <span>학생 글쓰기 모드</span>
              </>
            )}
          </button>
        )}

        {/* Main Assess Button (Only in IB system when onEvaluate is provided) */}
        {currentSubsystem === 'ib_assessment' && onEvaluate && (
          <button
            onClick={onEvaluate}
            disabled={isEvaluating}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 rounded-lg shadow-sm hover:shadow transition transform active:scale-95 cursor-pointer"
          >
            {isEvaluating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI 평가 중...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>평가 실행</span>
              </>
            )}
          </button>
        )}

        {/* User Management Button for Admins */}
        {onOpenUserManagement && (role === 'super_admin' || role === 'admin') && (
          <button
            onClick={onOpenUserManagement}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
            title="회원 목록 조회, 가입 승인 및 권한 관리"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">회원 관리</span>
          </button>
        )}

        {/* Google Authentication Section (Login Button OR Google Profile Dropdown) */}
        {userProfile ? (
          <div className="relative">
            <div
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs cursor-pointer transition"
              title="클릭 시 계정 정보 및 로그아웃"
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  {userProfile.name ? userProfile.name.slice(0, 1) : '구'}
                </div>
              )}
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-bold text-slate-800 leading-none">{userProfile.name}</p>
                <div className="mt-0.5">{renderRoleBadge(role)}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-in fade-in">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{userProfile.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{userProfile.email}</p>
                  <div className="mt-1.5">{renderRoleBadge(role)}</div>
                </div>

                {onOpenUserManagement && (role === 'super_admin' || role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenUserManagement();
                    }}
                    className="w-full mt-1 px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-50 rounded-lg flex items-center gap-2 transition text-left cursor-pointer font-semibold"
                  >
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>회원 및 권한 관리</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full mt-1 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-2 transition text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>구글 로그아웃</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLoginWithGoogle}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 hover:border-indigo-300 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50"
            title="구글 계정으로 로그인 또는 자동 회원가입"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Google 로그인</span>
          </button>
        )}
      </div>
    </header>
  );
};
export default Header;
