// =========================================================
// Gemini Direct API Service (geminiDirectService.ts)
// =========================================================
// 학생 정보, IB 4대 루브릭 평가 기준, 원문 글, 참조자료를
// 단일 마스터 프롬프트로 구성하여 Gemini API(gemini-3.8-flash 등)에
// 직접 동기 호출하고 정밀 다면 평가 JSON을 반환하는 서비스입니다.
// =========================================================

import {
  AssessmentGuide,
  AssessmentResult,
  InlineAnnotation,
  IBCriterionKey,
  IBCriterionScore,
} from '../types/assessment';

export interface GeminiDirectConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  customSystemPrompt?: string;
}

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

// 로컬 스토리지 키 상수
export const STORAGE_KEY_GEMINI_API_KEY = 'jjun_gemini_api_key';
export const STORAGE_KEY_GEMINI_MODEL = 'jjun_gemini_model';
export const STORAGE_KEY_GEMINI_TEMP = 'jjun_gemini_temperature';
export const STORAGE_KEY_GEMINI_SYSTEM_PROMPT = 'jjun_gemini_system_prompt';

/**
 * 활성 Gemini API Key 조회 (.env.local 또는 브라우저 로컬 스토리지)
 */
export function getDirectGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_GEMINI_API_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
  }
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * 활성 Gemini API Key 저장
 */
export function setDirectGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY_GEMINI_API_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_GEMINI_API_KEY, key.trim());
    }
  }
}

/**
 * 활성 Gemini 모델명 조회 (.env.local 또는 로컬 스토리지, 기본값: gemini-3.8-flash)
 */
export function getDirectGeminiModel(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY_GEMINI_MODEL);
    if (stored && stored.trim()) {
      return stored.trim();
    }
  }
  return import.meta.env.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

/**
 * 활성 Gemini 모델명 저장
 */
export function setDirectGeminiModel(model: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_GEMINI_MODEL, model.trim());
  }
}

/**
 * 1. 학생 정보, IB 4대 루브릭, 어문 규범, 참조자료, 에세이 본문을
 *    결합한 완전한 단일 마스터 평가 프롬프트 생성
 */
