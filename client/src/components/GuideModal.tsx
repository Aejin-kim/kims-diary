// =========================================================
// Section 1: Module Imports and Props Interface
// =========================================================
import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  CheckCircle2,
  BookmarkPlus,
  Trash2,
  Sparkles,
  FolderOpen,
  BookOpen,
  Globe,
  Plus,
  Link,
  Loader2,
  FileText,
  Key,
} from 'lucide-react';
import { AssessmentGuide, IBProgram, ReferenceItem, ReferenceType } from '../types/assessment';
import {
  RubricPreset,
  getAllRubricPresets,
  saveCustomRubricPreset,
  deleteCustomRubricPreset,
} from '../data/rubricPresets';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guide: AssessmentGuide;
  onSave: (newGuide: AssessmentGuide) => void;
}

// =========================================================
// Section 2: State Management & Reference Item Handlers
// =========================================================
export const GuideModal: React.FC<GuideModalProps> = ({
  isOpen,
  onClose,
  guide,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'rubric' | 'references'>('rubric');
  const [form, setForm] = useState<AssessmentGuide>({ ...guide });
  const [focusInput, setFocusInput] = useState(form.focusPoints.join('\n'));
  const [presets, setPresets] = useState<RubricPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [showSavePresetInput, setShowSavePresetInput] = useState(false);
  const [customPresetName, setCustomPresetName] = useState('');

  // Reference materials state
  const [references, setReferences] = useState<ReferenceItem[]>(guide.references || []);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // New Reference form state
  const [newRefType, setNewRefType] = useState<ReferenceType>('book');
  const [newRefTitle, setNewRefTitle] = useState('');
  const [newRefAuthor, setNewRefAuthor] = useState('');
  const [newRefUrl, setNewRefUrl] = useState('');
  const [newRefContent, setNewRefContent] = useState('');
  const [newRefKeywords, setNewRefKeywords] = useState('');

  // Load presets and initialize on open
  useEffect(() => {
    if (isOpen) {
      const list = getAllRubricPresets();
      setPresets(list);
      setForm({ ...guide });
      setFocusInput(guide.focusPoints.join('\n'));
      setReferences(guide.references || []);
      setShowSavePresetInput(false);
      setActiveTab('rubric');
    }
  }, [isOpen, guide]);

  if (!isOpen) return null;

  // Preset Selection
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const target = presets.find((p) => p.id === presetId);
    if (target) {
      setForm({ ...target.guide });
      setFocusInput(target.guide.focusPoints.join('\n'));
      if (target.guide.references) {
        setReferences(target.guide.references);
      }
    }
  };

  // Save current form as a custom preset
  const handleSaveAsPreset = () => {
    if (!customPresetName.trim()) {
      alert('프리셋 이름을 입력해 주세요.');
      return;
    }
    const updatedPoints = focusInput
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    const guideToSave: AssessmentGuide = {
      ...form,
      focusPoints: updatedPoints,
      references,
    };

    saveCustomRubricPreset(customPresetName.trim(), guideToSave);
    const refreshed = getAllRubricPresets();
    setPresets(refreshed);
    setCustomPresetName('');
    setShowSavePresetInput(false);
    alert(`'${customPresetName.trim()}' 프리셋이 저장되었습니다!`);
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 사용자 지정 프리셋을 삭제하시겠습니까?')) {
      deleteCustomRubricPreset(presetId);
      setPresets(getAllRubricPresets());
      if (selectedPresetId === presetId) setSelectedPresetId('');
    }
  };

  // URL Web Scraper
  const handleFetchArticle = async () => {
    if (!newRefUrl.trim()) {
      alert('분석할 뉴스/웹 기사 URL을 입력해 주세요.');
      return;
    }
    setIsFetchingUrl(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/fetch-article-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newRefUrl.trim() }),
      });
      if (!res.ok) throw new Error('기사 내용을 추출할 수 없습니다.');
      const data = await res.json();
      if (data.title && !newRefTitle) setNewRefTitle(data.title);
      if (data.content) setNewRefContent(data.content);
    } catch (err: any) {
      alert(`기사 추출 실패: ${err.message || '인터넷 연결 및 URL을 확인하세요.'}`);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // Add Reference Item
  const handleAddReference = () => {
    if (!newRefTitle.trim()) {
      alert('자료 제목(도서명 또는 기사 제목)을 입력하세요.');
      return;
    }
    const kwList = newRefKeywords
      .split(/[,;\n]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    const newItem: ReferenceItem = {
      id: `ref_${Date.now()}`,
      type: newRefType,
      title: newRefTitle.trim(),
      authorOrSource: newRefAuthor.trim() || undefined,
      url: newRefUrl.trim() || undefined,
      content: newRefContent.trim(),
      keywords: kwList.length > 0 ? kwList : undefined,
    };

    setReferences([...references, newItem]);
    // Reset Form
    setNewRefTitle('');
    setNewRefAuthor('');
    setNewRefUrl('');
    setNewRefContent('');
    setNewRefKeywords('');
  };

  const handleDeleteReference = (id: string) => {
    setReferences(references.filter((r) => r.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPoints = focusInput
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    onSave({
      ...form,
      focusPoints: updatedPoints,
      references,
    });
    onClose();
  };

// =========================================================
// Section 3: Preset Selector & Tab Navigation
// =========================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">채점자 평가 개요 및 원본 자료 설정</h2>
              <p className="text-xs text-slate-500">
                루브릭과 원본 도서/기사 팩트 정보를 기반으로 AI가 사실 왜곡 및 논리 구조를 정밀 평가합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selector Banner */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-6 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-950">추천 루브릭 프리셋 불러오기</span>
            </div>

            {/* Save as Custom Preset Button */}
            {!showSavePresetInput ? (
              <button
                type="button"
                onClick={() => setShowSavePresetInput(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md transition shadow-2xs"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
                <span>현재 설정을 내 프리셋으로 저장</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <input
                  type="text"
                  value={customPresetName}
                  onChange={(e) => setCustomPresetName(e.target.value)}
                  placeholder="프리셋 이름 (예: 5월 독서 에세이)"
                  className="px-2 py-0.5 text-xs bg-white border border-indigo-300 rounded outline-none w-44"
                />
                <button
                  type="button"
                  onClick={handleSaveAsPreset}
                  className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavePresetInput(false)}
                  className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 text-xs"
                >
                  취소
                </button>
              </div>
            )}
          </div>

          {/* Quick Preset Selector Buttons (Pills) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {presets.map((p) => {
              const isSelected = selectedPresetId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPreset(p.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition whitespace-nowrap border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className={`w-3 h-3 ${isSelected ? 'text-amber-300' : 'text-indigo-500'}`} />
                  <span>{p.name}</span>
                  {p.isCustom && (
                    <button
                      onClick={(e) => handleDeletePreset(p.id, e)}
                      className="ml-1 text-slate-400 hover:text-rose-600 p-0.5"
                      title="프리셋 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Navigation Header */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('rubric')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'rubric'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>기본 가이드 & 루브릭</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('references')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              activeTab === 'references'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>원본 도서 / 기사 팩트체크 자료 ({references.length})</span>
          </button>
        </div>
        {/* ========================================================= */}
        {/* Section 4: Tab 1 - Rubric & Assessment Overview Form Body */}
        {/* ========================================================= */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          {activeTab === 'rubric' && (
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  과제 제목
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="예: 인공지능 시대의 예술과 창작의 본질"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    IB 프로그램
                  </label>
                  <select
                    value={form.program}
                    onChange={(e) => setForm({ ...form, program: e.target.value as IBProgram })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="PYP">IB PYP (초등 탐구 과정)</option>
                    <option value="MYP">IB MYP (중등 분석/논증 과정)</option>
                    <option value="DP">IB DP (고등 학술/지식론 TOK 과정)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    대상 학년 / 수준
                  </label>
                  <input
                    type="text"
                    value={form.gradeLevel}
                    onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="예: 중학교 3학년 / MYP 4"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    [핵심] 채점자 평가 개요 및 출제 의도
                  </label>
                  <span className="text-[11px] text-indigo-600 font-medium">평가 방향성의 기준이 됩니다</span>
                </div>
                <textarea
                  rows={3}
                  value={form.promptOverview}
                  onChange={(e) => setForm({ ...form, promptOverview: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed"
                  placeholder="과제의 목표와 아이가 글을 쓸 때 지켜야 할 핵심 방향성을 적어주세요. (예: 양측의 주장을 균형 있게 다루고, 감정적 주장이 아닌 근거 기반 논증을 구성할 것)"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  평가 중점 사항 (줄바꿈으로 구분)
                </label>
                <textarea
                  rows={3}
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none leading-relaxed"
                  placeholder="예:&#10;1. 개념의 명확한 정의&#10;2. 전제와 결론의 논리적 일관성&#10;3. 반론 검토 및 수용성"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  필수 요구사항 (루브릭 Checklist)
                </label>
                <input
                  type="text"
                  value={form.rubricRequirements}
                  onChange={(e) => setForm({ ...form, rubricRequirements: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="예: 1) 구체적 실사례 1건 이상, 2) 반대 측 주장의 한계 지적"
                />
              </div>
            </div>
          )}
          {/* ========================================================= */}
          {/* Section 5: Tab 2 - Reference Materials Form Body & Footer */}
          {/* ========================================================= */}
          {activeTab === 'references' && (
            <div className="p-6 space-y-5 text-xs">
              {/* Registered references list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <BookmarkPlus className="w-4 h-4 text-indigo-600" />
                    <span>등록된 평가 원본 자료 ({references.length}건)</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    AI가 학생 글의 인용 정확도와 사실 왜곡(Fact Error)을 대조합니다.
                  </span>
                </div>

                {references.length === 0 ? (
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 bg-slate-50">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">등록된 원본 자료가 없습니다.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      아래 폼에서 원본 도서 발췌문이나 뉴스 기사 링크를 추가해 주세요.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {references.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 hover:border-indigo-200 transition"
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                ref.type === 'book'
                                  ? 'bg-amber-100 text-amber-800'
                                  : ref.type === 'article'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {ref.type === 'book' ? '도서/문헌' : ref.type === 'article' ? '뉴스/기사' : '핵심 팩트'}
                            </span>
                            <h4 className="font-bold text-slate-800 truncate">{ref.title}</h4>
                            {ref.authorOrSource && (
                              <span className="text-[11px] text-slate-500">({ref.authorOrSource})</span>
                            )}
                          </div>
                          {ref.content && (
                            <p className="text-slate-600 line-clamp-2 leading-relaxed text-[11px] bg-white p-2 rounded border border-slate-100">
                              {ref.content}
                            </p>
                          )}
                          {ref.keywords && ref.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {ref.keywords.map((kw, i) => (
                                <span
                                  key={i}
                                  className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded border border-indigo-100 font-medium"
                                >
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteReference(ref.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-white transition"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Reference Section */}
              <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    새 원본 자료 추가
                  </span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setNewRefType('book')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                        newRefType === 'book' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      도서/책
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRefType('article')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                        newRefType === 'article' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      뉴스/웹기사
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRefType('keyword')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                        newRefType === 'keyword' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      팩트 키워드
                    </button>
                  </div>
                </div>

                {newRefType === 'article' && (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="url"
                        value={newRefUrl}
                        onChange={(e) => setNewRefUrl(e.target.value)}
                        placeholder="뉴스 기사 URL 붙여넣기 (예: https://...)"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isFetchingUrl}
                      onClick={handleFetchArticle}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {isFetchingUrl ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>추출 중...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>기사 본문 자동 수집</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      {newRefType === 'book' ? '도서명' : newRefType === 'article' ? '기사 제목' : '자료 제목'}
                    </label>
                    <input
                      type="text"
                      value={newRefTitle}
                      onChange={(e) => setNewRefTitle(e.target.value)}
                      placeholder={newRefType === 'book' ? '예: 몬스터 차일드' : '예: 지구 온난화 최신 보고서'}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">
                      {newRefType === 'book' ? '저자 / 출판사' : '언론사 / 출처'}
                    </label>
                    <input
                      type="text"
                      value={newRefAuthor}
                      onChange={(e) => setNewRefAuthor(e.target.value)}
                      placeholder={newRefType === 'book' ? '예: 이재문 저, 사계절' : '예: 연합뉴스'}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    핵심 원문 내용 및 발췌문 (AI 팩트체크 기준 문장)
                  </label>
                  <textarea
                    rows={3}
                    value={newRefContent}
                    onChange={(e) => setNewRefContent(e.target.value)}
                    placeholder="도서의 주요 줄거리, 역사적 사실, 또는 기사 본문 주요 단락을 붙여넣으세요. 학생이 이 내용을 왜곡하여 기술했는지 대조합니다."
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    반드시 확인해야 할 필수 팩트 키워드 (쉼표 구분)
                  </label>
                  <input
                    type="text"
                    value={newRefKeywords}
                    onChange={(e) => setNewRefKeywords(e.target.value)}
                    placeholder="예: 돌연변이 증후군, 차별과 편견, 연대의식"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddReference}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>자료 목록에 추가</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-auto px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-[11px] text-slate-500">
              💡 도서 및 뉴스 기사를 등록해두면 학생 글의 사실 왜곡 여부를 AI가 자동 감지합니다.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition font-medium"
              >
                취소
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>가이드 & 원본 자료 저장</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
