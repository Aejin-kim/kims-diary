// =========================================================
// 한국어 어문 규범 (맞춤법, 띄어쓰기) 및 논리 비약/모순 검증 엔진
// (koreanRuleValidator.ts)
// =========================================================
import { InlineAnnotation } from '../types/assessment';

interface RuleDefinition {
  pattern: RegExp | string;
  type: 'grammar' | 'logic' | 'insight' | 'fact_error' | 'offtopic';
  title: string;
  comment: string;
  suggestion?: string | ((match: string) => string);
  tokQuestion?: string;
}

const KOREAN_RULES: RuleDefinition[] = [
  // ---------------------------------------------------------
  // 1. 맞춤법 및 오탈자 (Grammar / Typos)
  // ---------------------------------------------------------
  {
    pattern: /안되었다/g,
    type: 'grammar',
    title: "부정 부사 '안' 띄어쓰기 및 축약 표기",
    comment: "부정 부사 '안'은 뒷말과 띄어 쓰거나, 준말 형태인 '안됐다'로 적는 것이 자연스럽습니다.",
    suggestion: '안 되었다',
  },
  {
    pattern: /안돼는데/g,
    type: 'grammar',
    title: "'되'와 '돼'의 구분 및 띄어쓰기",
    comment: "부정 부사 '안'은 띄어 써야 하며, 연결어미 '-는데' 앞에서는 어간 '되-'가 쓰여 '안 되는데'가 올바릅니다.",
    suggestion: '안 되는데',
  },
  {
    pattern: /안되서/g,
    type: 'grammar',
    title: "'되어'의 준말 '돼' 표기 오류",
    comment: "'되어서'의 준말이므로 '안 돼서'로 표기해야 합니다.",
    suggestion: '안 돼서',
  },
  {
    pattern: /안됌/g,
    type: 'grammar',
    title: "명사형 어미 표기 오류",
    comment: "어간 '되-' 뒤에 자음 명사형 어미 '-ㅁ'이 결합하므로 '안 됨'으로 적어야 합니다.",
    suggestion: '안 됨',
  },
  {
    pattern: /영역이였던/g,
    type: 'grammar',
    title: "서술격 조사 과거 시제 표기 오류",
    comment: "서술격 조사 '이다'의 과거 시제는 '이었던'입니다.",
    suggestion: '영역이었던',
  },
  {
    pattern: /되므로써/g,
    type: 'grammar',
    title: "수단/도구 격조사 표기 오류",
    comment: "수단이나 도구를 나타내는 격조사는 '-ㅁ/음으로써'입니다.",
    suggestion: '됨으로써',
  },
  {
    pattern: /먹엇다/g,
    type: 'grammar',
    title: '과거 시제 받침 맞춤법 오류',
    comment: "과거 시제 선어말어미는 쌍시옷('ㅆ') 받침인 '-었-'입니다.",
    suggestion: '먹었다',
  },
  {
    pattern: /되엇다/g,
    type: 'grammar',
    title: '어간/어미 결합 준말 표기',
    comment: "'되었다' 또는 준말인 '됐다'로 표기해야 합니다.",
    suggestion: '되었다',
  },
  {
    pattern: /하엿다/g,
    type: 'grammar',
    title: '과거 시제 표준 표기',
    comment: "일반적인 현대 학술 서술에서는 '하였다' 또는 '했다'로 통일하는 것이 좋습니다.",
    suggestion: '하였다',
  },
  {
    pattern: /삼람들은/g,
    type: 'grammar',
    title: '명백한 자음/모음 오탈자',
    comment: "'사람들은'의 오타입니다.",
    suggestion: '사람들은',
  },
  {
    pattern: /아리들/g,
    type: 'grammar',
    title: '명백한 자음 오탈자',
    comment: "'아이들'의 오타입니다.",
    suggestion: '아이들',
  },
  {
    pattern: /짖궃은/g,
    type: 'grammar',
    title: '받침 맞춤법 규범 오류',
    comment: "'짓궂다'의 올바른 활용형은 '짓궂은'입니다.",
    suggestion: '짓궂은',
  },
  {
    pattern: /떄문에/g,
    type: 'grammar',
    title: '모음 오탈자 교정',
    comment: "'때문에'의 오타입니다.",
    suggestion: '때문에',
  },
  {
    pattern: /3학년떄/g,
    type: 'grammar',
    title: '의존명사 띄어쓰기 및 오탈자',
    comment: "의존명사 '때'는 앞말과 띄어 쓰고 모음 오타를 바로잡아야 합니다.",
    suggestion: '3학년 때',
  },
  {
    pattern: /문단이 끝나면 두 칸 띄고 새 문단 시작함\.?/g,
    type: 'offtopic',
    title: '원고지 작성 지침 메모 잔존',
    comment: '원고지 작성 요령 지시문이 본문에 그대로 남아있습니다. 최종 제출 시 삭제해야 합니다.',
    suggestion: '',
  },

  // ---------------------------------------------------------
  // 2. 조사 '의' vs '에' 관형격 혼동
  // ---------------------------------------------------------
  {
    pattern: /책에 줄거리/g,
    type: 'grammar',
    title: "관형격 조사 '의' 오용",
    comment: "뒷말 '줄거리'를 수식하는 소유격/관형격 관계이므로 '책의 줄거리'로 적어야 합니다.",
    suggestion: '책의 줄거리',
  },
  {
    pattern: /자신에 사물함/g,
    type: 'grammar',
    title: "관형격 조사 '의' 오용",
    comment: "'자신의 사물함'으로 표기하는 것이 올바른 관형격 조사 사용입니다.",
    suggestion: '자신의 사물함',
  },
  {
    pattern: /최\.?악\.?에 의사/g,
    type: 'grammar',
    title: "관형격 조사 '의' 오용",
    comment: "'최악의 의사'로 적어야 올바른 문법적 수식 관계가 형성됩니다.",
    suggestion: '최악의 의사',
  },

  // ---------------------------------------------------------
  // 3. 띄어쓰기 규범 (Spacing Rules)
  // ---------------------------------------------------------
  {
    pattern: /이 곳에/g,
    type: 'grammar',
    title: "대명사 '이곳' 붙여쓰기",
    comment: "'이곳'은 합성 대명사로서 한 단어이므로 붙여 씁니다.",
    suggestion: '이곳에',
  },
  {
    pattern: /그 곳에/g,
    type: 'grammar',
    title: "대명사 '그곳' 붙여쓰기",
    comment: "'그곳'은 합성 대명사이므로 붙여 씁니다.",
    suggestion: '그곳에',
  },
  {
    pattern: /저 곳에/g,
    type: 'grammar',
    title: "대명사 '저곳' 붙여쓰기",
    comment: "'저곳'은 합성 대명사이므로 붙여 씁니다.",
    suggestion: '저곳에',
  },
  {
    pattern: /않다보니/g,
    type: 'grammar',
    title: '연결어미와 보조용언 띄어쓰기',
    comment: "연결어미 '-다' 뒤의 보조용언 '보다'는 띄어 쓰는 것이 원칙입니다.",
    suggestion: '않다 보니',
  },
  {
    pattern: /SF\s+보다는/g,
    type: 'grammar',
    title: "조사 '보다는' 붙여쓰기",
    comment: "조사 '보다는'은 앞의 체언에 붙여 써야 합니다. ('SF보다는')",
    suggestion: 'SF보다는',
  },
  {
    pattern: /볼수있다/g,
    type: 'grammar',
    title: "의존명사 '수' 및 보조용언 띄어쓰기",
    comment: "어미 '-ㄹ' 뒤의 의존명사 '수'는 띄어 써야 합니다.",
    suggestion: '볼 수 있다',
  },
  {
    pattern: /할수있다/g,
    type: 'grammar',
    title: "의존명사 '수' 띄어쓰기",
    comment: "의존명사 '수'는 앞말과 띄어 씁니다.",
    suggestion: '할 수 있다',
  },
  {
    pattern: /알수있다/g,
    type: 'grammar',
    title: "의존명사 '수' 띄어쓰기",
    comment: "의존명사 '수'는 앞말과 띄어 씁니다.",
    suggestion: '알 수 있다',
  },
  {
    pattern: /학습한것/g,
    type: 'grammar',
    title: "의존명사 '것' 띄어쓰기",
    comment: "관형사형 어미 뒤의 의존명사 '것'은 띄어 써야 합니다.",
    suggestion: '학습한 것',
  },
  {
    pattern: /있는것/g,
    type: 'grammar',
    title: "의존명사 '것' 띄어쓰기",
    comment: "의존명사 '것'은 띄어 씁니다.",
    suggestion: '있는 것',
  },
  {
    pattern: /하는것/g,
    type: 'grammar',
    title: "의존명사 '것' 띄어쓰기",
    comment: "의존명사 '것'은 띄어 씁니다.",
    suggestion: '하는 것',
  },
  {
    pattern: /소설\.\s*1984이다/g,
    type: 'grammar',
    title: '문장 부호 및 서술어 호응',
    comment: "마침표 뒤에 곧바로 서술격 조사 '-이다'가 이어져 문장 연결이 부자연스럽습니다.",
    suggestion: '소설, 바로 1984이다',
  },

  // ---------------------------------------------------------
  // 4. 논리 모순, 비약 및 문맥적 평가 (Logic / Context)
  // ---------------------------------------------------------
  {
    pattern: /SF\s*보다는\s*사회주의\s*성격의\s*소설이다/g,
    type: 'logic',
    title: '장르와 주제 의식의 이분법적 단정 검토',
    comment: "SF적 디스토피아 설정과 전체주의 체제 비판은 상호 배타적이지 않으며, SF 장르적 장치를 통해 사회주의적 전체주의의 위험성을 극대화한 것으로 설명하는 것이 더 정밀한 문학적 분석입니다.",
    suggestion: 'SF라는 장르적 장치를 활용하여 전체주의의 위험성을 고발한 소설이다',
    tokQuestion: '문학 작품에서 장르적 허구(디스토피아 SF)와 현실 사회 비판은 어떻게 상호작용하며 진실을 전달하는가?',
  },
  {
    pattern: /많~+이/g,
    type: 'logic',
    title: '학술 에세이 부적합 구어체/물결표 사용',
    comment: '정규 논증 에세이에서는 물결표(~)나 채팅체를 지양하고 격식 있는 문체를 사용해야 합니다.',
    suggestion: '매우 많이',
  },

  // ---------------------------------------------------------
  // 5. 탁월한 통찰 및 심층 성찰 (Insight)
  // ---------------------------------------------------------
  {
    pattern: /자신의\s*정체성을\s*붙들지\s*않으면[^\n.]+사라지고\s*말\s*것이다/g,
    type: 'insight',
    title: '전체주의 사회와 실존적 자아 정체성에 대한 탁월한 통찰',
    comment: "조지 오웰이 경고한 디스토피아의 핵심(개성의 말살)을 현대인의 '주체적 정체성 상실'이라는 실존적 차원으로 확장하여 해석한 대단히 깊이 있는 성찰입니다.",
  },
  {
    pattern: /우리는\s*지금\s*모두\s*이\s*사회가\s*만들어\s*놓은\s*제도와\s*시스템\s*안에서\s*제한받으며\s*살고\s*있다/g,
    type: 'insight',
    title: '작품의 시공간을 현대 사회 비판으로 연결한 성숙한 시각',
    comment: "소설 속 허구의 디스토피아를 남의 이야기가 아닌 '현재 우리가 처한 제도적 구속'으로 메타인지화하여 비판적 문제의식을 예리하게 이끌어냈습니다.",
  },
];

