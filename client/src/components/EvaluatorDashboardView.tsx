// =========================================================
// 평가자 전용 IB 에세이 대시보드 및 채점/피드백 반환 뷰 (EvaluatorDashboardView.tsx)
// =========================================================
import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Search,
  Filter,
  FileText,
  Send,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  UserPlus,
  Trash2,
  Calendar,
  Layers,
  HelpCircle,
  SpellCheck,
  BookOpen,
  ArrowLeft,
  GraduationCap,
  Edit3,
} from 'lucide-react';
import {
  AssessmentGuide,
  AssessmentResult,
  EssaySubmission,
  EssaySubmissionRound,
  IBProgram,
  InlineAnnotation,
  UserProfile,
  SubmissionStatus,
} from '../types/assessment';
import { StudentProfile } from '../types/student';
import {
  fetchSubmissions,
  submitEvaluationResult,
  deleteSubmission,
  checkIfUserIsRegisteredStudent,
  registerUserAsStudent,
} from '../services/assessmentService';
import { evaluateEssayDynamic, AIHomeServerStatus } from '../services/aiBridgeService';
import { AnnotatedEssayViewer } from './AnnotatedEssayViewer';
import { validateKoreanRules } from '../services/koreanRuleValidator';
import { AnnotationType } from '../types/assessment';

interface EvaluatorDashboardViewProps {
  userProfile: UserProfile;
  aiServerStatus: AIHomeServerStatus | null;
  onRefreshAiStatus: () => void;
  onOpenAiAdmin?: () => void;
  onSwitchToStudentMode: (student: StudentProfile) => void;
  onOpenStudentModal?: () => void;
  onOpenUserManagement?: () => void;
  onOpenPortfolioModal?: () => void;
}

