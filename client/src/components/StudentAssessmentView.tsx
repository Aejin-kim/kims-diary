// =========================================================
// 학생 전용 IB 에세이 제출 및 다면평가/피드백 뷰 (StudentAssessmentView.tsx)
// =========================================================
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  ArrowRight,
  TrendingUp,
  Award,
  Sparkles,
  BookOpen,
  ChevronRight,
  PlusCircle,
  RotateCcw,
  SpellCheck,
  AlertTriangle,
  HelpCircle,
  ArrowLeft,
  Calendar,
  MessageSquare,
  Shield,
  Layers,
  History,
  GraduationCap,
} from 'lucide-react';
import {
  AssessmentGuide,
  AssessmentResult,
  EssaySubmission,
  EssaySubmissionRound,
  IBProgram,
  InlineAnnotation,
  UserProfile,
} from '../types/assessment';
import { StudentProfile } from '../types/student';
import {
  fetchSubmissions,
  createSubmission,
  submitRoundRevision,
} from '../services/assessmentService';
import { AnnotatedEssayViewer } from './AnnotatedEssayViewer';

interface StudentAssessmentViewProps {
  userProfile: UserProfile;
  currentStudent: StudentProfile | null;
  onOpenStudentModal?: () => void;
  onSwitchToEvaluator?: () => void;
  isEvaluatorUser?: boolean;
}

const DEFAULT_GUIDE: AssessmentGuide = {
  title: '서술형 논증 에세이',
  program: 'MYP',
  gradeLevel: 'MYP 3 (중2)',
  promptOverview: '주제에 대한 자신의 생각을 논리적으로 서술하고 명확한 근거와 반론을 제시하는 에세이',
  focusPoints: ['논리적 비약 방지', '어문 규범 준수', '주제 적합성 및 독창적 성찰'],
  rubricRequirements: 'IB 공식 4대 기준(A: 분석, B: 구성, C: 텍스트 생산, D: 언어 사용) 평가',
  references: [],
};

