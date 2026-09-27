// =========================================================
// Section 1: Types and Preset Definition Model
// =========================================================
import { AssessmentGuide, IBProgram } from '../types/assessment';

export interface RubricPreset {
  id: string;
  name: string;
  category: string;
  isCustom?: boolean;
  guide: AssessmentGuide;
}

const STORAGE_KEY_RUBRIC_PRESETS = 'ib_rubric_presets_custom';

// =========================================================
// Section 2: Default Built-in IB Standard Rubric Presets
// =========================================================
export const DEFAULT_RUBRIC_PRESETS: RubricPreset[] = [
  {
    id: 'preset-myp-ai',
    name: '[MYP 중등] AI와 창작 윤리 논증 에세이',
    category: '과학 기술 & 인문학',
    guide: {
      title: '인공지능 시대의 예술과 인간 고유성에 대한 논증 에세이',
      program: 'MYP',
      gradeLevel: 'MYP 4 (중3)',
      promptOverview: 'AI 생성 이미지가 미술 공모전에서 1위를 차지한 사건을 계기로, 창작의 본질과 저작권의 주체에 대해 탐구하고 균형 잡힌 주장을 제시하시오.',
      focusPoints: [
        '예술과 창작의 정의에 대한 개념적 이해',
        'AI 찬반 양측의 논거 균형 및 논리적 타당성',
        '반론을 고려한 심층적 결론 도출',
      ],
      rubricRequirements: '1) 인간 예술가의 고유 영역 언급, 2) AI 알고리즘의 학습 메커니즘 반영, 3) 구체적 사례 최소 1건 제시',
    },
  },
  {
    id: 'preset-pyp-env',
    name: '[PYP 초등] 기후 위기와 환경 보호 실천 탐구',
    category: '환경 & 사회 탐구',
    guide: {
      title: '지구 온난화와 우리가 지켜야 할 환경 윤리',
      program: 'PYP',
      gradeLevel: 'PYP 5 (초5~초6)',
      promptOverview: '일상생활 속 에너지 낭비와 기후 변화의 연관성을 탐구하고, 우리 세대가 미래 세대를 위해 실천할 수 있는 구체적이고 실현 가능한 행동을 제안하시오.',
      focusPoints: [
        '환경 문제의 심각성에 대한 솔직한 관찰과 느낌',
        '주장에 대한 일상생활 속 구체적 근거 제시',
        '문장의 주술 호응과 알기 쉬운 문단 구성',
      ],
      rubricRequirements: '1) 내가 직접 실천할 수 있는 약속 2가지 이상, 2) 환경 오염의 원인과 결과 연결',
    },
  },
  {
    id: 'preset-myp-lit',
    name: '[MYP 중등] 문학/역사 인물의 딜레마 비판 에세이',
    category: '문학 & 비판적 사고',
    guide: {
      title: '작품 속 인물의 선택에 대한 비판적 평가와 나의 견해',
      program: 'MYP',
      gradeLevel: 'MYP 3 (중2)',
      promptOverview: '제시된 작품(또는 역사적 사건) 속 주인공이 마주한 도덕적/상황적 딜레마를 분석하고, 그 인물의 선택이 정당했는지 다각도에서 비판적으로 평가하시오.',
      focusPoints: [
        '인물이 처한 상황과 내적 갈등에 대한 입체적 분석',
        '인물의 선택이 가져온 결과와 사회적 영향 평가',
        '자신의 도덕적 기준에 근거한 설득력 있는 논증',
      ],
      rubricRequirements: '1) 인물의 대사나 행동 묘사를 근거로 인용, 2) 당시 시대적 배경과 현대적 관점 비교',
    },
  },
  {
    id: 'preset-dp-tok',
    name: '[DP 고등] 지식론(TOK) 인식론적 탐구 에세이',
    category: '철학 & 지식론 (TOK)',
    guide: {
      title: '자연과학과 인문학에서 진리를 검증하는 방법론의 비교 탐구',
      program: 'DP',
      gradeLevel: 'DP 1 (고2)',
      promptOverview: '"경험적 관찰이 이론을 확증할 수 있는가?"라는 지식 질문(Knowledge Question)을 중심으로, 자연과학과 역사학/인문학의 앎의 방식(Ways of Knowing)을 비교 분석하시오.',
      focusPoints: [
        '명확한 지식 질문(Knowledge Question) 설정 및 탐구',
        '지식 주장(Claim)과 반대 주장(Counterclaim)의 균형',
        '지식 탐구자가 가질 수 있는 편향(Bias)에 대한 메타 성찰',
      ],
      rubricRequirements: '1) 자연과학 실례 1건 및 인문학 실례 1건 대조, 2) TOK 핵심 개념(증거, 확실성, 관점) 명시적 적용',
    },
  },
  {
    id: 'preset-general-debate',
    name: '[공통] 찬반 대립 쟁점 균형 논증 템플릿',
    category: '시사 & 자유 토론',
    guide: {
      title: '사회적 찬반 논쟁에 대한 균형 잡힌 비판적 논증',
      program: 'MYP',
      gradeLevel: '중·고등 공통',
      promptOverview: '사회적으로 의견이 분분한 이슈에 대해 감정적 주장을 지양하고, 찬성과 반대 양측의 핵심 논거를 객관적으로 검토한 후 합리적 대안을 제시하시오.',
      focusPoints: [
        '전제와 결론 간 논리적 정합성 및 오류 배제',
        '상대측 반론에 대한 성실한 반박 또는 수용',
        '객관적 데이터나 권위 있는 사실에 기반한 논거',
      ],
      rubricRequirements: '1) 찬성 측 핵심 논거 1개 이상, 2) 반대 측 핵심 논거 1개 이상, 3) 절충적/종합적 대안 결론',
    },
  },
];

// =========================================================
// Section 3: Preset Storage Functions (Built-in + Custom)
// =========================================================
export function getAllRubricPresets(): RubricPreset[] {
  if (typeof window === 'undefined') return DEFAULT_RUBRIC_PRESETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RUBRIC_PRESETS);
    if (!raw) return DEFAULT_RUBRIC_PRESETS;
    const customList: RubricPreset[] = JSON.parse(raw);
    return [...DEFAULT_RUBRIC_PRESETS, ...customList];
  } catch {
    return DEFAULT_RUBRIC_PRESETS;
  }
}

export function saveCustomRubricPreset(name: string, guide: AssessmentGuide): RubricPreset {
  const customPresets = getCustomRubricPresets();
  const newPreset: RubricPreset = {
    id: `custom-${Date.now()}`,
    name: name.trim() || guide.title,
    category: '사용자 지정 루브릭',
    isCustom: true,
    guide: { ...guide },
  };

  const updated = [newPreset, ...customPresets];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_RUBRIC_PRESETS, JSON.stringify(updated));
  }
  return newPreset;
}

export function deleteCustomRubricPreset(presetId: string): void {
  const customPresets = getCustomRubricPresets();
  const updated = customPresets.filter((p) => p.id !== presetId);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_RUBRIC_PRESETS, JSON.stringify(updated));
  }
}

function getCustomRubricPresets(): RubricPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RUBRIC_PRESETS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
