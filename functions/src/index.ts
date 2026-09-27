import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express, { Request, Response } from 'express';
import cors from 'cors';

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

function getApiKey(req: Request): string {
  const headerKey = req.header('x-gemini-api-key');
  if (headerKey && headerKey.trim()) {
    return headerKey.trim();
  }
  return process.env.GEMINI_API_KEY || '';
}

function getModel(req: Request): string {
  const bodyModel = req.body?.model;
  if (bodyModel && typeof bodyModel === 'string' && bodyModel.trim()) {
    return bodyModel.trim();
  }
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

// ==============================================================================
// 1. 상태 및 핑 엔드포인트
// ==============================================================================
const handleHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'kims-diary-functions',
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

const handleStatus = async (req: Request, res: Response) => {
  const apiKey = getApiKey(req);
  const model = getModel(req);

  if (!apiKey) {
    return res.status(200).json({
      aiOnline: false,
      engine: `Firebase Functions Gemini Bridge (${model})`,
      message: '서버에 GEMINI_API_KEY가 설정되지 않았습니다.',
      lastChecked: new Date().toLocaleTimeString(),
    });
  }

  const startTime = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Respond with exactly: {"status":"ok"}' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 20,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!apiRes.ok) {
      const errJson: any = await apiRes.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${apiRes.status}`;
      return res.status(200).json({
        aiOnline: false,
        latencyMs,
        engine: `Firebase Functions Gemini Bridge (${model})`,
        message: `Gemini API 호출 실패: ${errMsg}`,
        lastChecked: new Date().toLocaleTimeString(),
      });
    }

    const envName = process.env.ENVIRONMENT || 'production';

    return res.status(200).json({
      aiOnline: true,
      environment: envName,
      latencyMs,
      engine: `Firebase Functions Gemini Bridge (${model})`,
      message: `Gemini API 백엔드 연결 성공 (${model}, 환경: ${envName}, 응답: ${latencyMs}ms)`,
      lastChecked: new Date().toLocaleTimeString(),
    });
  } catch (err: any) {
    return res.status(200).json({
      aiOnline: false,
      latencyMs: Date.now() - startTime,
      engine: `Firebase Functions Gemini Bridge (${model})`,
      message: `네트워크 연결 오류: ${err.message || String(err)}`,
      lastChecked: new Date().toLocaleTimeString(),
    });
  }
};

app.get('/status', handleStatus);
app.get('/api/status', handleStatus);

// ==============================================================================
// 2. 프롬프트 생성 헬퍼
// ==============================================================================
function buildMasterEvaluationPrompt(
  content: string,
  guide: any,
  studentName: string,
  customSystemPrompt?: string
): { prompt: string; systemInstruction: string } {
  const name = studentName || '학생';
  const program = guide?.program || 'MYP';
  const gradeLevel = guide?.gradeLevel || '중등 과정';
  const title = guide?.title || '서술형 논증 에세이';
  const overview = guide?.promptOverview || '주제에 대한 자신의 생각을 논리적으로 서술하고 근거를 제시하는 에세이';
  const focusPoints = guide?.focusPoints && guide.focusPoints.length > 0
    ? guide.focusPoints.join(', ')
    : '논리적 비약 방지, 어문 규범 준수, 주제 적합성';
  const rubricRequirements = guide?.rubricRequirements || 'IB 공식 4대 기준(A, B, C, D) 엄격 평가';

  let referencesContext = '등록된 참조 자료 없음 (학생의 자체 배경 지식 기반 서술)';
  if (guide?.references && guide.references.length > 0) {
    referencesContext = guide.references
      .map((ref: any, idx: number) => {
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
- ★ 절대 앞부분만 분석하고 뒷부분 탐색을 조기에 멈추지 마십시오!
- 본문의 서론부터 본론의 각 소제목/사례/소주제, 그리고 최종 결론부에 이르기까지 **전 구간을 끝까지 균등하게 정밀 분석**하십시오.
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
1. 본문 인라인 첨삭(annotations)은 학생 에세이 본문 전 구간을 빠짐없이 전수 교정하여 최소 ${annotationTargetMin}을 정밀하게 추출하십시오.
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

// ==============================================================================
// 3. 에세이 다면평가 API (POST /evaluate)
// ==============================================================================
const handleEvaluate = async (req: Request, res: Response) => {
  const { content, guide, studentName, customSystemPrompt } = req.body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: '평가할 에세이 본문(content)이 없습니다.' });
  }

  const apiKey = getApiKey(req);
  if (!apiKey) {
    return res.status(500).json({
      error: '서버에 GEMINI_API_KEY가 구성되지 않았습니다. 관리자에게 문의해 주세요.',
    });
  }

  const model = getModel(req);
  const temperature = req.body?.temperature ?? 0.2;
  const topP = req.body?.topP ?? 0.85;
  const topK = req.body?.topK ?? 40;
  const maxOutputTokens = req.body?.maxOutputTokens ?? 8192;

  const { prompt, systemInstruction } = buildMasterEvaluationPrompt(
    content,
    guide || {},
    studentName || '학생',
    customSystemPrompt
  );

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature,
      topP,
      topK,
      maxOutputTokens,
      responseMimeType: 'application/json',
    },
  };

  const controller = new AbortController();
  const timeoutMs = 115000; // 115초 타임아웃
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!apiRes.ok) {
      const errJson: any = await apiRes.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${apiRes.status}`;
      return res.status(502).json({ error: `Gemini API 호출 실패: ${errMsg}` });
    }

    const data: any = await apiRes.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return res.status(502).json({ error: 'Gemini API로부터 유효한 평가 응답을 받지 못했습니다.' });
    }

    const rawText = candidate.content?.parts?.[0]?.text?.trim();
    if (!rawText) {
      return res.status(502).json({ error: 'Gemini API 응답 본문이 비어 있습니다.' });
    }

    let cleanJson = rawText;
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    else if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson);

    // 스키마 정제 및 보정
    const sanitizedCriteria = {
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

    const calculatedOverall =
      sanitizedCriteria.criterionA.score +
      sanitizedCriteria.criterionB.score +
      sanitizedCriteria.criterionC.score +
      sanitizedCriteria.criterionD.score;

    const rawAnnotations: any[] = Array.isArray(parsed.annotations) ? parsed.annotations : [];
    const validAnnotations: any[] = [];

    rawAnnotations.forEach((ann, idx) => {
      let targetText = typeof ann.targetText === 'string' ? ann.targetText.trim() : '';
      if (!targetText) return;

      if (!content.includes(targetText)) {
        const normalizedTarget = targetText.replace(/\s+/g, ' ');
        const normalizedContent = content.replace(/\s+/g, ' ');
        const nIndex = normalizedContent.indexOf(normalizedTarget);
        if (nIndex !== -1) {
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

    const result = {
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

    return res.status(200).json({
      result,
      engine: `Firebase Functions Gemini Cloud (${model})`,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Gemini API 평가 응답 시간이 초과되었습니다.' });
    }
    return res.status(500).json({ error: err.message || '서버 내부 오류가 발생했습니다.' });
  }
};

app.post('/evaluate', handleEvaluate);
app.post('/api/evaluate', handleEvaluate);

// Cloud Functions HTTPS export (timeout 120초, 메모리 512MB)
export const api = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .https.onRequest(app);
