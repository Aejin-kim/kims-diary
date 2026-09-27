// =========================================================
// 본문 인라인 정밀 첨삭 하이라이트 뷰어 (AnnotatedEssayViewer.tsx)
// 맞춤법, 띄어쓰기, 논리 모순, 탁월한 통찰 시각화 인터랙션
// =========================================================
import React, { useState, useRef, useEffect } from 'react';
import { InlineAnnotation } from '../types/assessment';
import {
  SpellCheck,
  AlertTriangle,
  Sparkles,
  HelpCircle,
  BookOpen,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface AnnotatedEssayViewerProps {
  content: string;
  annotations: InlineAnnotation[];
  activeAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  className?: string;
}

export const AnnotatedEssayViewer: React.FC<AnnotatedEssayViewerProps> = ({
  content,
  annotations = [],
  activeAnnotationId,
  onSelectAnnotation,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'annotated' | 'raw'>('annotated');
  const containerRef = useRef<HTMLDivElement>(null);

  // 활성 첨삭 변경 시 해당 하이라이트로 스크롤 이동
  useEffect(() => {
    if (activeAnnotationId && containerRef.current) {
      const el = containerRef.current.querySelector(`[data-ann-id="${activeAnnotationId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeAnnotationId]);

  // 카운트 계산
  const grammarCount = annotations.filter((a) => a.type === 'grammar').length;
  const logicCount = annotations.filter((a) => a.type === 'logic').length;
  const insightCount = annotations.filter((a) => a.type === 'insight').length;
  const factCount = annotations.filter((a) => a.type === 'fact_error' || a.type === 'offtopic').length;

  if (!content) {
    return (
      <div className={`p-8 text-center text-slate-400 text-xs ${className}`}>
        표시할 에세이 본문이 없습니다.
      </div>
    );
  }

  // 본문 하이라이트 인터랙티브 렌더링
  const renderHighlightedContent = () => {
    if (viewMode === 'raw' || annotations.length === 0) {
      return (
        <div className="whitespace-pre-wrap leading-relaxed text-slate-900 font-sans text-xs">
          {content}
        </div>
      );
    }

    // 본문에 실제 존재하는 첨삭만 추출하여 위치순 정렬
    const sortedAnns = [...annotations]
      .filter((a) => a.targetText && content.includes(a.targetText))
      .sort((a, b) => content.indexOf(a.targetText) - content.indexOf(b.targetText));

    if (sortedAnns.length === 0) {
      return (
        <div className="whitespace-pre-wrap leading-relaxed text-slate-900 font-sans text-xs">
          {content}
        </div>
      );
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedAnns.forEach((ann, i) => {
      const startIdx = content.indexOf(ann.targetText, lastIndex);
      if (startIdx === -1) return;

      // 앞선 일반 텍스트 구간
      if (startIdx > lastIndex) {
        elements.push(
          <span key={`plain-${i}`} className="whitespace-pre-wrap">
            {content.slice(lastIndex, startIdx)}
          </span>
        );
      }

      const isActive = activeAnnotationId === ann.id;

      if (ann.type === 'grammar') {
        // 맞춤법, 띄어쓰기, 어문규범 하이라이트 (Rose / Red)
        elements.push(
          <mark
            key={ann.id || `ann-${i}`}
            data-ann-id={ann.id}
            onClick={() => onSelectAnnotation(ann.id)}
            className={`inline relative cursor-pointer font-medium transition-all duration-200 select-text ${
              isActive
                ? 'bg-rose-200 text-rose-950 font-bold px-1.5 py-0.5 rounded ring-4 ring-rose-500 ring-offset-1 shadow-md scale-105 z-20'
                : 'bg-rose-100/90 text-rose-950 border-b-2 border-rose-500 hover:bg-rose-200 px-0.5 rounded-xs'
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
            <span className="inline-block ml-0.5 text-[9px] opacity-75">✏️</span>
          </mark>
        );
      } else {
        // 논리 모순, 통찰, 팩트 오류 블록 콜아웃
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
            key={ann.id || `ann-${i}`}
            data-ann-id={ann.id}
            onClick={() => onSelectAnnotation(ann.id)}
            className={`inline-block my-2 p-3 rounded-r-xl ${config.border} ${config.bg} cursor-pointer transition-all duration-200 relative group w-full ${
              isActive ? 'scale-[1.01] z-10' : ''
            }`}
          >
            <span className="flex items-center justify-between text-[11px] font-bold mb-1.5 select-none">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.badgeBg}`}>
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </span>
              <span className={`${config.tagColor} font-bold text-xs truncate max-w-[280px]`}>
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

    return elements;
  };

  return (
    <div ref={containerRef} className={`space-y-3 ${className}`}>
      {/* Top Legend Bar */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center flex-wrap gap-2 font-medium">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <span>정밀 검증 항목:</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            <span>맞춤법/어문규범 {grammarCount}건</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>논리 모순/비약 {logicCount}건</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>탁월한 통찰 {insightCount}건</span>
          </span>
          {factCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
              <span>팩트/맥락 {factCount}건</span>
            </span>
          )}
        </div>

        {/* View Toggle Button */}
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'annotated' ? 'raw' : 'annotated')}
          className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold text-[10px] cursor-pointer shadow-2xs transition"
        >
          <Eye className="w-3 h-3 text-slate-500" />
          <span>{viewMode === 'annotated' ? '원문 보기' : '첨삭 하이라이트 보기'}</span>
        </button>
      </div>

      {/* Essay Content Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs leading-relaxed text-slate-900 font-sans min-h-[420px]">
        {renderHighlightedContent()}
      </div>
    </div>
  );
};
export default AnnotatedEssayViewer;