export function buildMasterEvaluationPrompt(
  content: string,
  guide: AssessmentGuide,
  studentName: string,
  customSystemPrompt?: string
): { prompt: string; systemInstruction: string } {
  const name = studentName || '학생';
  const program = guide.program || 'MYP';
  const gradeLevel = guide.gradeLevel || '중등 과정';
  const title = guide.title || '서술형 논증 에세이';
  const overview = guide.promptOverview || '주제에 대한 자신의 생각을 논리적으로 서술하고 근거를 제시하는 에세이';
  const focusPoints = guide.focusPoints && guide.focusPoints.length > 0
    ? guide.focusPoints.join(', ')
    : '논리적 비약 방지, 어문 규범 준수, 주제 적합성';
  const rubricRequirements = guide.rubricRequirements || 'IB 공식 4대 기준(A, B, C, D) 엄격 평가';

  // 참조 및 대조 원본 자료 컨텍스트 구성
  let referencesContext = '등록된 참조 자료 없음 (학생의 자체 배경 지식 기반 서술)';
  if (guide.references && guide.references.length > 0) {
    referencesContext = guide.references
      .map((ref, idx) => {
        const typeStr = ref.type === 'book' ? '도서/원작' : ref.type === 'article' ? '기사/사설' : '핵심 키워드';
        const sourceStr = ref.authorOrSource ? ` [출처: ${ref.authorOrSource}]` : '';
        const keywordsStr = ref.keywords && ref.keywords.length > 0 ? ` (핵심 팩트: ${ref.keywords.join(', ')})` : '';
        return `[자료 ${idx + 1}] (${typeStr}) "${ref.title}"${sourceStr}${keywordsStr}\n내용 발췌:\n${ref.content}`;
      })
      .join('\n\n');
  }

  const systemInstruction = customSystemPrompt || (
    '당신은 국제 바칼로레아(IB) 공식 수석 채점관(Senior IB Examiner)이자 대한민국 최고의 국어 교육 및 문해력 평가 전문가입니다. ' +
    '학생의 성장을 촉진하기 위해 엄격하고 공정한 IB 4대 루브릭 기준을 적용하며, ' +
    '표준 한국어 어문 규범(맞춤법, 띄어쓰기, 조사 사용)과 논리적 인과 관계를 한 치의 오차도 없이 날카롭고 따뜻하게 분석합니다. ' +
    '반드시 지정된 순수 JSON 스키마 규격으로만 응답해야 합니다.'
  );

  const contentLength = content.length;
  const isLongEssay = contentLength > 2500;
  const annotationTargetMin = isLongEssay ? '15~30건 이상' : '6~12건 이상';

  const longEssayDirective = isLongEssay ? `
================================================================================
★★★ [초장문 에세이 전 구간/소제목별 전수 첨삭 필수 지침 - 매우 중요] ★★★
================================================================================
- 현재 에세이는 총 ${contentLength}자의 장문 에세이입니다.
- ★ 절대 앞부분(1번, 2번 사건 등)만 분석하고 뒷부분 탐색을 조기에 멈추지 마십시오!
- 본문의 서론부터 본론의 각 소제목/사례/소주제(예: 1번 사건, 2번 사건, 3번 사건, 4번 사건 등), 그리고 최종 결론부에 이르기까지 **전 구간을 끝까지 균등하게 정밀 분석**하십시오.
- 특정 앞 구역에 편중되지 않도록, 각 소제목별 문단마다 최소 2~4건씩, 총합 최소 ${annotationTargetMin}의 풍부한 인라인 첨삭(annotations)을 본문 전체에 고르게 분산하여 추출하십시오.
- 후반부 영역에 단순 오탈자(grammar)가 적더라도, 논리적 비약이나 인과관계 미흡(logic), 팩트 및 원작/참조 인용의 정확성(fact_error), 그리고 학생의 날카로운 비판적 통찰과 탁월한 성찰(insight, 칭찬)을 적극 발굴하여 마지막 문단까지 빠짐없이 피드백을 배치하십시오.
` : '';

  const prompt = `
당신은 다음 에세이를 심층 분석하여 IB 공식 4대 기준(A, B, C, D) 다면평가와 인라인 첨삭(annotations)을 수행해야 합니다.

================================================================================
1. 학생 및 과제 환경 정보
================================================================================
- 학생 성명: ${name}
- 대상 교육과정: IB ${program} (${gradeLevel})
- 에세이 과제 제목: <${title}>
- 과제 개요: ${overview}
- 평가 중점 사항: ${focusPoints}
- 추가 요구사항: ${rubricRequirements}

================================================================================
2. 참조 및 대조 원본 자료 (Fact-checking Context)
================================================================================
${referencesContext}

================================================================================
3. 학생 작성 에세이 원문 (Student Original Essay)
================================================================================
"""
${content}
"""

================================================================================
4. IB 공식 4대 채점 기준 가이드라인 (각 1~8점, 합계 최대 32점)
================================================================================
- Criterion A: Analyzing (분석 및 이해, 1~8점)
  과제의 핵심 쟁점, 원작/참조 자료의 사실 관계 및 지식 체계를 정확히 파악하고 분석하였는가?
- Criterion B: Organizing (논리적 구성 및 전개, 1~8점)
  문단 간 논리적 일관성, 유기적 인과 관계, 중심 논지로의 수렴 및 구조적 완결성을 갖추었는가?
- Criterion C: Producing Text (텍스트 생산 및 표현, 1~8점)
  설득력 있는 문체, 적절하고 풍부한 어휘의 다양성, 독자와의 효과적인 소통이 이루어졌는가?
- Criterion D: Using Language (언어 규범 및 정확성, 1~8점)
  한국어 맞춤법, 띄어쓰기 규범, 조사(소유격 '의' vs 처소격 '에' 등)의 올바른 사용, 정확한 문장 구조를 지켰는가?
${longEssayDirective}
================================================================================
5. 인라인 첨삭(annotations) 및 세부 평가 지침
================================================================================
1. 본문 인라인 첨삭(annotations)은 학생 에세이 본문 전 구간(서론부터 본론의 각 소제목/사례, 결론까지)을 빠짐없이 전수 교정하여 최소 ${annotationTargetMin}을 정밀하게 추출하십시오.
   - 'grammar': 오탈자, 맞춤법, 띄어쓰기 규범, 조사 표기 오류, 시제 불일치 등
   - 'logic': 비약, 모순, 과도한 일반화, 인과관계 미흡, 맥락 이탈
   - 'insight': 학생의 뛰어난 철학적 통찰, 메타인지적 자기 성찰, 돋보이는 해석 (격려 및 칭찬)
   - 'fact_error': 참조 자료의 사실 관계 왜곡 또는 명백한 팩트 오류

2. ★★★ [가장 중요한 규칙 - targetText 일치성] ★★★
   - annotations의 targetText 필드는 반드시 **위 [학생 작성 에세이 원문]에 글자 하나 틀리지 않고 100% 동일하게 존재하는 부분 문자열(substring)**이어야 합니다.
   - 본문에 없는 단어를 인용하거나 임의로 수정된 문장을 넣으면 화면 하이라이트가 동작하지 않으므로, 반드시 원문 그대로 복사하여 지정하십시오.

3. guidingQuestions: 학생의 비판적 사고를 확장시킬 수 있는 IB TOK(Theory of Knowledge) 지식론 연계 심화 탐구 질문 2~3개를 제시하십시오.
4. warmFeedback: 학생의 사기를 북돋우는 진솔한 칭찬 포인트 2~3개.
5. coolFeedback: 다음 차수 퇴고 시 반드시 개선해야 할 명확한 도전 과제 2~3개.
6. overallScore: criterionA + criterionB + criterionC + criterionD 4개 기준 점수의 정확한 합계 (정수, 4~32점).

================================================================================
6. 필수 출력 JSON 스키마 (반드시 아래 JSON 구조로만 출력하십시오)
================================================================================
{
  "overallScore": 24,
  "overallSummary": "에세이에 대한 총평 (2~3문장)",
  "warmFeedback": [
    "칭찬 및 강점 포인트 1",
    "칭찬 및 강점 포인트 2"
  ],
  "coolFeedback": [
    "성장을 위한 개선 조언 1",
    "성장을 위한 개선 조언 2"
  ],
  "criteria": {
    "criterionA": {
      "name": "Analyzing",
      "nameKr": "분석 및 이해",
      "score": 6,
      "maxScore": 8,
      "description": "과제의 핵심 쟁점과 지식 체계를 정확히 파악함.",
      "feedback": "기준 A에 대한 구체적 피드백"
    },
    "criterionB": {
      "name": "Organizing",
      "nameKr": "논리적 구성 및 전개",
      "score": 6,
      "maxScore": 8,
      "description": "문단 간 논리적 일관성 및 인과 관계.",
      "feedback": "기준 B에 대한 구체적 피드백"
    },
    "criterionC": {
      "name": "Producing Text",
      "nameKr": "텍스트 생산 및 표현",
      "score": 6,
      "maxScore": 8,
      "description": "설득력 있는 문체 및 어휘의 다양성.",
      "feedback": "기준 C에 대한 구체적 피드백"
    },
    "criterionD": {
      "name": "Using Language",
      "nameKr": "언어 규범 및 정확성",
      "score": 6,
      "maxScore": 8,
      "description": "문법, 맞춤법, 띄어쓰기 정확성.",
      "feedback": "기준 D에 대한 구체적 피드백"
    }
  },
  "annotations": [
    {
      "id": "ann-1",
      "type": "grammar",
      "targetText": "본문 원문에서 정확히 일치하는 문자열",
      "title": "첨삭 요약 제목",
      "comment": "상세 첨삭 및 교정 이유",
      "suggestion": "올바른 수정 제안 문장 (문법 교정 시)"
    },
    {
      "id": "ann-2",
      "type": "logic",
      "targetText": "본문 원문에서 정확히 일치하는 문자열",
      "title": "논리적 비약",
      "comment": "인과관계 및 논증 부족 설명",
      "suggestion": "논리적 보완 제안",
      "tokQuestion": "학생이 고민해볼 TOK 철학적 질문 (선택)"
    }
  ],
  "guidingQuestions": [
    "학생의 사고력을 심화시키는 TOK 지식론 질문 1",
    "질문 2"
  ]
}
`.trim();

  return { prompt, systemInstruction };
}

