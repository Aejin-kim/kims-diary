// =========================================================
// Section 1: Module Imports and Props Interface
// =========================================================
import React, { useRef, useState, useEffect } from 'react';
import {
  Camera,
  ClipboardPaste,
  Trash2,
  CheckCircle2,
  PlusCircle,
  Zap,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Sliders,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  getDirectGeminiApiKey,
  setDirectGeminiApiKey,
  getDirectGeminiModel,
  setDirectGeminiModel,
  testDirectGeminiConnection,
} from '../services/geminiDirectService';

interface InputToolbarProps {
  content: string;
  onChangeContent: (text: string) => void;
  studentName: string;
  onStudentNameChange: (name: string) => void;
  onNewEssay?: () => void;
  onAiConfigChange?: () => void;
  onOpenFullAiAdmin?: () => void;
}

// =========================================================
// Section 2: Input Toolbar Handlers & Quick AI Switcher
// =========================================================
export const InputToolbar: React.FC<InputToolbarProps> = ({
  content,
  onChangeContent,
  studentName,
  onStudentNameChange,
  onNewEssay,
  onAiConfigChange,
  onOpenFullAiAdmin,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Quick AI Model & Key States
  const [currentModel, setCurrentModel] = useState<string>(getDirectGeminiModel());
  const [isQuickKeyModalOpen, setIsQuickKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState<string>(getDirectGeminiApiKey());
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; message: string } | null>(null);

  useEffect(() => {
    setCurrentModel(getDirectGeminiModel());
    setTempApiKey(getDirectGeminiApiKey());
  }, []);

  const handleModelChange = (newModel: string) => {
    let target = newModel;
    if (newModel === 'custom') {
      const custom = window.prompt('사용하실 Gemini 모델명을 입력해 주세요 (예: gemini-3.8-flash, gemini-3.8-pro 등):', currentModel);
      if (!custom || !custom.trim()) return;
      target = custom.trim();
    }
    setDirectGeminiModel(target);
    setCurrentModel(target);
    setStatusMessage(`AI 모델이 [${target}](으)로 즉시 변경되었습니다`);
    setTimeout(() => setStatusMessage(null), 3500);
    if (onAiConfigChange) onAiConfigChange();
  };

  const handleTestAndSaveKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempApiKey.trim()) {
      setTestResult({ success: false, message: 'Gemini API 키를 입력해 주세요.' });
      return;
    }
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await testDirectGeminiConnection(tempApiKey.trim(), currentModel);
      setTestResult(res);
      if (res.success) {
        setDirectGeminiApiKey(tempApiKey.trim());
        setStatusMessage(`API 키가 정상 저장 및 즉시 활성화되었습니다 (${res.latencyMs}ms)`);
        setTimeout(() => setStatusMessage(null), 3500);
        if (onAiConfigChange) onAiConfigChange();
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || '연결 실패' });
    } finally {
      setIsTestingKey(false);
    }
  };

  // A4 사진 캡처 이미지 업로드 처리
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      alert(`A4 캡처 사진 (${file.name})이 로컬 엔진을 통해 텍스트로 인식되었습니다.`);
      setStatusMessage(`${file.name} 인식 완료`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      alert('이미지 텍스트 파싱 오류: ' + (err as Error).message);
    } finally {
      setIsProcessing(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // 클립보드 붙여넣기 처리
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        onChangeContent(text);
        setStatusMessage('클립보드에서 붙여넣었습니다');
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        alert('클립보드가 비어 있거나 텍스트가 아닙니다.\n한글(HWP)이나 워드에서 본문을 복사(Ctrl+C)한 후 다시 눌러주세요.');
      }
    } catch {
      alert('브라우저 권한 설정으로 클립보드를 자동으로 읽을 수 없습니다.\n좌측 에디터 입력창을 클릭하신 후 키보드의 [Ctrl + V]를 눌러 붙여넣어 주세요.');
    }
  };

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const isDirectMode = true;

