// =========================================================
// 쭌이형제네 비로그인 공식 랜딩 홈페이지 (JjunBrothersLandingPage.tsx)
// =========================================================
import React from 'react';
import {
  Award,
  Sparkles,
  Camera,
  Heart,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Layers,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { AIHomeServerStatus } from '../services/aiBridgeService';

interface LandingProps {
  onLoginWithGoogle: () => void;
  isLoggingIn?: boolean;
  aiServerStatus: AIHomeServerStatus | null;
  onRefreshAiStatus: () => void;
}

export const JjunBrothersLandingPage: React.FC<LandingProps> = ({
  onLoginWithGoogle,
  isLoggingIn = false,
  aiServerStatus,
  onRefreshAiStatus,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40 text-slate-800 flex flex-col font-sans">
      {/* ========================================================= */}
      {/* 1. Header Navigation Bar */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-sm ring-2 ring-indigo-100">
            <Heart className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">쭌이형제네</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                가족 통합 포털
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              소중한 추억의 가족앨범 &amp; IBO 기준 실시간 AI 다면평가
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* AI Home Server Status Lamp */}
          {aiServerStatus && aiServerStatus.aiOnline ? (
            <div
              onClick={onRefreshAiStatus}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg cursor-pointer hover:bg-emerald-100 transition shadow-2xs"
              title={`AI 서비스 정상 연결됨 (지연: ${aiServerStatus.latencyMs ?? 0}ms)`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">AI 서비스 정상</span>
              <span className="text-[10px] text-emerald-600 font-mono">({aiServerStatus.latencyMs ?? 0}ms)</span>
            </div>
          ) : (
            <div
              onClick={onRefreshAiStatus}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100 transition shadow-2xs"
              title="AI 서비스 확인 중"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="hidden sm:inline">AI 서비스 확인</span>
              <RefreshCw className="w-3 h-3 text-amber-600" />
            </div>
          )}

          {/* Quick Google Sign-up / Login Button */}
          <button
            onClick={onLoginWithGoogle}
            disabled={isLoggingIn}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 hover:border-indigo-400 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
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
            )}
            <span>Google 로그인</span>
          </button>
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. Main Hero Section */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-8 max-w-6xl mx-auto w-full text-center">
        {/* Decorative background glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-sky-200/40 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs font-bold mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>쭌이형제네 가족 통합 포털 &amp; Gemini AI 평가 시스템</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
          우리 아이들의 생각과 성장을 기록하는
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-800 bg-clip-text text-transparent">
            쭌이형제네 가족 통합 공간
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed mb-8">
          소중한 추억을 영구 보관하는 <strong>가족앨범</strong>과 
          국제 바칼로레아(IB) 기준 최신 <strong>Gemini AI 실시간 다면평가</strong>가 결합된 통합 플랫폼입니다.
          Google 계정으로 간편하게 시작해 보세요.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-12">
          <button
            onClick={onLoginWithGoogle}
            disabled={isLoggingIn}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition shadow-md hover:shadow-lg transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isLoggingIn ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#ffffff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#ffffff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#ffffff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#ffffff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Google 계정으로 1초 만에 시작하기</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          ✓ 별도의 복잡한 이메일 가입이나 6자리 승인 대기 없이 Google 계정으로 즉시 로그인됩니다.
        </p>
      </section>

      {/* ========================================================= */}
      {/* 3. Subsystem Preview Cards */}
      {/* ========================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-8 w-full mb-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            쭌이형제네 핵심 서브시스템
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            가족을 위한 따뜻한 추억 보관소와 학술적 비판적 사고를 키우는 에세이 평가 도구
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: 가족앨범 시스템 */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs hover:shadow-md transition flex flex-col justify-between relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/60 rounded-full blur-2xl group-hover:bg-amber-200/50 transition -z-10"></div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>향후 오픈 예정</span>
                </span>
              </div>

              <div className="text-xs font-semibold text-amber-700 mb-1">서브시스템 2.1</div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">가족앨범 시스템</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                아이들의 일상 사진, 여행 추억, 학교 생활 기록을 외부 유출 걱정 없이 프라이빗 클라우드에 영구 보관하고 타임라인으로 열람합니다.
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>아이별 성장 타임라인 및 캘린더 연동</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>가족만의 기념일 및 이벤트 앨범</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>준비 로드맵 진행 중</span>
              <span className="text-amber-700 font-bold">오픈 예정</span>
            </div>
          </div>

          {/* Card 2: IB 서술형 다면평가 시스템 */}
          <div className="bg-white rounded-3xl border-2 border-indigo-200/80 p-6 sm:p-8 shadow-sm hover:shadow-lg transition flex flex-col justify-between relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/60 rounded-full blur-2xl group-hover:bg-indigo-200/60 transition -z-10"></div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Award className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>정상 이용 가능</span>
                </span>
              </div>

              <div className="text-xs font-semibold text-indigo-700 mb-1">서브시스템 2.2</div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">IB 서술형 다면평가 시스템</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                국제 바칼로레아(IB) 4대 기준(Criterion A, B, C, D)에 따른 한국어 어문 규범, 논리적 비약 교정, TOK 질문 및 Gemini AI 실시간 첨삭 시스템입니다.
              </p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>PYP(초등), MYP(중등), DP(고등) 단계별 루브릭 자동 채점</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>A4 9페이지 이상 긴 글도 완벽한 영역별 인라인 첨삭</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>학생별 평가 이력 추적 및 N차 퇴고 버전 관리</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-indigo-600 font-medium">Google 로그인 후 즉시 이용</span>
              <button
                onClick={onLoginWithGoogle}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs cursor-pointer"
              >
                <span>시작하기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. Feature Highlights */}
      {/* ========================================================= */}
      <section className="bg-slate-50 border-t border-slate-200/80 py-12 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <Cpu className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">최신 Gemini AI 모델</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                gemini-3.8-flash 등 원하는 최신 모델을 화면에서 즉시 선택하고 테스트할 수 있습니다.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">IB 4대 준거 정밀 채점</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                분석(A), 구성(B), 텍스트(C), 언어(D) 영역을 32점 만점 루브릭으로 다면 평가합니다.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">성장 분석 및 이력 관리</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                학생별 에세이 누적 평가 기록을 Firestore에 자동 저장하고 추이를 분석합니다.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">N차 퇴고 다중 버전</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                초안부터 수정본까지 버전별로 기록하며 글쓰기 개선 과정을 단계별로 확인합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. Footer */}
      {/* ========================================================= */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 px-4 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">쭌이형제네 가족 통합 포털</p>
        <p>Copyright © 2026 쭌이형제네. All rights reserved. Powered by Google Gemini AI &amp; Firebase.</p>
      </footer>
    </div>
  );
};
export default JjunBrothersLandingPage;
