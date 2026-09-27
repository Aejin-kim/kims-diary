// =========================================================
// Section 1: Type Imports and Sample Definition Model
// =========================================================
import { AssessmentGuide, AssessmentResult } from '../types/assessment';

export interface SampleEssayData {
  id: string;
  title: string;
  studentName: string;
  guide: AssessmentGuide;
  content: string;
  precomputedResult: AssessmentResult;
}

// =========================================================
// Section 2: Sample 1 - AI and Creative Ownership (MYP 4-5)
// =========================================================
export const SAMPLE_ESSAY_AI: SampleEssayData = {
  id: 'sample-ai',
  title: '인공지능의 창작물은 진정한 예술로 인정받을 수 있는가?',
  studentName: '김민준 (중등 3학년 / MYP 4)',
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
  content: `최근 인공지능 기술이 급격히 발달하면서 챗GPT나 미드저니 같은 생성형AI가 인간의 영역이였던 그림과 글짓기까지 대신하고 있다. 콜로라도 주립 박람회 미술대회에서 AI가 그린 그림이 1등을 차지하면서 많은 사람들에게 큰 충격을 주었다. 나는 인공지능이 만든 작품도 진정한 예술로 인정받아야만 한다고 생각한다.

왜냐하면 예술이란 보는 사람에게 감동을 주는 것이기 때문이다. 기계가 그렸든 인간이 그렸든 결과물이 아름답고 감정을 울린다면 그것은 훌륭한 예술이다. 또한 프롬프트를 입력하는 인간의 의도와 명령어 조합도 일종의 고도의 창작 행위로 볼수있다. 붓 대신 키보드를 잡았을 뿐이다.

하지만 AI는 데이터베이스에 저장된 수많은 인간 작가들의 그림을 무단으로 학습한것에 불과하다. 따라서 AI는 단지 복제기에 지나지 않으며 스스로 감정을 느끼지 못하므로 절대로 예술가가 될 수 없고 저작권을 주어서는 안 된다. 그러므로 AI의 모든 창작물은 즉각 금지되어야 마땅하다.

결론적으로 AI 창작물은 인간의 예술적 지평을 넓혀주는 혁신적인 도구이므로 적극적으로 장려하고 법적 권리를 인정해 주어야 한다.`,
  precomputedResult: {
    assessedAt: '2026-09-25T09:20:00Z',
    overallScore: 23,
    overallSummary: 'AI 창작물의 예술성 논쟁을 콜로라도 미술대회 실례와 함께 다룬 점이 흥미롭습니다. 그러나 2문단(찬성)과 3문단(극단적 반대), 그리고 결론(찬성) 사이의 논리적 전환 장치가 누락되어 문단 간 심각한 모순이 발생했습니다. 반론을 다룰 때는 "비록 ~라는 비판이 존재하지만"과 같은 반박 논리가 필요합니다.',
    warmFeedback: [
      '콜로라도 박람회 1위 사례를 도입부에 자연스럽게 배치하여 독자의 흥미를 유발함',
      '"붓 대신 키보드를 잡았을 뿐이다"라는 직관적이고 인상적인 비유 사용'
    ],
    coolFeedback: [
      '3문단에서 AI 창작물을 "즉각 금지해야 한다"고 극단적으로 서술한 뒤, 결론에서 아무 해명 없이 "적극 장려해야 한다"로 복귀하는 논리적 충돌을 해결해야 합니다.',
      '오탈자("영역이였던" -> "영역이었던") 및 띄어쓰기 규범 교정이 필요합니다.'
    ],
    criteria: {
      criterionA: {
        name: 'Analyzing',
        nameKr: '분석 및 이해',
        score: 6,
        maxScore: 8,
        description: 'AI 생성 원리와 미술계 논쟁의 본질을 잘 파악하고 있음.',
        feedback: '창작의 주체와 수단에 대한 기본 개념 이해가 탄탄합니다.'
      },
      criterionB: {
        name: 'Organizing',
        nameKr: '논리적 구성 및 전개',
        score: 4,
        maxScore: 8,
        description: '주장 간의 내적 일관성 부족 및 전제-결론 간의 충돌 발생.',
        feedback: '본론 2문단과 3문단 사이의 극단적 입장 변화가 글 전체의 신뢰성을 저해합니다.'
      },
      criterionC: {
        name: 'Producing Text',
        nameKr: '텍스트 생산 및 표현',
        score: 6,
        maxScore: 8,
        description: '비유적 표현이 효과적이나 맞춤법과 접속사 활용 보완 필요.',
        feedback: '어휘 수준은 적절하나 학술적 논증 어휘(예: 도구적 합리성, 환원주의 등)의 확장이 권장됩니다.'
      },
      criterionD: {
        name: 'Using Language',
        nameKr: '언어 규범 및 정확성',
        score: 7,
        maxScore: 8,
        description: '문장 구조가 명료하나 일부 오탈자 및 띄어쓰기 오류 존재.',
        feedback: '국어 어문 규범에 따른 띄어쓰기와 과거 시제 표기 점검이 필요합니다.'
      }
    },
    annotations: [
      {
        id: 'ann-1',
        type: 'grammar',
        targetText: '인간의 영역이였던',
        title: '맞춤법 오류',
        comment: '\'영역이었던\'의 준말 표기 오류입니다. 서술격 조사 \'이다\'의 과거 시제는 받침이 있는 체언 뒤에서 \'이었던\'으로 표기해야 합니다.',
        suggestion: '인간의 영역이었던',
      },
      {
        id: 'ann-2',
        type: 'grammar',
        targetText: '생성형AI가',
        title: '띄어쓰기 규범',
        comment: '외래어 약어와 일반 명사 사이에는 가독성과 규범을 위해 공백을 두는 것이 바람직합니다.',
        suggestion: '생성형 AI가',
      },
      {
        id: 'ann-3',
        type: 'insight',
        targetText: '붓 대신 키보드를 잡았을 뿐이다.',
        title: '돋보이는 비유적 통찰',
        comment: '도구의 역사적 변천(붓 -> 키보드)을 통해 창작의 행위성을 설득력 있게 확장한 매우 뛰어난 논증 문장입니다.',
      },
      {
        id: 'ann-4',
        type: 'grammar',
        targetText: '학습한것에',
        title: '의존명사 띄어쓰기',
        comment: '\'것\'은 의존명사이므로 앞말인 관형사형 어미와 띄어 써야 합니다.',
        suggestion: '학습한 것에',
      },
      {
        id: 'ann-5',
        type: 'logic',
        targetText: '그러므로 AI의 모든 창작물은 즉각 금지되어야 마땅하다.',
        title: '핵심 논지의 급격한 모순 및 비약',
        comment: '앞선 문단에서 "진정한 예술로 인정받아야 한다"고 강력히 주장한 뒤, 반론을 소개하다가 갑자기 자신의 최종 결론인 것처럼 "즉각 금지되어야 한다"고 단정 지어 전제와 결론이 정면 충돌하고 있습니다.',
        suggestion: '비록 일각에서는 데이터 무단 학습을 근거로 창작물의 정당성을 전면 부정하기도 하지만, 이는 법적 라이선스 규범을 통해 해결할 문제이지 예술성 자체를 부정할 근거는 아니다.',
        tokQuestion: '기술의 윤리적 문제(저작권 침해)가 예술적 본질(심미적 감동)의 가치를 완전히 무효화할 수 있는가?',
      },
      {
        id: 'ann-6',
        type: 'offtopic',
        targetText: '결론적으로 AI 창작물은 인간의 예술적 지평을 넓혀주는 혁신적인 도구이므로 적극적으로 장려하고 법적 권리를 인정해 주어야 한다.',
        title: '반론 수렴 없는 단절된 결론',
        comment: '바로 앞 문장에서 언급한 \'학습 데이터 저작권 침해\'라는 중대한 반론을 전혀 반박하거나 수렴하지 않은 채 원래 주장으로 무작정 되돌아갔습니다.',
        suggestion: '결론적으로 AI 창작물은 기존 작가들의 권익을 보호하는 투명한 학습 기준이 마련된다면, 인간의 예술적 지평을 넓혀주는 혁신적인 도구로서 정당한 지위를 인정받을 수 있을 것이다.',
      }
    ],
    guidingQuestions: [
      '예술의 본질은 "창작자의 의도와 감정"에 있는가, 아니면 "작품을 수용하는 관객의 심미적 경험"에 있는가? (지식론 TOK 관점)',
      '우리가 AI의 창작을 인정한다면, 창작의 권리와 책임(저작권 및 표절 책임)은 알고리즘, 개발자, 프롬프트 입력자 중 누구에게 귀속되는가?'
    ]
  }
};

// =========================================================
// Section 3: Sample 2 - Environment vs Economy (DP/MYP)
// =========================================================
export const SAMPLE_ESSAYS: SampleEssayData[] = [
  SAMPLE_ESSAY_AI,
];