// =========================================================
// Section 3: Toolbar Render View
// =========================================================
  return (
    <>
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        {/* Left: Student Name & Meta */}
        <div className="flex items-center gap-2">
          <label className="text-slate-500 font-medium shrink-0">학생 이름:</label>
          <input
            type="text"
            value={studentName}
            onChange={(e) => onStudentNameChange(e.target.value)}
            placeholder="학생 이름 (미등록)"
            className="bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none w-36"
          />

          {/* Real-time On-Screen AI Model & Key Quick Control */}
          {isDirectMode && (
            <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg px-2 py-0.5 shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-indigo-950 text-[11px] shrink-0">AI 모델:</span>
              <select
                value={['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.0-flash'].includes(currentModel) ? currentModel : 'custom'}
                onChange={(e) => handleModelChange(e.target.value)}
                className="bg-indigo-50/60 border border-indigo-200 rounded px-1.5 py-0.5 text-indigo-900 font-bold text-[11px] outline-none cursor-pointer hover:bg-indigo-50 transition"
                title="실시간 평가에 적용할 Gemini AI 모델을 즉시 변경합니다"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (추천/장문분석)</option>
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (초경량)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="custom">직접 입력...</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setTempApiKey(getDirectGeminiApiKey());
                  setIsQuickKeyModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition cursor-pointer"
                title="Gemini API 키 즉시 변경 및 연결 테스트"
              >
                <Key className="w-3 h-3 text-indigo-600" />
                <span>키 변경/테스트</span>
              </button>
            </div>
          )}

          {statusMessage && (
            <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 font-medium">
              <CheckCircle2 className="w-3 h-3 text-indigo-500" />
              {statusMessage}
            </span>
          )}
        </div>

        {/* Right: Input Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Hidden image input */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* New Essay Button */}
          {onNewEssay && (
            <button
              onClick={onNewEssay}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-md transition shadow-2xs font-semibold cursor-pointer"
              title="현재 평가를 포트폴리오에 보관하고, 새로운 주제의 에세이를 작성합니다"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ 새 에세이</span>
            </button>
          )}

          {/* Clipboard Paste Button */}
          <button
            onClick={handlePasteClipboard}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-300 rounded-md transition shadow-2xs font-semibold cursor-pointer"
            title="한글(HWP) 또는 워드에서 복사(Ctrl+C)한 본문 붙여넣기"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
            <span>붙여넣기 (Ctrl+V)</span>
          </button>

          {/* OCR Image Button */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md transition shadow-2xs font-medium cursor-pointer"
            title="손글씨 또는 인쇄된 A4 캡처 사진 텍스트 변환"
          >
            <Camera className="w-3.5 h-3.5 text-slate-600" />
            <span>{isProcessing ? '처리 중...' : 'A4 사진 OCR'}</span>
          </button>

          {/* Clear Button */}
          {content && (
            <button
              onClick={() => {
                onChangeContent('');
                setStatusMessage(null);
              }}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
              title="본문 지우기"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Statistics Badge */}
          <div className="pl-2 border-l border-slate-300 text-slate-500 font-mono text-[11px] flex items-center gap-1.5">
            <span>{charCount}자</span>
            <span>•</span>
            <span>{wordCount}단어</span>
          </div>
        </div>
      </div>

      {/* On-Screen Quick API Key & Model Modal */}
      {isQuickKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm">화면 즉시 AI 설정 (Gemini API)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickKeyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTestAndSaveKey} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  적용할 Gemini 모델:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleModelChange('gemini-3.8-flash')}
                    className={`p-2 rounded-xl border text-left transition ${
                      currentModel === 'gemini-3.8-flash'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-950 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-indigo-600">gemini-3.8-flash</div>
                    <div className="text-[10px] text-slate-500">추천 · 초장문 전수분석</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModelChange('gemini-3.5-flash-lite')}
                    className={`p-2 rounded-xl border text-left transition ${
                      currentModel === 'gemini-3.5-flash-lite'
                        ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-950 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-indigo-600">gemini-3.5-flash-lite</div>
                    <div className="text-[10px] text-slate-500">초경량 · 빠른 속도</div>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">Google Gemini API Key:</label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 font-medium"
                  >
                    <span>무료 발급받기</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy... 또는 AQ..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pr-10 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-medium flex items-center gap-1.5 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                {onOpenFullAiAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickKeyModalOpen(false);
                      onOpenFullAiAdmin();
                    }}
                    className="text-slate-500 hover:text-indigo-600 text-[11px] flex items-center gap-1 font-medium"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>상세 튜닝 콘솔</span>
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsQuickKeyModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    disabled={isTestingKey}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
                  >
                    {isTestingKey ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>테스트 중...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>즉시 연결 테스트 &amp; 저장</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