export const StudentAssessmentView: React.FC<StudentAssessmentViewProps> = ({
  userProfile,
  currentStudent,
  onOpenStudentModal,
  onSwitchToEvaluator,
  isEvaluatorUser = false,
}) => {
  // Navigation: 'list' (제출 목록) | 'create' (새 에세이 1차 제출) | 'detail' (평가 결과 및 2차 수정)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list');
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSubmission, setSelectedSubmission] = useState<EssaySubmission | null>(null);

  // New Submission Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newProgram, setNewProgram] = useState<IBProgram>(currentStudent?.program || 'MYP');
  const [newGradeLevel, setNewGradeLevel] = useState<string>(currentStudent?.gradeLevel || 'MYP 3 (중2)');
  const [newContent, setNewContent] = useState<string>('');
  const [newStudentNotes, setNewStudentNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Revision Form State (2차 퇴고 요청)
  const [isRevising, setIsRevising] = useState<boolean>(false);
  const [revisedContent, setRevisedContent] = useState<string>('');
  const [revisionNotes, setRevisionNotes] = useState<string>('');
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number>(1);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // Load submissions for current student
  const loadStudentSubmissions = async () => {
    setIsLoading(true);
    try {
      const studentName = currentStudent?.name || userProfile.name;
      const list = await fetchSubmissions({ studentName });
      setSubmissions(list);

      // If viewing detail, update current selected submission reference
      if (selectedSubmission) {
        const fresh = list.find((s) => s.id === selectedSubmission.id);
        if (fresh) setSelectedSubmission(fresh);
      }
    } catch (err) {
      console.error('에세이 제출 목록 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudentSubmissions();
  }, [currentStudent?.name, userProfile.name]);

  // Handle New Submission (1차 평가 요청)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('에세이 제목을 입력해 주세요.');
      return;
    }
    if (!newContent.trim()) {
      alert('에세이 본문 내용을 작성해 주세요.');
      return;
    }

    const studentName = currentStudent?.name || userProfile.name;
    const studentId = currentStudent?.id || String(userProfile.id);

    setIsSubmitting(true);
    try {
      const guide: AssessmentGuide = {
        ...DEFAULT_GUIDE,
        title: newTitle.trim(),
        program: newProgram,
        gradeLevel: newGradeLevel,
      };

      const created = await createSubmission({
        studentId,
        studentName,
        studentEmail: userProfile.email,
        title: newTitle.trim(),
        program: newProgram,
        gradeLevel: newGradeLevel,
        guide,
        content: newContent,
        studentNotes: newStudentNotes.trim() || '1차 평가 요청 제출',
      });

      alert(`🎉 '${newTitle}' 에세이가 성공적으로 제출되었습니다!\n평가관이 글을 심사하고 평가 피드백을 전달할 때까지 대기해 주세요.`);
      setNewTitle('');
      setNewContent('');
      setNewStudentNotes('');
      await loadStudentSubmissions();
      setSelectedSubmission(created);
      setViewMode('detail');
    } catch (err: any) {
      alert(`에세이 제출 실패: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Revision Submit (2차 평가 요청)
  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    if (!revisedContent.trim()) {
      alert('수정된 에세이 본문 내용을 작성해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await submitRoundRevision(
        selectedSubmission.id,
        revisedContent,
        revisionNotes.trim() || '1차 평가 피드백 반영 2차 퇴고본 제출'
      );

      alert(`🎉 2차 평가 요청이 성공적으로 접수되었습니다!\n평가관이 수정본을 다시 검토하고 최종 피드백을 제공합니다.`);
      setIsRevising(false);
      setRevisionNotes('');
      await loadStudentSubmissions();
      setSelectedSubmission(updated);
      setSelectedRoundNumber(updated.currentRound);
    } catch (err: any) {
      alert(`퇴고본 제출 실패: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start revision mode
  const handleStartRevision = (submission: EssaySubmission) => {
    const latestRound = submission.rounds[submission.rounds.length - 1];
    setRevisedContent(latestRound?.content || '');
    setRevisionNotes('');
    setIsRevising(true);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED_ROUND_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>1차 평가 대기중</span>
          </span>
        );
      case 'EVALUATED_ROUND_1':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>1차 평가 완료 (수정 가능)</span>
          </span>
        );
      case 'SUBMITTED_ROUND_2':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <Clock className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
            <span>2차 평가 대기중</span>
          </span>
        );
      case 'EVALUATED_ROUND_2':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>최종 평가 완료</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Helper for applying inline annotation suggestion in revision mode
  const handleApplySuggestion = (target: string, suggestion?: string) => {
    if (!suggestion || !revisedContent.includes(target)) return;
    setRevisedContent(revisedContent.replace(target, suggestion));
    alert(`💡 '${target}' 단어가 '${suggestion}'(으)로 반영되었습니다.`);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 overflow-y-auto">
      {/* Evaluator Return Banner (if user is evaluator browsing as student) */}
      {isEvaluatorUser && onSwitchToEvaluator && (
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-6 py-2.5 flex items-center justify-between text-xs shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-300" />
            <span className="font-semibold">
              평가자 계정({userProfile.name})으로 등록된 학생 프로필 모드에서 글을 작성·제출하고 있습니다.
            </span>
          </div>
          <button
            onClick={onSwitchToEvaluator}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition border border-white/20 cursor-pointer text-xs"
          >
            <span>👨‍🏫 평가자 대시보드로 돌아가기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Student Mode Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              학생 글쓰기 &amp; 다면평가 포털
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>작성자: <strong className="text-slate-800">{currentStudent?.name || userProfile.name}</strong> ({currentStudent?.gradeLevel || '중2'})</span>
              {isEvaluatorUser && onOpenStudentModal && (
                <button
                  onClick={onOpenStudentModal}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold border border-slate-200 cursor-pointer"
                >
                  학생 변경
                </button>
              )}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            IB 서술형 에세이 평가 요청 및 퇴고 피드백
          </h2>
        </div>

        {/* View Mode Actions */}
        <div className="flex items-center gap-2.5">
          {viewMode !== 'list' && (
            <button
              onClick={() => {
                setViewMode('list');
                setIsRevising(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>내 제출 목록으로</span>
            </button>
          )}

          {viewMode !== 'create' && (
            <button
              onClick={() => {
                setViewMode('create');
                setIsRevising(false);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>새 에세이 작성 및 1차 평가 요청</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {/* ========================================================= */}
        {/* VIEW 1: 에세이 제출 목록 (Dashboard) */}
        {/* ========================================================= */}
        {viewMode === 'list' && (
          <div className="space-y-6">
            {/* Quick Stat Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-xs text-slate-500 font-medium">총 제출 에세이</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{submissions.length}편</div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
                <span className="text-xs text-amber-700 font-medium">1차 평가 대기중</span>
                <div className="text-2xl font-black text-amber-800 mt-1">
                  {submissions.filter((s) => s.status === 'SUBMITTED_ROUND_1').length}편
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
                <span className="text-xs text-emerald-700 font-medium">1차 평가 완료 (퇴고 가능)</span>
                <div className="text-2xl font-black text-emerald-800 mt-1">
                  {submissions.filter((s) => s.status === 'EVALUATED_ROUND_1').length}편
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/30 shadow-2xs">
                <span className="text-xs text-purple-700 font-medium">2차 평가 완료 / 최종</span>
                <div className="text-2xl font-black text-purple-800 mt-1">
                  {submissions.filter((s) => s.status === 'EVALUATED_ROUND_2' || s.status === 'COMPLETED').length}편
                </div>
              </div>
            </div>

            {/* Submissions List Section */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">내가 제출한 에세이 목록</h3>
                  <p className="text-xs text-slate-500">
                    평가관의 피드백을 확인하고, 이를 바탕으로 2차 퇴고본을 작성하여 제출하세요.
                  </p>
                </div>
                <button
                  onClick={loadStudentSubmissions}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="새로고침"
                >
                  <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1">
                    아직 제출한 에세이가 없습니다
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
                    새 에세이를 작성하고 [1차 평가 요청]을 제출해 보세요.<br />
                    평가관이 IB 4대 기준에 따라 어문 규범과 논리를 정밀 첨삭해 드립니다.
                  </p>
                  <button
                    onClick={() => setViewMode('create')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>첫 에세이 작성 및 1차 평가 요청하기</span>
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {submissions.map((sub) => {
                    const latestRound = sub.rounds[sub.rounds.length - 1];
                    const hasEvaluated = latestRound?.isEvaluated && latestRound.result;
                    const score = latestRound?.result?.overallScore;

                    return (
                      <div
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubmission(sub);
                          setSelectedRoundNumber(sub.currentRound);
                          setIsRevising(false);
                          setViewMode('detail');
                        }}
                        className="p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              IB {sub.program}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-semibold text-slate-500">
                              {sub.currentRound}차 진행 중
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            {renderStatusBadge(sub.status)}
                          </div>

                          <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                            {sub.title}
                          </h4>

                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                            {latestRound?.content || '본문 없음'}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>제출일: {new Date(sub.updatedAt || sub.createdAt).toLocaleDateString()}</span>
                            </span>
                            {latestRound?.studentNotes && (
                              <span className="truncate max-w-xs text-slate-500">
                                메모: {latestRound.studentNotes}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Action / Score Pill */}
                        <div className="flex items-center gap-3 shrink-0">
                          {hasEvaluated ? (
                            <div className="text-right">
                              <div className="text-xs text-slate-400">성취도 점수</div>
                              <div className="text-lg font-black text-indigo-600">
                                {score} <span className="text-xs font-normal text-slate-400">/ 32점</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl font-medium">
                              평가관 심사 대기중
                            </div>
                          )}

                          <div className="p-2 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: 새 에세이 작성 및 1차 평가 요청 (Create) */}
        {/* ========================================================= */}
        {viewMode === 'create' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>1단계: 1차 초안 제출</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                새 에세이 작성 및 1차 평가 요청
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                작성한 글을 평가관에게 제출하면, IB 기준에 맞춘 정밀 첨삭과 피드백을 전달받아 수정할 수 있습니다.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-5">
              {/* Title & Program Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    에세이 제목 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="예: 인공지능 시대의 예술 창작과 인간의 고유성"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    IB 교육과정 단계
                  </label>
                  <select
                    value={newProgram}
                    onChange={(e) => setNewProgram(e.target.value as IBProgram)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  >
                    <option value="PYP">IB PYP (초등 탐구)</option>
                    <option value="MYP">IB MYP (중등 논증)</option>
                    <option value="DP">IB DP (고등 학술 소논문)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    학년 수준
                  </label>
                  <input
                    type="text"
                    value={newGradeLevel}
                    onChange={(e) => setNewGradeLevel(e.target.value)}
                    placeholder="예: 중2"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Essay Content Editor */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    에세이 본문 내용 <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    공백 포함 {newContent.length}자 / 공백 제외 {newContent.replace(/\s/g, '').length}자
                  </span>
                </div>
                <textarea
                  rows={14}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="주제에 대한 자신의 주장과 논리적 근거, 예시, 반론 검토 등을 포함하여 자유롭게 서술하세요..."
                  className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-sans"
                />
              </div>

              {/* Student Notes / Intentions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  평가관에게 전할 메모나 글의 의도 (선택)
                </label>
                <input
                  type="text"
                  value={newStudentNotes}
                  onChange={(e) => setNewStudentNotes(e.target.value)}
                  placeholder="예: 2문단의 반론 논리가 자연스러운지 중점적으로 피드백을 받고 싶습니다."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-600 transition"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  취소하고 목록으로
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? '평가 요청 제출 중...' : '1차 평가 요청 제출하기'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: 평가 결과 확인 및 피드백 기반 2차 퇴고 (Detail & Revise) */}
        {/* ========================================================= */}
        {viewMode === 'detail' && selectedSubmission && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    IB {selectedSubmission.program}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-500">
                    작성자: {selectedSubmission.studentName}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  {renderStatusBadge(selectedSubmission.status)}
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {selectedSubmission.title}
                </h3>
              </div>

              {/* Round Switcher Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs self-start md:self-auto">
                {selectedSubmission.rounds.map((r) => (
                  <button
                    key={r.round}
                    onClick={() => {
                      setSelectedRoundNumber(r.round);
                      setIsRevising(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      selectedRoundNumber === r.round && !isRevising
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.round}차 제출본 {r.isEvaluated ? '✓' : '⏳'}
                  </button>
                ))}

                {/* Revise Button for Round 1 Evaluation */}
                {selectedSubmission.status === 'EVALUATED_ROUND_1' && !isRevising && (
                  <button
                    onClick={() => handleStartRevision(selectedSubmission)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>2차 퇴고 요청하기</span>
                  </button>
                )}
              </div>
            </div>

            {/* Revision Editor View (When Student is Editing 2nd Draft) */}
            {isRevising ? (
              <div className="bg-white rounded-2xl border border-indigo-200 shadow-md p-6 sm:p-8 space-y-6">
                <div className="border-b border-indigo-100 pb-4 flex items-center justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>2단계: 1차 평가 피드백을 반영한 퇴고</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900">
                      1차 평가 바탕 글 수정 및 2차 평가 요청
                    </h4>
                    <p className="text-xs text-slate-500">
                      우측 또는 이전 1차 평가에서 지적된 어문 규범과 논리 피드백을 반영하여 본문을 수정하세요.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsRevising(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    수정 취소
                  </button>
                </div>

                <form onSubmit={handleRevisionSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Revision Textarea (7/12) */}
                    <div className="lg:col-span-7 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800">
                          수정 중인 에세이 본문
                        </label>
                        <span className="text-xs font-mono text-slate-400">
                          공백 포함 {revisedContent.length}자
                        </span>
                      </div>
                      <textarea
                        rows={16}
                        required
                        value={revisedContent}
                        onChange={(e) => setRevisedContent(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-indigo-200 rounded-2xl text-xs leading-relaxed text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-sans"
                      />

                      {/* Revision Changelog Notes */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          수정한 핵심 내용 / 퇴고 소감 (평가관에게 전달됨)
                        </label>
                        <input
                          type="text"
                          value={revisionNotes}
                          onChange={(e) => setRevisionNotes(e.target.value)}
                          placeholder="예: 평가관님께서 지적해주신 2문단의 조사 '의/에' 오류를 바로잡고, 결론 부분의 반론 근거를 보강했습니다."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>

                    {/* Right: Round 1 Feedback Panel Reference (5/12) */}
                    <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3 max-h-[560px] overflow-y-auto text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                          <SpellCheck className="w-4 h-4 text-indigo-600" />
                          <span>1차 평가 피드백 요약</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          성취도 {selectedSubmission.rounds[0]?.result?.overallScore || 0}/32점
                        </span>
                      </div>

                      {/* Evaluator Notes */}
                      {selectedSubmission.rounds[0]?.evaluatorNotes && (
                        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-slate-800">
                          <strong className="block text-[11px] text-indigo-900 font-bold mb-1">
                            평가관 총평 및 조언:
                          </strong>
                          <p className="text-[11px] leading-relaxed text-slate-700">
                            {selectedSubmission.rounds[0].evaluatorNotes}
                          </p>
                        </div>
                      )}

                      {/* Warm/Cool Feedback Pills */}
                      {selectedSubmission.rounds[0]?.result && (
                        <div className="space-y-2">
                          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                            <span className="font-bold text-amber-900 block mb-1">
                              🎯 다음 성장을 위한 도전 과제 (Cool):
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                              {selectedSubmission.rounds[0].result.coolFeedback?.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                            <span className="font-bold text-emerald-900 block mb-1">
                              👏 잘한 점 및 강점 (Warm):
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                              {selectedSubmission.rounds[0].result.warmFeedback?.map((w, i) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Inline Annotations List with One-Click Replace */}
                      <div className="pt-2">
                        <span className="font-bold text-slate-700 block mb-2">
                          정밀 첨삭 코멘트 ({selectedSubmission.rounds[0]?.result?.annotations?.length || 0}건)
                        </span>
                        <div className="space-y-2">
                          {selectedSubmission.rounds[0]?.result?.annotations?.map((ann) => (
                            <div
                              key={ann.id}
                              className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-[11px]">
                                  {ann.title}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {ann.type}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600">{ann.comment}</p>
                              {ann.suggestion && (
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[10px] text-indigo-700 font-semibold truncate">
                                    추천: {ann.suggestion}
                                  </span>
                                  {revisedContent.includes(ann.targetText) && (
                                    <button
                                      type="button"
                                      onClick={() => handleApplySuggestion(ann.targetText, ann.suggestion)}
                                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold border border-indigo-200 cursor-pointer shrink-0"
                                    >
                                      본문에 반영
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Action */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={() => setIsRevising(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? '2차 평가 요청 중...' : '🚀 2차 평가 요청 제출하기'}</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Normal Round View: Shows Content on Left and Assessment on Right */
              (() => {
                const roundData = selectedSubmission.rounds.find((r) => r.round === selectedRoundNumber) || selectedSubmission.rounds[0];
                const res = roundData.result;

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Essay Content (6/12 or 7/12) */}
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {roundData.round}차 제출 에세이 본문
                          </span>
                          <span className="text-xs text-slate-400">
                            제출: {new Date(roundData.submittedAt).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {roundData.content.length}자
                        </span>
                      </div>

                      {/* Student Submitted Notes */}
                      {roundData.studentNotes && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                          <strong className="text-slate-800">학생 메모: </strong>
                          <span>{roundData.studentNotes}</span>
                        </div>
                      )}

                      {/* Interactive Essay Content Viewer with Annotation Highlights */}
                      <AnnotatedEssayViewer
                        content={roundData.content}
                        annotations={res?.annotations || []}
                        activeAnnotationId={activeAnnotationId}
                        onSelectAnnotation={setActiveAnnotationId}
                      />

                      {/* Prompt to Revise if Round 1 Evaluated */}
                      {selectedSubmission.status === 'EVALUATED_ROUND_1' && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-emerald-950 text-xs">
                              1차 평가 결과가 반환되었습니다!
                            </h4>
                            <p className="text-[11px] text-emerald-800">
                              우측 피드백을 확인하고 글을 보완하여 2차 평가를 요청할 수 있습니다.
                            </p>
                          </div>
                          <button
                            onClick={() => handleStartRevision(selectedSubmission)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>1차 평가 바탕으로 수정하기</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Assessment Result / Evaluation Status (5/12) */}
                    <div className="lg:col-span-5 space-y-4">
                      {!roundData.isEvaluated || !res ? (
                        <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-4 shadow-xs">
                          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                            <Clock className="w-7 h-7 animate-pulse text-amber-500" />
                          </div>
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                              {roundData.round}차 평가 심사 대기 중
                            </span>
                            <h4 className="text-base font-bold text-slate-900">
                              평가관이 글을 심사하고 있습니다
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              평가관이 학생별 제출 리스트에서 본 에세이를 확인하고 채점 중입니다.<br />
                              평가가 완료되면 4대 기준 점수와 정밀 첨삭 피드백이 이곳에 표시됩니다.
                            </p>
                          </div>
                          <button
                            onClick={loadStudentSubmissions}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>평가 상태 확인 (새로고침)</span>
                          </button>
                        </div>
                      ) : (
                        /* Evaluated Card Display */
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                          {/* Score Header */}
                          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                {roundData.round}차 다면평가 결과
                              </span>
                              <div className="text-xs text-slate-400 mt-1">
                                평가관: <strong className="text-slate-700">{roundData.evaluatorName || 'IB 채점관'}</strong> · {new Date(roundData.evaluatedAt || '').toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-400 block font-medium">총 성취도</span>
                              <span className="text-2xl font-black text-indigo-600">
                                {res.overallScore}{' '}
                                <span className="text-xs font-normal text-slate-400">/ 32점</span>
                              </span>
                            </div>
                          </div>

                          {/* Evaluator Notes */}
                          {roundData.evaluatorNotes && (
                            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950">
                              <strong className="block font-bold text-indigo-900 mb-1">
                                💬 평가관 총평 및 종합 조언
                              </strong>
                              <p className="leading-relaxed text-slate-700 text-[11px]">
                                {roundData.evaluatorNotes}
                              </p>
                            </div>
                          )}

                          {/* IB 4-Criteria Grid */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-800 block">
                              IB 4대 평가 준거 성취도
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(res.criteria).map(([key, crit]) => (
                                <div
                                  key={key}
                                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-left"
                                >
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-bold text-slate-800">{crit.nameKr}</span>
                                    <span className="font-black text-indigo-600">
                                      {crit.score} <span className="text-[10px] text-slate-400">/ 8</span>
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${(crit.score / 8) * 100}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-1">
                                    {crit.feedback || crit.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Warm & Cool Feedback */}
                          <div className="space-y-2 text-xs">
                            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                              <span className="font-bold text-emerald-900 block mb-1">
                                👏 칭찬 및 강점 (Warm Feedback)
                              </span>
                              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                                {res.warmFeedback?.map((w, i) => (
                                  <li key={i}>{w}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3">
                              <span className="font-bold text-amber-900 block mb-1">
                                💡 성장을 위한 보완점 (Cool Feedback)
                              </span>
                              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                                {res.coolFeedback?.map((c, i) => (
                                  <li key={i}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Annotations List */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">
                                정밀 첨삭 항목 ({res.annotations?.length || 0}건)
                              </span>
                            </div>
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {res.annotations?.map((ann) => (
                                <div
                                  key={ann.id}
                                  className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-900 text-[11px]">
                                      {ann.title}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                      {ann.targetText}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">{ann.comment}</p>
                                  {ann.suggestion && (
                                    <div className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                                      수정 제안: {ann.suggestion}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}
      </div>
    </div>
  );
};
