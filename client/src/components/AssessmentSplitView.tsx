// =========================================================
// Section 1: Module Imports and Props Interface
// =========================================================
import React, { useState, useRef } from 'react';
import {
  AnnotationType,
  AssessmentResult,
  InlineAnnotation,
  IBCriterionKey,
  IBProgram,
  EssayVersion,
} from '../types/assessment';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  SpellCheck,
  ChevronRight,
  TrendingUp,
  FileText,
  Lightbulb,
  CornerDownRight,
  Check,
  Edit3,
  Clock,
  Send,
  BookOpen,
  History,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Loader2,
  PlusCircle,
} from 'lucide-react';

interface AssessmentSplitViewProps {
  content: string;
  onChangeContent: (text: string) => void;
  result: AssessmentResult | null;
  activeAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  studentName?: string;
  program?: IBProgram;
  essayTitle?: string;
  // Multi-Draft Versioning Props (Phase 2)
  versions?: EssayVersion[];
  currentVersionNumber?: number;
  onSelectVersion?: (version: EssayVersion) => void;
  onSubmitRevision?: (newContent: string) => Promise<void>;
  isRevising?: boolean;
  onNewEssay?: () => void;
}

// =========================================================
// Section 2: Helper Functions for Text Highlighting & Badges
// =========================================================
const TYPE_CONFIG: Record<
  AnnotationType,
  { label: string; bgClass: string; textClass: string; icon: React.ReactNode; borderClass: string }
> = {
  grammar: {
    label: '맞춤법/어문규범',
    bgClass: 'bg-rose-50 hover:bg-rose-100 text-rose-900',
    borderClass: 'border-l-4 border-rose-500',
    textClass: 'text-rose-600',
    icon: <SpellCheck className="w-3.5 h-3.5 text-rose-500" />,
  },
  logic: {
    label: '논리 모순/비약',
    bgClass: 'bg-amber-50 hover:bg-amber-100 text-amber-900',
    borderClass: 'border-l-4 border-amber-500',
    textClass: 'text-amber-600',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  },
  offtopic: {
    label: '개요/맥락 이탈',
    bgClass: 'bg-sky-50 hover:bg-sky-100 text-sky-900',
    borderClass: 'border-l-4 border-sky-500',
    textClass: 'text-sky-600',
    icon: <HelpCircle className="w-3.5 h-3.5 text-sky-500" />,
  },
  insight: {
    label: '탁월한 통찰',
    bgClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900',
    borderClass: 'border-l-4 border-emerald-500',
    textClass: 'text-emerald-600',
    icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" />,
  },
  fact_error: {
    label: '사실 왜곡/인용 오류',
    bgClass: 'bg-purple-50 hover:bg-purple-100 text-purple-900',
    borderClass: 'border-l-4 border-purple-500',
    textClass: 'text-purple-600',
    icon: <BookOpen className="w-3.5 h-3.5 text-purple-500" />,
  },
};

