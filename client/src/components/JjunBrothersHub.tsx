// =========================================================
// 쭌이형제네 가족 통합 포털 허브 (JjunBrothersHub.tsx)
// =========================================================
import React, { useState, useEffect } from 'react';
import {
  Award,
  Camera,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Activity,
  Cpu,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { UserProfile } from '../types/assessment';
import { AIHomeServerStatus } from '../services/aiBridgeService';
import { fetchStudents } from '../services/assessmentService';

interface HubProps {
  userProfile?: UserProfile | null;
  aiServerStatus: AIHomeServerStatus | null;
  studentsCount?: number;
  onSelectSubsystem: (subsystem: 'album' | 'ib_assessment') => void;
  onOpenPortfolioModal: () => void;
  onOpenStudentModal?: () => void;
  onOpenUserManagement?: () => void;
  onLoginWithGoogle?: () => void;
  isLoggingIn?: boolean;
}

export const JjunBrothersHub: React.FC<HubProps> = ({
  userProfile,
  aiServerStatus,
  studentsCount,
  onSelectSubsystem,
  onOpenPortfolioModal,
  onOpenStudentModal,
  onOpenUserManagement,
  onLoginWithGoogle,
  isLoggingIn = false,
}) => {
  const [loadedCount, setLoadedCount] = useState<number | null>(studentsCount ?? null);

  useEffect(() => {
    if (studentsCount !== undefined) {
      setLoadedCount(studentsCount);
    } else {
      fetchStudents()
        .then((list) => setLoadedCount(list.length))
        .catch(() => setLoadedCount(0));
    }
  }, [studentsCount]);

  const userName = userProfile?.name || '쭌이형제네 가족';
  const role = userProfile?.role || 'student';
  const isStaff = role === 'super_admin' || role === 'admin' || role === 'evaluator' || role === 'teacher';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 w-full">
      {/* ========================================================= */}
      {/* 1. Welcome & Status Banner */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 text-indigo-200 border border-white/10 backdrop-blur-sm">
                쭌이형제네 가족 통합 포털
              </span>
              {userProfile ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-400 text-purple-950 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Google 인증 완료 ({userProfile.role === 'super_admin' ? '최고관리자' : '회원'})</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-300 text-slate-900 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <span>게스트 모드</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              반갑습니다, <span className="text-amber-300">{userName}</span>님! 👋
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 max-w-xl leading-relaxed">
              원하시는 쭌이형제네 서브시스템을 선택하여 자유롭게 이용해 보세요.
            </p>

            {/* Quick Google Login Callout if Not Logged In */}
            {!userProfile && onLoginWithGoogle && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={onLoginWithGoogle}
                  disabled={isLoggingIn}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white text-slate-800 hover:bg-slate-100 rounded-xl font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
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
                  <span>Google 계정으로 로그인</span>
                </button>
                <span className="text-[11px] text-indigo-200">
                  Google 계정으로 로그인하면 내 계정별 에세이 및 평가 이력이 동기화됩니다.
                </span>
              </div>
            )}
          </div>

          {/* Quick AI & System Health Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:min-w-[240px] flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-300" />
                <span>AI 서비스 상태</span>
              </span>
              {aiServerStatus?.aiOnline ? (
                <span className="font-bold text-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>정상 ({aiServerStatus.latencyMs ?? 0}ms)</span>
                </span>
              ) : (
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>설정 필요</span>
                </span>
              )}
            </div>
            <div
              onClick={isStaff && onOpenStudentModal ? onOpenStudentModal : undefined}
              title={isStaff ? '가족 학생 목록 및 관리 열기' : '가족 등록 학생 수'}
              className={`flex items-center justify-between text-xs pt-2 border-t border-white/10 ${
                isStaff && onOpenStudentModal ? 'cursor-pointer hover:bg-white/10' : ''
              } rounded-lg px-1.5 py-1 -mx-1.5 transition`}
            >
              <span className="text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-300" />
                <span>가족 학생 계정</span>
              </span>
              <span className="font-bold text-white flex items-center gap-1">
                <span>{loadedCount !== null ? `${loadedCount}명 등록됨` : '조회 중...'}</span>
                {isStaff && onOpenStudentModal && <ChevronRight className="w-3 h-3 text-slate-400" />}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. Subsystems Selection Grid */}
      {/* ========================================================= */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">서브시스템 바로가기</h3>
            <p className="text-xs text-slate-500">원하시는 시스템을 선택하시면 해당 전용 환경으로 바로 이동합니다.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Subsystem 1: 가족앨범 시스템 */}
          <div
            onClick={() => onSelectSubsystem('album')}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs hover:shadow-md hover:border-amber-300 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-105 transition">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>향후 오픈 예정</span>
                </span>
              </div>

              <div className="text-xs font-semibold text-amber-700 mb-1">서브시스템 2.1</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-amber-700 transition">
                가족앨범 시스템
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                아이들의 소중한 순간, 일상 사진, 여행 추억을 안전한 프라이빗 클라우드에 영구 보관하고 타임라인으로 열람하는 가족 전용 사진첩입니다.
              </p>

              <div className="space-y-1.5 text-xs text-slate-500 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>아이별 일상 성장 타임라인</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>가족 캘린더 &amp; 기념일 앨범 연동</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>앨범 둘러보기 &amp; 준비 로드맵</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Subsystem 2: IB 서술형 다면평가 시스템 */}
          <div
            onClick={() => onSelectSubsystem('ib_assessment')}
            className="bg-white rounded-3xl border-2 border-indigo-200 p-6 sm:p-7 shadow-sm hover:shadow-lg hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs group-hover:scale-105 transition">
                  <Award className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>정상 이용 가능</span>
                </span>
              </div>

              <div className="text-xs font-semibold text-indigo-700 mb-1">서브시스템 2.2</div>
              <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition">
                IB 서술형 다면평가 시스템
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                국제 바칼로레아(IB) 기준 한국어 어문 규범, 논리적 비약 교정, TOK 질문 및 Gemini AI 실시간 첨삭을 수행하는 에세이 다면 평가 시스템입니다.
              </p>

              <div className="space-y-1.5 text-xs text-slate-500 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>PYP / MYP / DP 단계별 맞춤 채점</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>IB 27개 항목 정밀 첨삭 &amp; 실시간 문맥 평가</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
              <span>평가 시스템 입장하기</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Quick Actions & Management */}
      {/* ========================================================= */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-800">빠른 관리 및 대시보드</h4>
          <p className="text-xs text-slate-500">학생 성장 포트폴리오를 조회하거나 등록된 학생을 관리합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenUserManagement && (userProfile?.role === 'super_admin' || userProfile?.role === 'admin') && (
            <button
              onClick={onOpenUserManagement}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-xl transition cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>회원 승인 / 권한 관리</span>
            </button>
          )}

          {isStaff && onOpenStudentModal && (
            <button
              onClick={onOpenStudentModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>가족 학생 관리</span>
            </button>
          )}

          <button
            onClick={onOpenPortfolioModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>성장 분석 대시보드</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default JjunBrothersHub;