export function getFunctionsApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const customUrl = import.meta.env.VITE_FUNCTIONS_API_URL;
  if (customUrl && typeof customUrl === 'string') {
    return `${customUrl.replace(/\/+$/, '')}${cleanPath}`;
  }
  return `/api${cleanPath}`;
}

/**
 * 2. Gemini API 실시간 유효성 테스트 (Cloud Functions 백엔드 또는 직결 Ping)
 */
export async function testDirectGeminiConnection(
  apiKey?: string,
  model?: string
): Promise<{ success: boolean; latencyMs: number; message: string }> {
  const targetModel = model || getDirectGeminiModel();
  const customKey = (apiKey || getDirectGeminiApiKey()).trim();
  const startTime = Date.now();

  // 1) 백엔드 Cloud Functions의 /api/status 엔드포인트 호출
  try {
    const statusUrl = getFunctionsApiUrl('/status');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (customKey) {
      headers['x-gemini-api-key'] = customKey;
    }

    const res = await fetch(statusUrl, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.aiOnline ?? true,
        latencyMs: data.latencyMs ?? (Date.now() - startTime),
        message: data.message || `백엔드 Functions 연결 성공 (${targetModel})`,
      };
    }
  } catch (backendErr) {
    console.warn('[AI Service] Functions 상태 확인 실패, 직결 테스트 시도:', backendErr);
  }

  // 2) 백엔드 응답이 불가능하고 커스텀 키가 있는 경우 브라우저 직결 핑 fallback
  if (customKey) {
    const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${customKey}`;
    try {
      const res = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Respond with exactly: {"status":"ok"}' }] }],
          generationConfig: { maxOutputTokens: 20, temperature: 0.1, responseMimeType: 'application/json' },
        }),
      });
      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          success: true,
          latencyMs,
          message: `Gemini API 연결 성공 (${targetModel}, 직결 모드, ${latencyMs}ms)`,
        };
      }
      const errJson = await res.json().catch(() => null);
      return {
        success: false,
        latencyMs,
        message: `Gemini API 호출 실패: ${errJson?.error?.message || res.statusText}`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: `네트워크 연결 오류: ${err.message || String(err)}`,
      };
    }
  }

  return {
    success: false,
    latencyMs: Date.now() - startTime,
    message: 'Cloud Functions 백엔드 연결에 실패했으며 등록된 로컬 API 키가 없습니다.',
  };
}

/**
 * 3. Gemini API 실시간 에세이 평가 실행 (Cloud Functions 백엔드 경유)
 */
export async function evaluateWithDirectGemini(
  content: string,
  guide: AssessmentGuide,
  studentName: string,
  config?: Partial<GeminiDirectConfig>
): Promise<{ result: AssessmentResult; engine: string }> {
  const apiKey = config?.apiKey || getDirectGeminiApiKey();
  const model = config?.model || getDirectGeminiModel();
  const customSystemPrompt = config?.customSystemPrompt || (
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_GEMINI_SYSTEM_PROMPT) || undefined : undefined
  );

  // 1) Cloud Functions 백엔드 (/api/evaluate) 우선 호출 (보안 최우선 방식)
  try {
    const evalUrl = getFunctionsApiUrl('/evaluate');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey && apiKey.trim()) {
      headers['x-gemini-api-key'] = apiKey.trim();
    }

    const payload = {
      content,
      guide,
      studentName,
      customSystemPrompt,
      model,
      temperature: config?.temperature ?? 0.2,
      topP: config?.topP ?? 0.85,
      topK: config?.topK ?? 40,
      maxOutputTokens: config?.maxOutputTokens ?? 8192,
    };

    console.log('[AI Provider] Cloud Functions 백엔드로 평가를 요청합니다:', evalUrl);
    const res = await fetch(evalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        return {
          result: data.result,
          engine: data.engine || `Firebase Cloud Functions (${model})`,
        };
      }
    } else {
      const errJson = await res.json().catch(() => null);
      console.warn('[AI Provider] 백엔드 Functions 호출 실패:', errJson?.error || res.statusText);
      if (!apiKey && errJson?.error) {
        throw new Error(errJson.error);
      }
    }
  } catch (fnErr: any) {
    console.warn('[AI Provider] 백엔드 Functions 연결 에러:', fnErr);
    if (!apiKey) {
      throw new Error(
        `Cloud Functions 평가 서버 연결에 실패했습니다: ${fnErr.message || '서버 응답 없음'}\n잠시 후 다시 시도해 주세요.`
      );
    }
  }

  // 2) 커스텀 로컬 키가 있는 경우에 한해 브라우저 직결 Fallback
  if (!apiKey || !apiKey.trim()) {
    throw new Error('평가 서버에 연결할 수 없으며 설정된 API 키가 없습니다.');
  }

  const temperature = config?.temperature ?? 0.2;
  const topP = config?.topP ?? 0.85;
  const topK = config?.topK ?? 40;
  const maxOutputTokens = config?.maxOutputTokens ?? 8192;

  const { prompt, systemInstruction } = buildMasterEvaluationPrompt(
    content,
    guide,
    studentName,
    customSystemPrompt
  );

  const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature,
      topP,
      topK,
      maxOutputTokens,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeoutMs = 90000; // 90초 타임아웃
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
      throw new Error(`Gemini API 평가 호출 실패: ${errMsg}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('Gemini API로부터 유효한 평가 응답을 받지 못했습니다. (후보군 없음)');
    }

    const rawText = candidate.content?.parts?.[0]?.text?.trim();
    if (!rawText) {
      throw new Error('Gemini API 응답 본문이 비어 있습니다.');
    }

    // 마크다운 코드블록 제거
    let cleanJson = rawText;
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.slice(7);
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.slice(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.slice(0, -3);
    }
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson);

    // 2. 응답 데이터 검증 및 보정
    const sanitizedCriteria: Record<IBCriterionKey, IBCriterionScore> = {
      criterionA: {
        name: 'Analyzing',
        nameKr: '분석 및 이해',
        score: Number(parsed.criteria?.criterionA?.score || 6),
        maxScore: 8,
        description: parsed.criteria?.criterionA?.description || '과제의 핵심 쟁점과 지식 체계를 정확히 파악함.',
        feedback: parsed.criteria?.criterionA?.feedback || '분석 및 이해도 피드백',
      },
      criterionB: {
        name: 'Organizing',
        nameKr: '논리적 구성 및 전개',
        score: Number(parsed.criteria?.criterionB?.score || 6),
        maxScore: 8,
        description: parsed.criteria?.criterionB?.description || '문단 간 논리적 일관성 및 인과 관계.',
        feedback: parsed.criteria?.criterionB?.feedback || '논리 구성 피드백',
      },
      criterionC: {
        name: 'Producing Text',
        nameKr: '텍스트 생산 및 표현',
        score: Number(parsed.criteria?.criterionC?.score || 6),
        maxScore: 8,
        description: parsed.criteria?.criterionC?.description || '설득력 있는 문체 및 어휘의 다양성.',
        feedback: parsed.criteria?.criterionC?.feedback || '표현 피드백',
      },
      criterionD: {
        name: 'Using Language',
        nameKr: '언어 규범 및 정확성',
        score: Number(parsed.criteria?.criterionD?.score || 6),
        maxScore: 8,
        description: parsed.criteria?.criterionD?.description || '문법, 맞춤법, 띄어쓰기 정확성.',
        feedback: parsed.criteria?.criterionD?.feedback || '어문 규범 피드백',
      },
    };

    // 총점 계산 (각 기준 합산)
    const calculatedOverall =
      sanitizedCriteria.criterionA.score +
      sanitizedCriteria.criterionB.score +
      sanitizedCriteria.criterionC.score +
      sanitizedCriteria.criterionD.score;

    // 인라인 첨삭 데이터 정제 및 targetText 본문 매칭 검증
    const rawAnnotations: any[] = Array.isArray(parsed.annotations) ? parsed.annotations : [];
    const validAnnotations: InlineAnnotation[] = [];

    rawAnnotations.forEach((ann, idx) => {
      let targetText = typeof ann.targetText === 'string' ? ann.targetText.trim() : '';
      if (!targetText) return;

      // 본문에 정확히 포함되는지 검증
      if (!content.includes(targetText)) {
        // 공백 정규화 후 부분 검색 시도
        const normalizedTarget = targetText.replace(/\s+/g, ' ');
        const normalizedContent = content.replace(/\s+/g, ' ');
        const nIndex = normalizedContent.indexOf(normalizedTarget);
        if (nIndex !== -1) {
          // 본문에서 해당 길이만큼의 실제 텍스트 발췌
          const matchedSlice = content.substr(nIndex, targetText.length);
          if (content.includes(matchedSlice)) {
            targetText = matchedSlice;
          }
        }
      }

      validAnnotations.push({
        id: ann.id || `ann-${idx + 1}`,
        type: ['grammar', 'logic', 'insight', 'fact_error', 'offtopic'].includes(ann.type)
          ? ann.type
          : 'grammar',
        targetText,
        title: ann.title || '첨삭 포인트',
        comment: ann.comment || '상세 지도 내용',
        suggestion: ann.suggestion || '',
        tokQuestion: ann.tokQuestion || '',
      });
    });

    console.log(
      `[GeminiDirect] 평가 완료 - 모델: ${model}, 원문 글자 수: ${content.length}자, 인라인 첨삭: ${validAnnotations.length}건, 총점: ${calculatedOverall}/32점`
    );

    const result: AssessmentResult = {
      assessedAt: new Date().toISOString(),
      overallScore: parsed.overallScore || calculatedOverall,
      overallSummary: parsed.overallSummary || '학생의 논리적 사고력과 문해력을 종합적으로 평가한 결과입니다.',
      warmFeedback: Array.isArray(parsed.warmFeedback) && parsed.warmFeedback.length > 0
        ? parsed.warmFeedback
        : ['성실하게 자신의 생각을 논리적으로 서술한 점이 돋보입니다.'],
      coolFeedback: Array.isArray(parsed.coolFeedback) && parsed.coolFeedback.length > 0
        ? parsed.coolFeedback
        : ['어문 규범과 문단 간 인과 관계를 더욱 엄밀하게 다듬어 보세요.'],
      criteria: sanitizedCriteria,
      annotations: validAnnotations,
      guidingQuestions: Array.isArray(parsed.guidingQuestions) && parsed.guidingQuestions.length > 0
        ? parsed.guidingQuestions
        : ['이 에세이에서 당신이 제시한 핵심 논거는 어떤 전제에 기초하고 있는가?'],
    };

    return {
      result,
      engine: `Google Gemini (${model} 직접 연동)`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Gemini API 응답 시간이 초과되었습니다 (90초 타임아웃). 잠시 후 다시 시도해 주세요.');
    }
    throw err;
  }
}