// =========================================================
// Section 3: Main Split View Component & Multi-Draft State
// =========================================================
export const AssessmentSplitView: React.FC<AssessmentSplitViewProps> = ({
  content,
  onChangeContent,
  result,
  activeAnnotationId,
  onSelectAnnotation,
  studentName = '학생',
  program = 'MYP',
  essayTitle = '과제 에세이',
  versions = [],
  currentVersionNumber = 1,
  onSelectVersion,
  onSubmitRevision,
  isRevising = false,
  onNewEssay,
}) => {
  const [activeTab, setActiveTab] = useState<'annotations' | 'rubric' | 'growth' | 'factCheck'>('annotations');
  const [typeFilter, setTypeFilter] = useState<'all' | AnnotationType>('all');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleCardClick = (ann: InlineAnnotation) => {
    onSelectAnnotation(ann.id);
    const highlightElem = leftPanelRef.current?.querySelector(`[data-ann-id="${ann.id}"]`);
    if (highlightElem) {
      highlightElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleHighlightClick = (annId: string) => {
    onSelectAnnotation(annId);
    setActiveTab('annotations');
    const card = cardRefs.current[annId];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleApplySuggestion = (target: string, suggestion?: string) => {
    if (!suggestion) return;
    if (content.includes(target)) {
      const updated = content.replace(target, suggestion);
      onChangeContent(updated);
      setAppliedCount((prev) => prev + 1);
    }
  };

  // N차 재제출 처리
  const handleSubmitRevised = async () => {
    if (!onSubmitRevision) return;
    if (!content.trim()) {
      alert('퇴고할 본문 내용을 입력하세요.');
      return;
    }
    await onSubmitRevision(content);
    setIsEditingMode(false);
  };

  // 성장 델타 계산 (최초 버전 대비 최신 버전 점수/오류 변동)
  const initialVersion = versions.length > 0 ? versions[0] : null;
  const currentVerObj = versions.find((v) => v.versionNumber === currentVersionNumber) || (versions.length > 0 ? versions[versions.length - 1] : null);
  const scoreDelta = (currentVerObj && initialVersion && currentVerObj.versionNumber !== initialVersion.versionNumber)
    ? currentVerObj.overallScore - initialVersion.overallScore
    : 0;

  // 본문 하이라이트 텍스트 렌더링 파서
  const renderAnnotatedText = () => {
    if (!result || isEditingMode) {
      return (
        <textarea
          value={content}
          onChange={(e) => onChangeContent(e.target.value)}
          placeholder={
            !studentName || studentName === '등록된 학생 없음'
              ? '평가 대상 학생이 아직 지정되지 않았습니다.\n상단의 [학생 등록 / 선택하기]를 통해 학생을 먼저 등록하거나 선택한 후, 에세이를 작성해 주세요.'
              : `여기에 ${studentName} 학생이 작성한 에세이를 직접 입력하거나,\n한글(HWP)이나 워드에서 본문을 복사(Ctrl+C)하여 여기에 붙여넣기(Ctrl+V)해 주세요.`
          }
          className="w-full h-full min-h-[480px] p-6 text-sm leading-relaxed text-slate-800 bg-white resize-none outline-none font-sans"
        />
      );
    }

    if (result.annotations.length === 0) {
      return (
        <div className="p-6 text-sm leading-relaxed text-slate-800 font-sans">
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-center justify-between shadow-2xs">
            <span className="font-semibold flex items-center gap-1.5">
              ✅ IB 공식 준거 다면평가 완료 (총 성취도: {result.overallScore} / 32점)
            </span>
            <button
              type="button"
              onClick={() => setIsEditingMode(true)}
              className="px-2.5 py-1 bg-white border border-indigo-300 text-indigo-700 rounded-md text-[11px] font-bold hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
            >
              본문 수정/퇴고하기
            </button>
          </div>
          <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
        </div>
      );
    }

    const sortedAnns = [...result.annotations]
      .filter((a) => content.includes(a.targetText))
      .sort((a, b) => content.indexOf(a.targetText) - content.indexOf(b.targetText));

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnns.forEach((ann, i) => {
      const startIdx = content.indexOf(ann.targetText, lastIndex);
      if (startIdx === -1) return;

      if (startIdx > lastIndex) {
        elements.push(
          <span key={`plain-${i}`} className="whitespace-pre-wrap">
            {content.slice(lastIndex, startIdx)}
          </span>
        );
      }

      const isActive = activeAnnotationId === ann.id;

      if (ann.type === 'grammar') {
        elements.push(
          <mark
            key={ann.id}
            data-ann-id={ann.id}
            onClick={() => handleHighlightClick(ann.id)}
            className={`inline relative cursor-pointer font-medium transition-all duration-200 ${
              isActive
                ? 'bg-rose-200 text-rose-950 font-bold px-1.5 py-0.5 rounded ring-4 ring-rose-500 ring-offset-1 shadow-md scale-105 z-20'
                : 'bg-rose-100 text-rose-950 border-b-2 border-rose-500 hover:bg-rose-200 px-0.5 rounded-xs'
            }`}
            title={`[맞춤법/어문규범] ${ann.title}: ${ann.comment}`}
          >
            {isActive && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded-full shadow-md whitespace-nowrap flex items-center gap-1 z-30 pointer-events-none animate-bounce">
                <span>✏️ 교정 포인트</span>
                {ann.suggestion && <span className="bg-rose-700 px-1 rounded">➔ {ann.suggestion}</span>}
              </span>
            )}
            {ann.targetText}
            <span className="inline-block ml-0.5 text-[10px] opacity-70">✏️</span>
          </mark>
        );
      } else {
        const config = {
          logic: {
            bg: isActive ? 'bg-amber-100/95 ring-3 ring-amber-400 shadow-md' : 'bg-amber-50/75 hover:bg-amber-100/60 border-amber-300',
            border: 'border-l-4 border-amber-500',
            badgeBg: 'bg-amber-500 text-white',
            tagColor: 'text-amber-900',
            icon: '⚠️',
            label: '논리 비약/모순 검토 범위',
          },
          insight: {
            bg: isActive ? 'bg-emerald-100/95 ring-3 ring-emerald-400 shadow-md' : 'bg-emerald-50/75 hover:bg-emerald-100/60 border-emerald-300',
            border: 'border-l-4 border-emerald-500',
            badgeBg: 'bg-emerald-600 text-white',
            tagColor: 'text-emerald-900',
            icon: '✨',
            label: '탁월한 통찰 평가 범위',
          },
          offtopic: {
            bg: isActive ? 'bg-sky-100/95 ring-3 ring-sky-400 shadow-md' : 'bg-sky-50/75 hover:bg-sky-100/60 border-sky-300',
            border: 'border-l-4 border-sky-500',
            badgeBg: 'bg-sky-600 text-white',
            tagColor: 'text-sky-900',
            icon: '🧭',
            label: '맥락/구조 검토 범위',
          },
          fact_error: {
            bg: isActive ? 'bg-purple-100/95 ring-3 ring-purple-400 shadow-md' : 'bg-purple-50/75 hover:bg-purple-100/60 border-purple-300',
            border: 'border-l-4 border-purple-500',
            badgeBg: 'bg-purple-600 text-white',
            tagColor: 'text-purple-900',
            icon: '📖',
            label: '원본 사실 왜곡/인용 오류 범위',
          },
        }[ann.type] || {
          bg: 'bg-indigo-50 border-indigo-300',
          border: 'border-l-4 border-indigo-500',
          badgeBg: 'bg-indigo-600 text-white',
          tagColor: 'text-indigo-900',
          icon: '💡',
          label: '개념적 평가 범위',
        };

        elements.push(
          <span
            key={ann.id}
            data-ann-id={ann.id}
            onClick={() => handleHighlightClick(ann.id)}
            className={`inline-block my-2 p-3 rounded-r-xl ${config.border} ${config.bg} cursor-pointer transition-all duration-200 relative group w-full ${
              isActive ? 'scale-[1.01] z-10' : ''
            }`}
          >
            <span className="flex items-center justify-between text-[11px] font-bold mb-1.5 select-none">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.badgeBg}`}>
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
              <span className={`${config.tagColor} font-bold text-xs truncate max-w-[320px]`}>
                {ann.title}
              </span>
            </span>
            <span className="text-slate-900 leading-relaxed font-normal block pl-1">
              {ann.targetText}
            </span>
          </span>
        );
      }

      lastIndex = startIdx + ann.targetText.length;
    });

    if (lastIndex < content.length) {
      elements.push(
        <span key="plain-end" className="whitespace-pre-wrap">
          {content.slice(lastIndex)}
        </span>
      );
    }

    return (
      <div className="whitespace-pre-wrap leading-relaxed text-slate-800 text-sm font-sans p-6 selection:bg-indigo-100">
        {elements}
      </div>
    );
  };

  const filteredAnnotations = result?.annotations.filter((a) =>
    typeFilter === 'all' ? true : a.type === typeFilter
  );

// =========================================================
// Section 4: Left Column Render (Text, Versions & Revision Bar)
// =========================================================
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50">
      {/* ----------------- 좌측 컬럼: 원본 글 및 버전 관리 (7/12) ----------------- */}
      <div
        ref={leftPanelRef}
        className="lg:col-span-7 border-r border-slate-200 bg-white overflow-y-auto relative flex flex-col h-[calc(100vh-110px)] shadow-inner"
      >
        {/* Multi-Draft Version Selector Banner (Phase 2 핵심) */}
        {versions.length > 0 && (
          <div className="bg-slate-900 text-white px-6 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mr-1">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                <span>퇴고 이력:</span>
              </div>
              {versions.map((ver) => {
                const isSelected = ver.versionNumber === currentVersionNumber;
                return (
                  <button
                    key={ver.id}
                    onClick={() => onSelectVersion && onSelectVersion(ver)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{ver.versionLabel}</span>
                    <span className="text-[10px] px-1 py-0.2 bg-black/30 rounded font-bold">
                      {ver.overallScore}점
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Growth Delta Indicator */}
            {scoreDelta !== 0 && (
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>초안 대비 +{scoreDelta}점 향상!</span>
              </div>
            )}
          </div>
        )}

        {/* Left Sub-Header */}
        <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-sm border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>
              {studentName} 학생 - &lt;{essayTitle}&gt; {isEditingMode ? '(퇴고 편집 모드)' : result ? '(평가 완료 뷰)' : '(작성/입력)'}
            </span>
            {appliedCount > 0 && (
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                피드백 {appliedCount}개 반영됨
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {result ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditingMode(!isEditingMode)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition border ${
                    isEditingMode
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'text-indigo-700 bg-white hover:bg-indigo-50 border-indigo-200'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isEditingMode ? '첨삭 뷰로 복귀' : '✏️ 피드백 반영 퇴고하기'}</span>
                </button>
                {onNewEssay && (
                  <button
                    type="button"
                    onClick={onNewEssay}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 shadow-2xs cursor-pointer"
                    title="이전 평가는 포트폴리오에 자동 보관되며, 새로운 에세이 작성 창을 엽니다"
                  >
                    <PlusCircle className="w-3 h-3 text-emerald-600" />
                    <span>+ 새 에세이 작성</span>
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400"></span> 문법</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> 모순</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> 팩트</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 통찰</span>
                </div>
              </>
            ) : (
              <span className="text-slate-500 font-medium">직접 글을 작성하거나 붙여넣으세요</span>
            )}
          </div>
        </div>

        {/* Text Content Area */}
        <div className="flex-1 bg-white flex flex-col">
          {renderAnnotatedText()}
        </div>

        {/* Revision Submission Bottom Bar (Phase 2 핵심) */}
        {isEditingMode && onSubmitRevision && (
          <div className="sticky bottom-0 z-20 bg-indigo-900 text-white px-6 py-3 border-t border-indigo-950 flex items-center justify-between shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-2 text-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>
                피드백을 반영하여 글을 다듬으셨나요? <b>다음 차수(Draft {currentVersionNumber + 1})</b>로 재평가합니다.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingMode(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isRevising}
                onClick={handleSubmitRevised}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-lg text-xs shadow-md transition disabled:opacity-50"
              >
                {isRevising ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>재평가 및 버전 등록 중...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>퇴고본 재평가 제출 ({currentVersionNumber + 1}차)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* ========================================================= */}
      {/* Section 5: Right Column Render (Feedback, Rubric, FactCheck) */}
      {/* ========================================================= */}
      <div
        ref={rightPanelRef}
        className="lg:col-span-5 bg-slate-50/70 overflow-y-auto flex flex-col h-[calc(100vh-110px)]"
      >
        {result ? (
          <>
            {/* Right Sub-Header Tabs */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-1 text-xs overflow-x-auto">
                <button
                  onClick={() => setActiveTab('annotations')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    activeTab === 'annotations'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  인라인 첨삭 ({result.annotations.length})
                </button>
                <button
                  onClick={() => setActiveTab('rubric')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    activeTab === 'rubric'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  IB 준거 루브릭
                </button>
                <button
                  onClick={() => setActiveTab('growth')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                    activeTab === 'growth'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  성장 & TOK
                </button>
                <button
                  onClick={() => setActiveTab('factCheck')}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1 whitespace-nowrap ${
                    activeTab === 'factCheck'
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>원문 팩트</span>
                  {result.factCheck && (
                    <span className="ml-1 px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
                      {result.factCheck.score}점
                    </span>
                  )}
                </button>
              </div>

              <div className="text-right pl-2">
                <span className="text-[10px] text-slate-500 block leading-tight">성취도</span>
                <div className="text-sm font-bold text-indigo-600">
                  {result.overallScore} <span className="text-xs text-slate-400 font-normal">/ 32</span>
                </div>
              </div>
            </div>

            {/* Tab 1: Inline Annotations List */}
            {activeTab === 'annotations' && (
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {(['all', 'grammar', 'logic', 'offtopic', 'insight', 'fact_error'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                        typeFilter === t
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'all' ? '전체' : TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>

                {filteredAnnotations && filteredAnnotations.length > 0 ? (
                  filteredAnnotations.map((ann) => {
                    const cfg = TYPE_CONFIG[ann.type];
                    const isActive = activeAnnotationId === ann.id;

                    return (
                      <div
                        key={ann.id}
                        ref={(el) => {
                          cardRefs.current[ann.id] = el;
                        }}
                        onClick={() => handleCardClick(ann)}
                        className={`bg-white rounded-xl p-3.5 border transition-all duration-200 cursor-pointer shadow-sm ${
                          cfg.borderClass
                        } ${
                          isActive
                            ? 'ring-2 ring-indigo-500 shadow-md bg-indigo-50/20'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {cfg.icon}
                            <span className={`text-[11px] font-bold ${cfg.textClass}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        <div className="text-xs font-semibold text-slate-800 mb-1.5 bg-slate-50 p-2 rounded-md border border-slate-100">
                          "{ann.targetText}"
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 mb-1">{ann.title}</h4>
                        <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                          {ann.comment}
                        </p>

                        {ann.suggestion && (
                          <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-emerald-800 font-semibold text-[11px]">
                              <span className="flex items-center gap-1">
                                <CornerDownRight className="w-3 h-3 text-emerald-600" />
                                추천 교정 문안
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplySuggestion(ann.targetText, ann.suggestion);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-sm transition"
                              >
                                <Check className="w-3 h-3" />
                                <span>본문에 적용</span>
                              </button>
                            </div>
                            <p className="text-emerald-950 font-medium leading-relaxed">
                              {ann.suggestion}
                            </p>
                          </div>
                        )}

                        {ann.tokQuestion && (
                          <div className="mt-2 p-2 bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs">
                            <span className="text-[10px] font-bold text-indigo-700 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3 text-indigo-500" />
                              지식론(TOK) 성찰 질문:
                            </span>
                            <p className="text-indigo-900 text-xs mt-0.5 leading-relaxed">
                              {ann.tokQuestion}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    해당 분류의 첨삭 항목이 없습니다.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: IB Criteria Rubric Grid */}
            {activeTab === 'rubric' && (
              <div className="p-4 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-800 mb-1">총괄 평가 요약</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {result.overallSummary}
                  </p>
                </div>

                <div className="space-y-3">
                  {(Object.keys(result.criteria) as IBCriterionKey[]).map((key) => {
                    const crit = result.criteria[key];
                    const percentage = (crit.score / crit.maxScore) * 100;

                    return (
                      <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                              {key.replace('criterion', 'Criterion ')}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900">{crit.nameKr} ({crit.name})</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-slate-800">{crit.score}</span>
                            <span className="text-xs text-slate-400 font-normal"> / {crit.maxScore}</span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed pt-1">
                          {crit.feedback}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 3: Growth & TOK Guiding Questions */}
            {activeTab === 'growth' && (
              <div className="p-4 space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>칭찬할 점 (Warm Feedback)</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-emerald-950">
                    {result.warmFeedback.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>도전 과제 & 발전 방향 (Cool Feedback)</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {result.coolFeedback.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <span>지식론(TOK) 성찰 유도 질문</span>
                  </h3>
                  <p className="text-[11px] text-indigo-700 mb-2.5">
                    아이와 함께 대화하며 비판적 사고를 확장할 수 있는 토론 질문입니다.
                  </p>
                  <div className="space-y-2">
                    {result.guidingQuestions.map((q, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-indigo-100 text-xs font-medium text-indigo-950 leading-relaxed shadow-sm">
                        Q{idx + 1}. {q}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Reference Fact-Check Summary & Alignment */}
            {activeTab === 'factCheck' && (
              <div className="p-4 space-y-4">
                {result.factCheck ? (
                  <>
                    <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-purple-950">원본 도서 및 기사 대조 분석</h4>
                            <span className="text-[10px] text-purple-700">Fact Fidelity & Alignment Engine</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-purple-700">{result.factCheck.score}</span>
                          <span className="text-xs text-purple-500 font-semibold"> / 8점</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                          <span className="text-[10px] text-slate-500 block">원문 사실 정합도</span>
                          <span className="font-bold text-purple-900 text-sm">
                            {result.factCheck.alignmentPercentage ?? 85}% 일치
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                          <span className="text-[10px] text-slate-500 block">자기 언어 재구성 수준</span>
                          <span className="font-bold text-purple-900 text-sm">
                            {result.factCheck.paraphrasingQuality || '보통'}
                          </span>
                        </div>
                      </div>

                      {result.factCheck.summary && (
                        <p className="text-xs text-purple-900 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-purple-100">
                          {result.factCheck.summary}
                        </p>
                      )}
                    </div>

                    {/* Fact Error Annotations */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                        <span>원문 사실 왜곡 및 인용 오류 점검 항목 ({result.annotations.filter(a => a.type === 'fact_error').length}건)</span>
                      </h4>
                      {result.annotations.filter(a => a.type === 'fact_error').length > 0 ? (
                        result.annotations.filter(a => a.type === 'fact_error').map((ann) => (
                          <div
                            key={ann.id}
                            onClick={() => handleCardClick(ann)}
                            className="bg-white rounded-xl p-3 border border-purple-200 hover:border-purple-400 cursor-pointer shadow-xs space-y-1.5 transition"
                          >
                            <span className="text-xs font-bold text-purple-900 block">{ann.title}</span>
                            <div className="text-[11px] bg-purple-50/50 p-1.5 rounded text-purple-950 font-medium">"{ann.targetText}"</div>
                            <p className="text-[11px] text-slate-600">{ann.comment}</p>
                            {ann.suggestion && (
                              <div className="text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded flex items-center gap-1">
                                <span>➔ 올바른 팩트:</span>
                                <span className="font-semibold">{ann.suggestion}</span>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
                          원문의 사실 관계를 왜곡하거나 오해한 부분이 발견되지 않았습니다. 원작을 충실히 반영했습니다!
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="font-bold text-xs text-slate-700">등록된 원본 참조 자료가 없습니다</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      상단의 [채점 가이드] ➔ [원본 참조 자료] 탭에서 도서 발췌문이나 뉴스 기사 링크를 추가하시면, 학생 글이 원본의 사실을 왜곡 없이 정확하게 인용했는지 AI가 자동으로 팩트체크합니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Empty / Ready to Assess State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>

            <div className="max-w-xs space-y-1.5">
              <h3 className="text-sm font-bold text-slate-800">
                {content.trim() ? '새로운 글이 준비되었습니다' : '글을 작성하거나 불러와 주세요'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                현재 대상: <b>{studentName}</b> (IB {program} 과정)<br />
                {content.trim()
                  ? '상단 우측의 [평가하기 (Assess)] 버튼을 누르면 이 글에 대한 IB 다면 평가가 시작됩니다.'
                  : '좌측 창에 직접 에세이를 쓰거나, 한글(HWP) 등에서 복사(Ctrl+C) 후 [붙여넣기]를 해보세요.'}
              </p>
            </div>

            {/* Checklist Guide Cards */}
            <div className="w-full max-w-sm grid grid-cols-2 gap-2 text-left pt-2">
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                  🔴 어문 규범 점검
                </span>
                <p className="text-[11px] text-slate-600">
                  맞춤법, 띄어쓰기, 주술 호응 자동 검출
                </p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                  🟡 논리 모순 분석
                </span>
                <p className="text-[11px] text-slate-600">
                  전제와 결론의 충돌 및 쟁점 곡해 점검
                </p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-purple-600 flex items-center gap-1">
                  🟣 원문 팩트 대조
                </span>
                <p className="text-[11px] text-slate-600">
                  도서 줄거리 및 기사 인용 왜곡 감지
                </p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-1">
                  🔵 TOK 지식론 성찰
                </span>
                <p className="text-[11px] text-slate-600">
                  사고 확장을 위한 비판적 질문 생성
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
