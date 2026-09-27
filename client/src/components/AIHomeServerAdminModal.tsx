// =========================================================
// Google Gemini AI 다면평가 설정 및 이력 관리 콘솔
// (AIHomeServerAdminModal.tsx)
// =========================================================
import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Zap,
  CheckCircle2,
  Key,
  Eye,
  EyeOff,
  BookCheck,
  Calendar,
  Search,
  RotateCcw,
  Cpu,
} from 'lucide-react';
import {
  getDirectGeminiApiKey,
  setDirectGeminiApiKey,
  getDirectGeminiModel,
  setDirectGeminiModel,
  testDirectGeminiConnection,
  STORAGE_KEY_GEMINI_TEMP,
  STORAGE_KEY_GEMINI_SYSTEM_PROMPT,
} from '../services/geminiDirectService';
import {
  fetchPortfolioData,
  fetchAssessmentDetail,
  deleteAssessmentRecord,
  fetchStudents,
} from '../services/assessmentService';
import { UserProfile, AssessmentResult } from '../types/assessment';
import { StudentProfile } from '../types/student';

interface AIHomeServerAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onRestoreAssessment?: (content: string, result: AssessmentResult, title: string) => void;
  onAiConfigChange?: () => void;
}

export const AIHomeServerAdminModal: React.FC<AIHomeServerAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser: _currentUser,
  onRestoreAssessment,
  onAiConfigChange,
}) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'direct_tuning' | 'history'>('direct');

  // Gemini Direct API Mode States
  const [directApiKey, setDirectApiKey] = useState<string>(getDirectGeminiApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [directModel, setDirectModelState] = useState<string>(getDirectGeminiModel());
  const [directTemp, setDirectTemp] = useState<number>(() => {
    const s = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_GEMINI_TEMP) : null;
    return s ? parseFloat(s) : 0.2;
  });
  const [directPrompt, setDirectPrompt] = useState<string>(() => {
    return (
      (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_GEMINI_SYSTEM_PROMPT)) ||
      '당신은 국제 바칼로레아(IB) 공식 채점 기준(Criterion A 분석, Criterion B 논리 구성, Criterion C 표현, Criterion D 어문 규범)을 엄격하고 따뜻하게 적용하는 전문 평가 AI입니다. 학생의 자기주도적 성장을 촉진하고 어문 규범과 논리적 비약을 객관적으로 짚어주세요.'
    );
  });
  const [isTestingDirect, setIsTestingDirect] = useState(false);
  const [directTestResult, setDirectTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Assessment History States
  const [allHistory, setAllHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyStudentFilter, setHistoryStudentFilter] = useState('');
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDirectApiKey(getDirectGeminiApiKey());
      setDirectModelState(getDirectGeminiModel());
      loadHistory();
      fetchStudents().then(setStudentsList).catch(() => {});
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const data = await fetchPortfolioData();
      setAllHistory(data.history || []);
    } catch (err: any) {
      console.warn('평가 이력 로드 실패:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleTestDirect = async () => {
    if (!directApiKey.trim()) {
      setDirectTestResult({
        success: false,
        message: '테스트할 Google Gemini API 키를 먼저 입력해 주세요.',
      });
      return;
    }
    try {
      setIsTestingDirect(true);
      setDirectTestResult(null);
      const res = await testDirectGeminiConnection(directApiKey.trim(), directModel);
      setDirectTestResult(res);
      if (res.success) {
        setNotice({
          type: 'success',
          message: `Gemini API 연결 확인 완료! (응답 속도: ${res.latencyMs}ms)`,
        });
      } else {
        setNotice({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setDirectTestResult({
        success: false,
        message: err.message || 'API 연결 테스트 중 오류가 발생했습니다.',
      });
    } finally {
      setIsTestingDirect(false);
    }
  };

  const handleSaveDirectSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDirectGeminiApiKey(directApiKey.trim());
    setDirectGeminiModel(directModel);
    localStorage.setItem(STORAGE_KEY_GEMINI_TEMP, String(directTemp));
    localStorage.setItem(STORAGE_KEY_GEMINI_SYSTEM_PROMPT, directPrompt);
    setNotice({
      type: 'success',
      message: 'Gemini API 키 및 평가 파라미터가 브라우저에 안전하게 저장되었습니다.',
    });
    if (onAiConfigChange) {
      onAiConfigChange();
    }
  };

  const handleDeleteHistoryItem = async (item: any) => {
    const title = item.title || item.essayTitle || '이 에세이';
    if (!confirm(`'${title}'의 평가 기록을 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

    try {
      setDeletingHistoryId(String(item.id));
      await deleteAssessmentRecord(item.id);
      setNotice({ type: 'success', message: `'${title}' 평가 기록이 삭제되었습니다.` });
      await loadHistory();
    } catch (err: any) {
      setNotice({ type: 'error', message: `삭제 실패: ${err.message}` });
    } finally {
      setDeletingHistoryId(null);
    }
  };

  if (!isOpen) return null;

  // Filtered History
  const filteredHistory = allHistory.filter((item) => {
    const matchStudent =
      !historyStudentFilter ||
      (item.studentName || '').toLowerCase() === historyStudentFilter.toLowerCase();
    const matchSearch =
      !historySearchTerm ||
      (item.title || '').toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      (item.summary || '').toLowerCase().includes(historySearchTerm.toLowerCase());
    return matchStudent && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">
                  Google Gemini AI 다면평가 설정 콘솔
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-900/90 text-indigo-200 border border-indigo-700">
                  Direct Gemini
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Google AI Studio API 키 기반 실시간 고속 다면평가 설정 및 누적 이력 관리
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeTab === 'direct'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Gemini API 키 및 모델</span>
            </button>
            <button
              onClick={() => setActiveTab('direct_tuning')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeTab === 'direct_tuning'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>프롬프트 &amp; 온도 튜닝</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                loadHistory();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>평가 이력 관리 ({allHistory.length})</span>
            </button>
          </div>

          <button
            onClick={() => {
              setDirectApiKey(getDirectGeminiApiKey());
              setDirectModelState(getDirectGeminiModel());
              loadHistory();
            }}
            className="p-1.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg transition cursor-pointer"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            className={`px-6 py-2 text-xs flex items-center gap-2 font-medium shrink-0 ${
              notice.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: GEMINI DIRECT API KEYS & MODEL */}
          {activeTab === 'direct' && (
            <div className="space-y-6">
              {/* Active Engine Card */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 via-sky-50 to-white border border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">현재 활성 평가 엔진:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white border border-indigo-700 shadow-2xs">
                      ⚡ Google Gemini ({directModel})
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Firebase Cloud Functions 서버를 통해 Gemini API를 안전하게 호출하여 브라우저에 키 노출 없이 실시간 다면평가를 수행합니다.
                  </p>
                </div>
              </div>

              {/* Direct Settings Form */}
              <form onSubmit={handleSaveDirectSettings} className="space-y-5">
                {/* API Key Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-600" />
                      <span>개인 커스텀 Gemini API Key (선택 사항)</span>
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 underline underline-offset-2"
                    >
                      <span>Google AI Studio에서 무료 API 키 발급받기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={directApiKey}
                      onChange={(e) => setDirectApiKey(e.target.value)}
                      placeholder="비워두시면 Firebase Cloud Functions 서버에 구성된 표준 API 키로 자동 평가됩니다."
                      className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition shadow-2xs"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
                        title={showApiKey ? '숨기기' : '보기'}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    * 비워두시면 서버 백엔드 전용 키로 안전하게 평가되며, 개인 키를 입력하시면 브라우저 로컬 스토리지에만 저장되어 우선 사용됩니다.
                  </p>
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    사용할 Gemini 모델 선택
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition ${
                        directModel === 'gemini-3.8-flash'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="geminiModel"
                        value="gemini-3.8-flash"
                        checked={directModel === 'gemini-3.8-flash'}
                        onChange={(e) => setDirectModelState(e.target.value)}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">gemini-3.8-flash</span>
                          <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-bold">
                            권장 (고성능)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          IB 4대 루브릭 준거 심층 채점 및 20건 이상의 풍부한 인라인 첨삭 생성에 최적화
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition ${
                        directModel === 'gemini-2.5-flash'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="geminiModel"
                        value="gemini-2.5-flash"
                        checked={directModel === 'gemini-2.5-flash'}
                        onChange={(e) => setDirectModelState(e.target.value)}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">gemini-2.5-flash</span>
                          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[9px] font-semibold">
                            초고속
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          가벼운 초안 채점 및 빠른 반응 속도가 필요할 때 사용
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Connection Test Result */}
                {directTestResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      directTestResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {directTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{directTestResult.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleTestDirect}
                    disabled={isTestingDirect || !directApiKey}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingDirect ? 'animate-spin' : ''}`} />
                    <span>{isTestingDirect ? 'API 연결 테스트 중...' : 'API 연결 테스트'}</span>
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>설정 저장 및 적용</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PROMPT & TEMPERATURE TUNING */}
          {activeTab === 'direct_tuning' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      채점 엄격도 및 온도 (Temperature: {directTemp})
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono">0.0 (결정론적) ~ 1.0 (창의적)</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={directTemp}
                    onChange={(e) => setDirectTemp(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * 에세이 채점의 객관성을 위해 낮은 온도(0.1 ~ 0.3 권장)를 사용하는 것이 좋습니다.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    수석 채점관 맞춤형 시스템 지침 (Custom System Instruction)
                  </label>
                  <textarea
                    rows={5}
                    value={directPrompt}
                    onChange={(e) => setDirectPrompt(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 leading-relaxed focus:border-indigo-500 outline-none shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * 에세이 평가 시 AI에게 수석 채점관 페르소나 및 어문 규범/논리성 평가 원칙을 부여합니다.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setDirectTemp(0.2);
                      setDirectPrompt(
                        '당신은 국제 바칼로레아(IB) 공식 채점 기준(Criterion A 분석, Criterion B 논리 구성, Criterion C 표현, Criterion D 어문 규범)을 엄격하고 따뜻하게 적용하는 전문 평가 AI입니다. 학생의 자기주도적 성장을 촉진하고 어문 규범과 논리적 비약을 객관적으로 짚어주세요.'
                      );
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                  >
                    표준 기본값 복원
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem(STORAGE_KEY_GEMINI_TEMP, String(directTemp));
                      localStorage.setItem(STORAGE_KEY_GEMINI_SYSTEM_PROMPT, directPrompt);
                      setNotice({ type: 'success', message: '평가 파라미터가 성공적으로 저장되었습니다.' });
                    }}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
                  >
                    파라미터 저장
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ASSESSMENT HISTORY MANAGEMENT */}
          {activeTab === 'history' && (
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <BookCheck className="w-4 h-4 text-emerald-600" />
                    <span>누적 에세이 평가 이력 관리 (총 {filteredHistory.length}편)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    평가가 이루어질 때마다 Firestore 및 로컬 캐시에 영구 보관되며, 관리자가 열람 및 삭제할 수 있습니다.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  {/* Student Filter */}
                  <select
                    value={historyStudentFilter}
                    onChange={(e) => setHistoryStudentFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="">전체 학생</option>
                    {studentsList.map((st) => (
                      <option key={st.id} value={st.name}>
                        {st.name} ({st.gradeLevel || st.program})
                      </option>
                    ))}
                  </select>

                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-44">
                    <input
                      type="text"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      placeholder="에세이 제목 검색..."
                      className="w-full px-2.5 py-1.5 pl-7 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:bg-white"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  </div>

                  <button
                    onClick={loadHistory}
                    disabled={isLoadingHistory}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                    title="이력 다시 불러오기"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="p-8 text-center text-slate-400">평가 기록을 불러오는 중...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                  해당 조건의 저장된 평가 이력이 없습니다.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredHistory.map((h) => (
                    <div
                      key={h.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2 hover:border-indigo-300 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px]">
                              {h.studentName || '학생'}
                            </span>
                            <h4 className="font-bold text-slate-900 text-xs">{h.title}</h4>
                            {h.engine && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px]">
                                <Cpu className="w-2.5 h-2.5" />
                                <span>{h.engine}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{(h.createdAt || h.assessedAt || '').slice(0, 16).replace('T', ' ')}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-indigo-600">{h.overallScore}</span>
                          <span className="text-xs text-slate-400"> / 32점</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] flex-wrap">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          Crit A: <b>{h.scoreA}/8</b>
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          Crit B: <b>{h.scoreB}/8</b>
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          Crit C: <b>{h.scoreC}/8</b>
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                          Crit D: <b>{h.scoreD}/8</b>
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                          인라인 첨삭: {(h.annotations || []).length}건
                        </span>
                      </div>

                      {h.summary && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl leading-relaxed">
                          💡 {h.summary}
                        </p>
                      )}

                      <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(h)}
                          disabled={deletingHistoryId === String(h.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="이 평가 기록 영구 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{deletingHistoryId === String(h.id) ? '삭제 중...' : '이력 영구 삭제'}</span>
                        </button>

                        {onRestoreAssessment && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const detail = await fetchAssessmentDetail(h.id);
                                if (detail && detail.content && detail.result) {
                                  onRestoreAssessment(detail.content, detail.result, detail.title || h.title);
                                  onClose();
                                  return;
                                }
                              } catch (err) {
                                console.warn('상세 로드 실패, 캐시 복원:', err);
                              }
                              if (h.content) {
                                onRestoreAssessment(h.content, h.result || h, h.title);
                                onClose();
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>이 에세이를 화면에 불러오기</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