export const EvaluatorDashboardView: React.FC<EvaluatorDashboardViewProps> = ({
  userProfile,
  aiServerStatus,
  onRefreshAiStatus,
  onOpenAiAdmin,
  onSwitchToStudentMode,
  onOpenStudentModal,
  onOpenUserManagement,
  onOpenPortfolioModal,
}) => {
  const [submissions, setSubmissions] = useState<EssaySubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedSubmission, setSelectedSubmission] = useState<EssaySubmission | null>(null);
  const [isEvaluationStudioOpen, setIsEvaluationStudioOpen] = useState<boolean>(false);

  // Filters
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'pending' | 'evaluated'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Evaluation Studio Form State
  const [activeRoundNumber, setActiveRoundNumber] = useState<number>(1);
  const [isAiEvaluating, setIsAiEvaluating] = useState<boolean>(false);
  const [isReturningResult, setIsReturningResult] = useState<boolean>(false);

  // Evaluation Form Draft
  const [scoreA, setScoreA] = useState<number>(6);
  const [scoreB, setScoreB] = useState<number>(6);
  const [scoreC, setScoreC] = useState<number>(6);
  const [scoreD, setScoreD] = useState<number>(6);
  const [evaluatorNotes, setEvaluatorNotes] = useState<string>('');
  const [warmFeedback, setWarmFeedback] = useState<string[]>([
    '논리적 전개와 주제에 대한 성찰적 태도가 돋보입니다.',
  ]);
  const [coolFeedback, setCoolFeedback] = useState<string[]>([
    '주장에 대한 구체적 반론 검토와 어문 규범 정밀 퇴고가 필요합니다.',
  ]);
  const [annotations, setAnnotations] = useState<InlineAnnotation[]>([]);
  const [studioTab, setStudioTab] = useState<'annotations' | 'rubric' | 'summary'>('annotations');
  const [annotationTypeFilter, setAnnotationTypeFilter] = useState<'all' | AnnotationType>('all');
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [newAnnotationForm, setNewAnnotationForm] = useState<{
    isOpen: boolean;
    targetText: string;
    type: AnnotationType;
    title: string;
    comment: string;
    suggestion: string;
  }>({
    isOpen: false,
    targetText: '',
    type: 'grammar',
    title: '',
    comment: '',
    suggestion: '',
  });

  // Student Registration Modal for Evaluator
  const [isStudentRegistrationPromptOpen, setIsStudentRegistrationPromptOpen] = useState<boolean>(false);
  const [isRegisteringStudent, setIsRegisteringStudent] = useState<boolean>(false);

  // Load all submissions
  const loadAllSubmissions = async () => {
    setIsLoading(true);
    try {
      const list = await fetchSubmissions();
      setSubmissions(list);
    } catch (err) {
      console.error('제출물 목록 조회 실패:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllSubmissions();
  }, []);

  // Handle Evaluator Writing as Student: check if already registered
  const handleCheckAndSwitchToStudent = async () => {
    try {
      const check = await checkIfUserIsRegisteredStudent(userProfile.email, userProfile.name);
      if (check.isRegistered && check.studentProfile) {
        onSwitchToStudentMode(check.studentProfile);
      } else {
        // Not registered -> Open prompt to register
        setIsStudentRegistrationPromptOpen(true);
      }
    } catch (err) {
      console.error('학생 등록 검사 실패:', err);
      setIsStudentRegistrationPromptOpen(true);
    }
  };

  // Perform Registration of Evaluator as Student
  const handleConfirmRegisterAsStudent = async () => {
    setIsRegisteringStudent(true);
    try {
      const created = await registerUserAsStudent(userProfile, 'MYP', 'MYP 3 (중2)');
      alert(`🎉 '${userProfile.name}'님이 학생 프로필로 등록되었습니다.\n이제 학생 모드로 전환하여 자유롭게 글을 작성하고 평가를 요청하실 수 있습니다.`);
      setIsStudentRegistrationPromptOpen(false);
      onSwitchToStudentMode(created);
    } catch (err: any) {
      alert(`학생 등록 실패: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      setIsRegisteringStudent(false);
    }
  };

  // Open Evaluation Studio for a submission
  const handleOpenStudio = (submission: EssaySubmission) => {
    setSelectedSubmission(submission);
    const targetRound = submission.rounds[submission.rounds.length - 1];
    setActiveRoundNumber(targetRound?.round || 1);
    setStudioTab('annotations');
    setAnnotationTypeFilter('all');

    if (targetRound?.result) {
      // Pre-fill existing evaluation
      const res = targetRound.result;
      setScoreA(res.criteria?.criterionA?.score || 6);
      setScoreB(res.criteria?.criterionB?.score || 6);
      setScoreC(res.criteria?.criterionC?.score || 6);
      setScoreD(res.criteria?.criterionD?.score || 6);
      setWarmFeedback(res.warmFeedback || ['문장의 유려함과 주제에 대한 주체적 탐구 태도가 돋보입니다.']);
      setCoolFeedback(res.coolFeedback || ['반론에 대한 검토를 보강하고 문장 간 논리적 연결성을 더 다듬어 보세요.']);

      let existingAnns = res.annotations || [];
      if (existingAnns.length === 0 && targetRound.content) {
        existingAnns = validateKoreanRules(targetRound.content);
      }
      setAnnotations(existingAnns);
      if (existingAnns.length > 0) {
        setActiveAnnotationId(existingAnns[0].id);
      } else {
        setActiveAnnotationId(null);
      }
      setEvaluatorNotes(targetRound.evaluatorNotes || res.overallSummary || '');
    } else {
      // Instant automated Korean rule & error inspection upon opening new evaluation!
      const initialRules = targetRound?.content ? validateKoreanRules(targetRound.content) : [];
      const grammarIssues = initialRules.filter((r) => r.type === 'grammar').length;
      const logicIssues = initialRules.filter((r) => r.type === 'logic').length;

      // Realistic starting criterion scores based on detected rules
      const initScoreD = Math.max(4, 8 - Math.min(4, Math.floor(grammarIssues / 2)));
      const initScoreB = Math.max(4, 8 - Math.min(3, logicIssues));
      setScoreA(6);
      setScoreB(initScoreB);
      setScoreC(6);
      setScoreD(initScoreD);
      setWarmFeedback(['문장의 유려함과 주제에 대한 주체적 탐구 태도가 돋보입니다.']);
      setCoolFeedback([
        grammarIssues > 0
          ? `어문 규범(${grammarIssues}건 검출) 및 띄어쓰기 오류를 보완하고 문장 간 논리 연결성을 더 다듬어 보세요.`
          : '반론에 대한 검토를 보강하고 문장 간 논리적 연결성을 더 다듬어 보세요.',
      ]);
      setAnnotations(initialRules);
      if (initialRules.length > 0) {
        setActiveAnnotationId(initialRules[0].id);
      } else {
        setActiveAnnotationId(null);
      }
      setEvaluatorNotes(
        initialRules.length > 0
          ? `[자동 어문 규범 및 오류 검증 완료: ${initialRules.length}건]\n학생이 작성한 에세이의 맞춤법, 띄어쓰기 및 논리 흐름을 1차 검증하였습니다. 우측의 [⚡ AI 채점 초안 생성]을 통해 심층 분석을 받거나 직접 점수와 조언을 수정하세요.`
          : ''
      );
    }

    setIsEvaluationStudioOpen(true);
  };

  // AI-Assisted Auto Assessment Draft Generation
  const handleRunAiAssistedEvaluation = async () => {
    if (!selectedSubmission) return;
    const targetRound = selectedSubmission.rounds.find((r) => r.round === activeRoundNumber);
    if (!targetRound) return;

    setIsAiEvaluating(true);
    try {
      const res = await evaluateEssayDynamic(
        targetRound.content,
        selectedSubmission.guide,
        selectedSubmission.studentName
      );

      const aiResult = res.result;
      setScoreA(aiResult.criteria?.criterionA?.score || 6);
      setScoreB(aiResult.criteria?.criterionB?.score || 6);
      setScoreC(aiResult.criteria?.criterionC?.score || 6);
      setScoreD(aiResult.criteria?.criterionD?.score || 6);
      setWarmFeedback(aiResult.warmFeedback || []);
      setCoolFeedback(aiResult.coolFeedback || []);

      // Merge AI annotations with rule-based annotations, deduplicating targetText
      const ruleAnnotations = validateKoreanRules(targetRound.content);
      const combined = [...(aiResult.annotations || [])];
      ruleAnnotations.forEach((r) => {
        if (!combined.some((c) => c.targetText === r.targetText)) {
          combined.push(r);
        }
      });
      combined.sort((a, b) => targetRound.content.indexOf(a.targetText) - targetRound.content.indexOf(b.targetText));

      setAnnotations(combined);
      if (combined.length > 0) {
        setActiveAnnotationId(combined[0].id);
      }
      setEvaluatorNotes(
        `${aiResult.overallSummary}\n\n[적용 AI 엔진: ${res.engine}]`
      );

      alert(
        `⚡ AI 정밀 채점 초안 생성이 완료되었습니다!\n총 성취도: ${aiResult.overallScore}/32점\n첨삭 항목: ${combined.length}건\n\n점수와 코멘트를 확인·수정하신 후 [평가 결과 확정 및 학생에게 반환]을 클릭하세요.`
      );
    } catch (err: any) {
      alert(`AI 채점 실패: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      setIsAiEvaluating(false);
    }
  };

  // Delete an annotation
  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (activeAnnotationId === id) {
      setActiveAnnotationId(null);
    }
  };

  // Re-run instant rule validator
  const handleRevalidateRules = () => {
    if (!selectedSubmission) return;
    const targetRound = selectedSubmission.rounds.find((r) => r.round === activeRoundNumber);
    if (!targetRound) return;
    const freshRules = validateKoreanRules(targetRound.content);
    setAnnotations((prev) => {
      const merged = [...prev];
      freshRules.forEach((r) => {
        if (!merged.some((m) => m.targetText === r.targetText)) {
          merged.push(r);
        }
      });
      merged.sort((a, b) => targetRound.content.indexOf(a.targetText) - targetRound.content.indexOf(b.targetText));
      return merged;
    });
    alert(`규칙 재검증이 완료되었습니다. (총 ${freshRules.length}건의 어문/논리 규칙 검출)`);
  };

  // Add manual annotation
  const handleAddAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnotationForm.targetText.trim() || !newAnnotationForm.title.trim()) {
      alert('대상 문장과 제목을 입력하세요.');
      return;
    }
    const targetRound = selectedSubmission?.rounds.find((r) => r.round === activeRoundNumber);
    if (targetRound && !targetRound.content.includes(newAnnotationForm.targetText.trim())) {
      alert('입력하신 대상 문장이 본문에 정확히 존재해야 하이라이트가 표시됩니다. 본문에서 복사해 입력해 주세요.');
      return;
    }
    const newAnn: InlineAnnotation = {
      id: `manual-ann-${Date.now()}`,
      type: newAnnotationForm.type,
      targetText: newAnnotationForm.targetText.trim(),
      title: newAnnotationForm.title.trim(),
      comment: newAnnotationForm.comment.trim(),
      suggestion: newAnnotationForm.suggestion.trim() || undefined,
    };
    setAnnotations((prev) => {
      const updated = [...prev, newAnn];
      if (targetRound) {
        updated.sort((a, b) => targetRound.content.indexOf(a.targetText) - targetRound.content.indexOf(b.targetText));
      }
      return updated;
    });
    setActiveAnnotationId(newAnn.id);
    setNewAnnotationForm({
      isOpen: false,
      targetText: '',
      type: 'grammar',
      title: '',
      comment: '',
      suggestion: '',
    });
  };

  // Finalize and Return Evaluation Result to Student
  const handleReturnEvaluationToStudent = async () => {
    if (!selectedSubmission) return;

    const overallScore = Math.min(32, Math.max(4, scoreA + scoreB + scoreC + scoreD));
    const finalResult: AssessmentResult = {
      assessedAt: new Date().toISOString(),
      overallScore,
      overallSummary: evaluatorNotes || '평가관 다면평가 완료',
      warmFeedback,
      coolFeedback,
      criteria: {
        criterionA: {
          name: 'Analyzing',
          nameKr: '분석 및 이해',
          score: scoreA,
          maxScore: 8,
          description: '텍스트 분석 및 주제 이해도',
          feedback: '주제와 원문에 대한 비판적 이해력',
        },
        criterionB: {
          name: 'Organizing',
          nameKr: '논리적 구성',
          score: scoreB,
          maxScore: 8,
          description: '문단 구조 및 논리적 일관성',
          feedback: '도입-본론-결론의 유기적 연결성',
        },
        criterionC: {
          name: 'Producing Text',
          nameKr: '텍스트 생산',
          score: scoreC,
          maxScore: 8,
          description: '창의적 통찰 및 성찰적 표현',
          feedback: '자신의 관점 수립 및 독창적 성찰',
        },
        criterionD: {
          name: 'Using Language',
          nameKr: '언어 규범',
          score: scoreD,
          maxScore: 8,
          description: '어문 규범 및 학술적 어휘 사용',
          feedback: '맞춤법, 띄어쓰기, 문체 적합성',
        },
      },
      annotations,
      guidingQuestions: [
        '자신의 주장이 다른 관점에서는 어떻게 반박될 수 있을지 검토해 보세요.',
      ],
    };

    setIsReturningResult(true);
    try {
      const updated = await submitEvaluationResult(
        selectedSubmission.id,
        activeRoundNumber,
        finalResult,
        evaluatorNotes,
        userProfile.name
      );

      alert(
        `🎉 '${selectedSubmission.studentName}' 학생의 ${activeRoundNumber}차 에세이 평가 결과가 성공적으로 확정되어 학생에게 반환되었습니다!\n\n학생 포털에서 피드백을 확인하고 2차 퇴고 요청을 진행할 수 있습니다.`
      );

      setIsEvaluationStudioOpen(false);
      await loadAllSubmissions();
    } catch (err: any) {
      alert(`평가 반환 실패: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      setIsReturningResult(false);
    }
  };

  // Delete Submission handler
  const handleDeleteSubmission = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 에세이 제출 건과 평가 기록을 삭제하시겠습니까?')) {
      await deleteSubmission(id);
      await loadAllSubmissions();
    }
  };

  // Unique Students list for filter dropdown
  const uniqueStudents = Array.from(new Set(submissions.map((s) => s.studentName))).filter(Boolean);

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesStudent =
      selectedStudentFilter === 'all' || sub.studentName === selectedStudentFilter;

    let matchesStatus = true;
    if (selectedStatusFilter === 'pending') {
      matchesStatus = sub.status === 'SUBMITTED_ROUND_1' || sub.status === 'SUBMITTED_ROUND_2';
    } else if (selectedStatusFilter === 'evaluated') {
      matchesStatus = sub.status === 'EVALUATED_ROUND_1' || sub.status === 'EVALUATED_ROUND_2' || sub.status === 'COMPLETED';
    }

    const matchesSearch =
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStudent && matchesStatus && matchesSearch;
  });

  const pendingCount = submissions.filter(
    (s) => s.status === 'SUBMITTED_ROUND_1' || s.status === 'SUBMITTED_ROUND_2'
  ).length;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-0 overflow-y-auto">
      {/* Top Banner & Mode Switcher Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
              <span>평가관 대시보드</span>
            </span>
            <span className="text-xs text-slate-500">
              로그인: <strong className="text-slate-800">{userProfile.name}</strong> ({userProfile.role})
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            학생 에세이 제출 현황 조회 및 다면 채점·피드백 센터
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* AI Home Server Status Button */}
          {onOpenAiAdmin && (
            <button
              onClick={() => {
                onRefreshAiStatus();
                onOpenAiAdmin();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-900 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition shadow-2xs cursor-pointer"
              title="Gemini AI 모델 및 엔진 설정 열기"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    aiServerStatus?.aiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>AI 설정</span>
              </span>
            </button>
          )}

          {/* User Management for Admins */}
          {onOpenUserManagement && (userProfile.role === 'super_admin' || userProfile.role === 'admin') && (
            <button
              onClick={onOpenUserManagement}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-purple-600" />
              <span>회원 승인 관리</span>
            </button>
          )}

          {/* Write as Student Button (With student registration requirement) */}
          <button
            onClick={handleCheckAndSwitchToStudent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
            title="평가자도 학생으로 등록되어 있다면 직접 글을 작성하고 평가를 요청할 수 있습니다."
          >
            <Edit3 className="w-4 h-4" />
            <span>✍️ 학생 모드로 글 작성하기</span>
          </button>

          {/* Quick Shortcuts */}
          {onOpenStudentModal && (
            <button
              onClick={onOpenStudentModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>가족 학생 관리</span>
            </button>
          )}

          {onOpenPortfolioModal && (
            <button
              onClick={onOpenPortfolioModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>누적 성장 분석</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Statistics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs text-slate-500 font-medium">전체 제출 에세이</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{submissions.length}편</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-2xs">
            <span className="text-xs text-amber-700 font-medium">평가 대기 (채점 필요)</span>
            <div className="text-2xl font-black text-amber-800 mt-1 flex items-center gap-2">
              <span>{pendingCount}편</span>
              {pendingCount > 0 && (
                <span className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded-full font-bold animate-pulse">
                  NEW
                </span>
              )}
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-sky-200 bg-sky-50/30 shadow-2xs">
            <span className="text-xs text-sky-700 font-medium">2차 퇴고본 제출</span>
            <div className="text-2xl font-black text-sky-800 mt-1">
              {submissions.filter((s) => s.status === 'SUBMITTED_ROUND_2').length}편
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-2xs">
            <span className="text-xs text-emerald-700 font-medium">평가 및 피드백 완료</span>
            <div className="text-2xl font-black text-emerald-800 mt-1">
              {submissions.filter((s) => s.status === 'EVALUATED_ROUND_1' || s.status === 'EVALUATED_ROUND_2' || s.status === 'COMPLETED').length}편
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Student Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">전체 학생 ({submissions.length})</option>
                {uniqueStudents.map((st) => (
                  <option key={st} value={st}>
                    {st} 학생
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Tabs */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 font-semibold">
              <button
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  selectedStatusFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedStatusFilter('pending')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  selectedStatusFilter === 'pending' ? 'bg-white text-amber-800 font-bold shadow-2xs' : 'text-slate-600'
                }`}
              >
                <span>채점 대기</span>
                {pendingCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                )}
              </button>
              <button
                onClick={() => setSelectedStatusFilter('evaluated')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  selectedStatusFilter === 'evaluated' ? 'bg-white text-emerald-800 font-bold shadow-2xs' : 'text-slate-600'
                }`}
              >
                평가 완료
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="학생 이름 또는 제목 검색..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Submissions List Table / Card View */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">
              학생별 에세이 제출 리스트 ({filteredSubmissions.length})
            </h3>
            <button
              onClick={loadAllSubmissions}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="새로고침"
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">해당 조건의 학생 에세이가 없습니다.</p>
              <p className="text-slate-400 mt-0.5">학생이 글을 제출하면 이곳에 실시간으로 표시됩니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredSubmissions.map((sub) => {
                const latestRound = sub.rounds[sub.rounds.length - 1];
                const isPending = !latestRound?.isEvaluated;
                const isRound2 = sub.currentRound >= 2;

                return (
                  <div
                    key={sub.id}
                    onClick={() => handleOpenStudio(sub)}
                    className="p-5 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {sub.studentName} 학생
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          IB {sub.program} ({sub.gradeLevel})
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-bold text-slate-600">
                          {sub.currentRound}차 제출
                        </span>
                        {isRound2 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            1차 피드백 반영 퇴고본
                          </span>
                        )}
                        <span className="text-xs text-slate-400">·</span>
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            <span>채점 대기중</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>평가 완료 ({latestRound?.result?.overallScore}점)</span>
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                        {sub.title}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                        {latestRound?.content}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>제출일: {new Date(sub.updatedAt || sub.createdAt).toLocaleString()}</span>
                        </span>
                        {latestRound?.studentNotes && (
                          <span className="text-indigo-700 font-semibold truncate max-w-sm">
                            메모: {latestRound.studentNotes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStudio(sub);
                        }}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                          isPending
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>채점 및 피드백 작성</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-3.5 h-3.5" />
                            <span>결과 조회 및 재평가</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={(e) => handleDeleteSubmission(sub.id, e)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                        title="제출물 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* EVALUATION STUDIO MODAL: 에세이 채점 및 학생 반환 작업대 */}
      {/* ========================================================= */}
      {isEvaluationStudioOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Studio Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    {selectedSubmission.studentName} 학생
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    IB {selectedSubmission.program} ({selectedSubmission.gradeLevel})
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {activeRoundNumber}차 채점 작업대
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedSubmission.title}
                </h3>
              </div>

              {/* Round Switcher & Close */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl text-xs">
                  {selectedSubmission.rounds.map((r) => (
                    <button
                      key={r.round}
                      onClick={() => setActiveRoundNumber(r.round)}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        activeRoundNumber === r.round ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      {r.round}차 제출본
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsEvaluationStudioOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Studio Body: Split View (Left: Student Essay, Right: Evaluator Scoring & AI Assistant) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden text-xs">
              {/* Left Column: Student Submitted Text & Revision Notes (6/12) */}
              <div className="lg:col-span-6 border-r border-slate-200 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                {(() => {
                  const targetRound = selectedSubmission.rounds.find((r) => r.round === activeRoundNumber) || selectedSubmission.rounds[0];

                  return (
                    <>
                      {/* Round Header & Student Notes */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{targetRound.round}차 제출 본문 (글자 수: {targetRound.content.length}자)</span>
                          </span>
                          <span className="text-slate-400">
                            제출: {new Date(targetRound.submittedAt).toLocaleString()}
                          </span>
                        </div>

                        {targetRound.studentNotes && (
                          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-slate-700">
                            <strong className="text-indigo-900 block font-bold mb-0.5">
                              학생의 제출 메모 / 수정 사유:
                            </strong>
                            <p className="leading-relaxed">{targetRound.studentNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Interactive Essay Content Viewer with Real-Time Annotation Highlighting */}
                      <AnnotatedEssayViewer
                        content={targetRound.content}
                        annotations={annotations}
                        activeAnnotationId={activeAnnotationId}
                        onSelectAnnotation={(id) => {
                          setActiveAnnotationId(id);
                          setStudioTab('annotations');
                        }}
                      />
                    </>
                  );
                })()}
              </div>

              {/* Right Column: Scoring, Annotations & Feedback Workspace (6/12) */}
              <div className="lg:col-span-6 p-6 overflow-y-auto space-y-4 bg-white flex flex-col">
                {/* AI Assistant Quick Generator Banner */}
                <div className="bg-gradient-to-r from-indigo-50 via-sky-50 to-purple-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span>Gemini AI 채점 어시스턴트 &amp; 정밀 검증</span>
                    </span>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      오탈자, 띄어쓰기 규범, 논리 모순/비약, TOK 질문 및 IB 4대 기준 점수를 원클릭으로 추출합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRevalidateRules}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs shadow-2xs transition cursor-pointer"
                      title="한국어 어문 규범 및 논리 규칙 즉시 재검증"
                    >
                      규칙 재검증
                    </button>
                    <button
                      onClick={handleRunAiAssistedEvaluation}
                      disabled={isAiEvaluating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer shrink-0"
                    >
                      <span>{isAiEvaluating ? 'AI 정밀 분석 중...' : '⚡ AI 채점 초안 생성'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Tabs Navigation Bar */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs border border-slate-200">
                  <button
                    onClick={() => setStudioTab('annotations')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition text-center cursor-pointer ${
                      studioTab === 'annotations'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>인라인 첨삭 ({annotations.length}건)</span>
                  </button>
                  <button
                    onClick={() => setStudioTab('rubric')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition text-center cursor-pointer ${
                      studioTab === 'rubric'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>IB 4대 준거 루브릭 ({scoreA + scoreB + scoreC + scoreD}/32점)</span>
                  </button>
                  <button
                    onClick={() => setStudioTab('summary')}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition text-center cursor-pointer ${
                      studioTab === 'summary'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>총평 &amp; 조언</span>
                  </button>
                </div>

                {/* Tab 1: Inline Annotations Workspace */}
                {studioTab === 'annotations' && (
                  <div className="space-y-3 flex-1 flex flex-col">
                    {/* Category Filter Pills */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
                        {(['all', 'grammar', 'logic', 'insight', 'fact_error'] as const).map((t) => {
                          const count = t === 'all'
                            ? annotations.length
                            : annotations.filter((a) => a.type === t).length;
                          const label = {
                            all: '전체',
                            grammar: '맞춤법/어문규범',
                            logic: '논리 모순/비약',
                            insight: '탁월한 통찰',
                            fact_error: '팩트/맥락',
                          }[t];

                          return (
                            <button
                              key={t}
                              onClick={() => setAnnotationTypeFilter(t)}
                              className={`px-2 py-0.5 rounded-full transition cursor-pointer whitespace-nowrap font-medium ${
                                annotationTypeFilter === t
                                  ? 'bg-slate-900 text-white font-bold'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {label} ({count})
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setNewAnnotationForm((prev) => ({ ...prev, isOpen: !prev.isOpen }))}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition cursor-pointer"
                      >
                        {newAnnotationForm.isOpen ? '✕ 닫기' : '+ 직접 첨삭 추가'}
                      </button>
                    </div>

                    {/* Manual Annotation Form */}
                    {newAnnotationForm.isOpen && (
                      <form onSubmit={handleAddAnnotation} className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2 text-xs">
                        <div className="font-bold text-indigo-950">새로운 인라인 첨삭 코멘트 추가</div>
                        <input
                          type="text"
                          value={newAnnotationForm.targetText}
                          onChange={(e) => setNewAnnotationForm({ ...newAnnotationForm, targetText: e.target.value })}
                          placeholder="본문에서 하이라이트할 원문 단어/문장 (정확히 일치해야 함)"
                          className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={newAnnotationForm.type}
                            onChange={(e) => setNewAnnotationForm({ ...newAnnotationForm, type: e.target.value as AnnotationType })}
                            className="px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs"
                          >
                            <option value="grammar">맞춤법 / 어문규범</option>
                            <option value="logic">논리 모순 / 비약</option>
                            <option value="insight">탁월한 통찰 / 칭찬</option>
                            <option value="fact_error">사실 왜곡 / 인용 오류</option>
                            <option value="offtopic">맥락 이탈</option>
                          </select>
                          <input
                            type="text"
                            value={newAnnotationForm.title}
                            onChange={(e) => setNewAnnotationForm({ ...newAnnotationForm, title: e.target.value })}
                            placeholder="첨삭 요약 제목 (예: 조사 '의'와 '에'의 혼동)"
                            className="px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={newAnnotationForm.comment}
                          onChange={(e) => setNewAnnotationForm({ ...newAnnotationForm, comment: e.target.value })}
                          placeholder="학생 지도 조언 및 상세 피드백..."
                          className="w-full p-2 bg-white border border-indigo-300 rounded-lg text-xs"
                        />
                        <input
                          type="text"
                          value={newAnnotationForm.suggestion}
                          onChange={(e) => setNewAnnotationForm({ ...newAnnotationForm, suggestion: e.target.value })}
                          placeholder="추천 수정 문안 (선택 사항, 예: 올바른 표기)"
                          className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setNewAnnotationForm({ ...newAnnotationForm, isOpen: false })}
                            className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                          >
                            취소
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                          >
                            첨삭 저장
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Annotations List */}
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 flex-1">
                      {annotations.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 border border-slate-200 rounded-2xl">
                          <SpellCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p className="font-bold text-slate-600 text-xs">등록된 인라인 첨삭이 없습니다.</p>
                          <p className="text-[11px] text-slate-400 mt-1">상단의 [규칙 재검증] 또는 [⚡ AI 채점 초안 생성]을 눌러보세요.</p>
                        </div>
                      ) : (
                        annotations
                          .filter((a) => annotationTypeFilter === 'all' || a.type === annotationTypeFilter)
                          .map((ann, idx) => {
                            const isActive = activeAnnotationId === ann.id;
                            const badge = {
                              grammar: { bg: 'bg-rose-50 text-rose-800 border-rose-200', icon: '✏️', label: '맞춤법/어문규범' },
                              logic: { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: '⚠️', label: '논리 모순/비약' },
                              insight: { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '✨', label: '탁월한 통찰' },
                              fact_error: { bg: 'bg-purple-50 text-purple-800 border-purple-200', icon: '📖', label: '팩트 왜곡' },
                              offtopic: { bg: 'bg-sky-50 text-sky-800 border-sky-200', icon: '🧭', label: '맥락 이탈' },
                            }[ann.type] || { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: '💡', label: '개념' };

                            return (
                              <div
                                key={ann.id || idx}
                                onClick={() => setActiveAnnotationId(ann.id)}
                                className={`p-3 rounded-2xl border transition-all duration-200 cursor-pointer text-xs space-y-1.5 ${
                                  isActive
                                    ? 'bg-indigo-50/40 border-indigo-400 ring-2 ring-indigo-500 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                                    <span>{badge.icon}</span>
                                    <span>{badge.label}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAnnotation(ann.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                    title="이 첨삭 삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="font-bold text-slate-900 text-xs">
                                  "{ann.targetText}"
                                </div>

                                <div className="text-[11px] font-bold text-slate-800">{ann.title}</div>
                                <p className="text-[11px] text-slate-600 leading-relaxed">{ann.comment}</p>

                                {ann.suggestion && (
                                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-semibold text-[11px]">
                                    <span>➔ 추천 교정 문안: </span>
                                    <strong className="text-emerald-950 font-bold">{ann.suggestion}</strong>
                                  </div>
                                )}

                                {ann.tokQuestion && (
                                  <div className="p-2 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-950 text-[10px]">
                                    <span className="font-bold block text-indigo-900 mb-0.5">🧠 TOK 비판적 성찰 질문:</span>
                                    <span>{ann.tokQuestion}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: IB Criteria Rubrics Workspace */}
                {studioTab === 'rubric' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        IB 4대 준거 점수 부여 (총 성취도: {scoreA + scoreB + scoreC + scoreD} / 32점)
                      </span>
                      <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        총점 {scoreA + scoreB + scoreC + scoreD}점
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex justify-between font-bold mb-1">
                          <span>Criterion A (분석/이해)</span>
                          <span className="text-indigo-600 font-bold">{scoreA}점</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={8}
                          value={scoreA}
                          onChange={(e) => setScoreA(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">과제 쟁점 파악 및 텍스트 사실 관계 분석 수준</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex justify-between font-bold mb-1">
                          <span>Criterion B (논리적 구성)</span>
                          <span className="text-indigo-600 font-bold">{scoreB}점</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={8}
                          value={scoreB}
                          onChange={(e) => setScoreB(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">문단 간 유기적 인과 관계 및 논지 일관성</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex justify-between font-bold mb-1">
                          <span>Criterion C (텍스트 생산)</span>
                          <span className="text-indigo-600 font-bold">{scoreC}점</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={8}
                          value={scoreC}
                          onChange={(e) => setScoreC(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">논증적 문체, 풍부한 어휘 및 독자 소통</p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex justify-between font-bold mb-1">
                          <span>Criterion D (언어 규범)</span>
                          <span className="text-indigo-600 font-bold">{scoreD}점</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={8}
                          value={scoreD}
                          onChange={(e) => setScoreD(Number(e.target.value))}
                          className="w-full accent-indigo-600 cursor-pointer"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">한국어 맞춤법, 띄어쓰기 규범, 정확한 문장 구조</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Overall Summary & Guidance Workspace */}
                {studioTab === 'summary' && (
                  <div className="space-y-4">
                    {/* Evaluator Notes / Overall Summary */}
                    <div className="space-y-1.5">
                      <label className="block font-bold text-slate-800 text-xs">
                        평가관 종합 총평 및 학생 지도 조언 <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={evaluatorNotes}
                        onChange={(e) => setEvaluatorNotes(e.target.value)}
                        placeholder="학생이 2차 퇴고 시 집중해야 할 방향, 칭찬할 점, 논리 보강 포인트 등을 상세히 작성해 주세요..."
                        className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>

                    {/* Warm & Cool Feedback Inputs */}
                    <div className="space-y-3">
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                        <span className="font-bold text-emerald-950 block mb-1">
                          👏 칭찬 및 강점 (Warm Feedback)
                        </span>
                        <input
                          type="text"
                          value={warmFeedback[0] || ''}
                          onChange={(e) => setWarmFeedback([e.target.value])}
                          placeholder="예: 논리적 전개와 창의적인 비유가 매우 인상적입니다."
                          className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs"
                        />
                      </div>

                      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                        <span className="font-bold text-amber-950 block mb-1">
                          🎯 다음 성장을 위한 도전 과제 (Cool Feedback)
                        </span>
                        <input
                          type="text"
                          value={coolFeedback[0] || ''}
                          onChange={(e) => setCoolFeedback([e.target.value])}
                          placeholder="예: 2문단의 조사 혼용을 수정하고, 결론의 반론 논거를 보강하세요."
                          className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Studio Footer: Return Action */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                반환 시 학생 포털에 실시간으로 알림 및 평가 피드백이 전송됩니다.
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsEvaluationStudioOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  닫기
                </button>
                <button
                  onClick={handleReturnEvaluationToStudent}
                  disabled={isReturningResult}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {isReturningResult
                      ? '평가 결과 반환 중...'
                      : '📢 평가 결과 확정 및 학생에게 반환하기'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STUDENT REGISTRATION PROMPT MODAL (평가자가 글을 쓰려면 학생으로 등록되어야 함) */}
      {/* ========================================================= */}
      {isStudentRegistrationPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <UserPlus className="w-8 h-8 text-indigo-600" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-800 text-xs font-bold mb-2">
                학생 등록 규정 안내
              </span>
              <h3 className="text-xl font-black text-slate-900">
                학생 프로필 등록이 필요합니다
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                평가자 계정도 에세이를 작성하고 평가를 요청할 수 있지만,<br />
                <strong>시스템 규정에 따라 학생 프로필로 등록된 상태여야 합니다.</strong><br /><br />
                아래 버튼을 누르면 현재 계정(<strong>{userProfile.name}</strong>)으로 즉시 학생 프로필이 등록되고 글쓰기 모드로 전환됩니다.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleConfirmRegisterAsStudent}
                disabled={isRegisteringStudent}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {isRegisteringStudent
                    ? '학생 등록 진행 중...'
                    : '네, 학생으로 등록하고 글쓰기 시작'}
                </span>
              </button>

              <button
                onClick={() => setIsStudentRegistrationPromptOpen(false)}
                className="w-full px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                취소 (평가자 대시보드 유지)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