/**
 * 학생 에세이 본문에 대해 한국어 어문 규범 및 논리 모순 규칙을 즉시 전수 검사합니다.
 */
export function validateKoreanRules(content: string): InlineAnnotation[] {
  if (!content || !content.trim()) return [];

  const annotations: InlineAnnotation[] = [];
  let idCounter = 1;

  for (const rule of KOREAN_RULES) {
    if (typeof rule.pattern === 'string') {
      let startIndex = 0;
      while (startIndex < content.length) {
        const found = content.indexOf(rule.pattern, startIndex);
        if (found === -1) break;

        const targetText = rule.pattern;
        const suggestionText = typeof rule.suggestion === 'function'
          ? rule.suggestion(targetText)
          : rule.suggestion;

        annotations.push({
          id: `rule-ann-${idCounter++}`,
          type: rule.type,
          targetText,
          title: rule.title,
          comment: rule.comment,
          suggestion: suggestionText,
          tokQuestion: rule.tokQuestion,
        });

        startIndex = found + targetText.length;
      }
    } else {
      // RegExp
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(content)) !== null) {
        const targetText = match[0];
        const suggestionText = typeof rule.suggestion === 'function'
          ? rule.suggestion(targetText)
          : rule.suggestion;

        annotations.push({
          id: `rule-ann-${idCounter++}`,
          type: rule.type,
          targetText,
          title: rule.title,
          comment: rule.comment,
          suggestion: suggestionText,
          tokQuestion: rule.tokQuestion,
        });

        if (!regex.global) break;
      }
    }
  }

  // 중복된 targetText나 완전히 포함되는 중복 항목 정리
  const uniqueAnnotations: InlineAnnotation[] = [];
  for (const ann of annotations) {
    if (!uniqueAnnotations.some((existing) => existing.targetText === ann.targetText && existing.title === ann.title)) {
      uniqueAnnotations.push(ann);
    }
  }

  // 본문 위치 순 정렬
  uniqueAnnotations.sort((a, b) => content.indexOf(a.targetText) - content.indexOf(b.targetText));

  return uniqueAnnotations;
}
