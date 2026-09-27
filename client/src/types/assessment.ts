// =========================================================
// Section 1: Feedback Types and Criteria Definitions
// =========================================================
export type AnnotationType = 'grammar' | 'logic' | 'offtopic' | 'insight' | 'fact_error';

export type IBCriterionKey = 'criterionA' | 'criterionB' | 'criterionC' | 'criterionD';

export interface IBCriterionScore {
  name: string;
  nameKr: string;
  score: number; // 1 to 8 (IB Standard Band)
  maxScore: number;
  description: string;
  feedback: string;
}

// =========================================================
// Section 2: Inline Annotations & Reference Materials
// =========================================================
export interface InlineAnnotation {
  id: string;
  type: AnnotationType;
  targetText: string;
  rangeText?: string; // 개념적 평가(logic, insight, offtopic, fact_error)의 문맥/문단 전체 범위
  title: string;
  comment: string;
  suggestion?: string;
  tokQuestion?: string; // IB TOK (Theory of Knowledge) guiding question
  paragraphIndex?: number;
}

export type ReferenceType = 'book' | 'article' | 'keyword';

export interface ReferenceItem {
  id: string;
  type: ReferenceType;
  title: string;          // 도서명 또는 기사 제목
  authorOrSource?: string; // 저자 또는 언론사/출처
  url?: string;           // 기사 링크
  content: string;        // 핵심 줄거리, 발췌문 또는 기사 본문
  keywords?: string[];    // 필수 팩트 키워드
}

// =========================================================
// Section 3: Assessment Prompt & Configuration
// =========================================================
export type IBProgram = 'PYP' | 'MYP' | 'DP';

export interface AssessmentGuide {
  title: string;
  program: IBProgram;
  gradeLevel: string;
  promptOverview: string; // 채점자 개요: 과제 의도 및 배경
  focusPoints: string[];  // 평가 중점: [논리적 비약 방지, 근거 신뢰성, 반론 검토]
  rubricRequirements: string; // 필수 포함 요구사항
  references?: ReferenceItem[]; // 원본 도서 및 기사 링크 등의 참조 자료
}

// =========================================================
// Section 4: Assessment Output Result & Multi-Draft Versioning
// =========================================================
export interface FactCheckingSummary {
  score: number;             // 1~8점 또는 백분율 점수
  alignmentPercentage?: number; // 0 ~ 100% 원문 일치 및 사실 관계 정합도
  paraphrasingQuality?: string; // 우수, 보통, 개선필요
  summary?: string;          // 원본 참조 총평
  verifiedCount?: number;    // 확인된 팩트/키워드 수
  errorCount?: number;       // 감지된 사실 왜곡 수
  fidelityRate?: number;     // 호환용
  paraphraseLevel?: 'excellent' | 'good' | 'copy';
  feedback?: string;
}

export interface AssessmentResult {
  assessedAt: string;
  overallScore: number; // Max 32 (8 * 4 criteria)
  overallSummary: string;
  
  // Warm & Cool Feedback
  warmFeedback: string[]; // 칭찬 및 강점 (Praise)
  coolFeedback: string[]; // 다음 성장을 위한 도전 과제 (Growth / Push)
  
  // IB Criteria Grid
  criteria: Record<IBCriterionKey, IBCriterionScore>;
  
  // Specific Annotations
  annotations: InlineAnnotation[];
  
  // TOK (Theory of Knowledge) Meta-questions
  guidingQuestions: string[];

  // 원본 도서 및 기사 팩트체크 분석 요약
  factCheck?: FactCheckingSummary;
}

export interface EssayVersion {
  id: number | string;
  studentName?: string;
  essayTitle?: string;
  versionNumber: number;
  versionLabel: string;
  createdAt: string;
  overallScore: number;
  scoreA?: number;
  scoreB?: number;
  scoreC?: number;
  scoreD?: number;
  content: string;
  errorCount?: number;
  result?: AssessmentResult;
  changelog?: string;
}

// =========================================================
// Section 5: User Role & Authentication Profiles
// =========================================================
export type UserRole =
  | 'super_admin'  // 1.1 최고관리자: 최초 가입 시 자동 전환, 모든 권한
  | 'admin'        // 1.2 일반관리자: 최고관리자의 권한만 바꿀 수 없고 나머지 모든 관리 가능
  | 'evaluator'    // 1.3 평가자: 에세이 평가, 가이드 설정, 학생 로그인 승인
  | 'student'      // 1.4 평가대상자: 본인이 쓴 글과 피드백만 열람/수정
  | 'pending'      // 1.5 승인대기자: 가입 후 승인을 대기하는 권한
  | 'teacher';     // 기존 코드 호환용 (evaluator와 동일 취급)

export interface UserProfile {
  id: string | number;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  isApproved: boolean;
  isEmailVerified?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  token?: string;
  isGoogleAuth?: boolean;
  provider?: 'google' | 'password' | 'local';
}

export interface NotificationItem {
  id: number;
  userEmail?: string;
  targetRole?: string;
  type: 'LOGIN_REQUEST' | 'LOGIN_APPROVED' | 'ESSAY_SUBMITTED' | 'FEEDBACK_DELIVERED' | string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ManagedUser {
  id: number | string;
  uid?: string;
  email: string;
  name: string;
  displayName?: string;
  role: UserRole;
  isApproved: boolean;
  isEmailVerified: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  provider?: 'google' | 'password';
  avatarUrl?: string;
}

// =========================================================
// Section 6: IB Multi-Round Submission Workflow Types
// =========================================================
export type SubmissionStatus =
  | 'SUBMITTED_ROUND_1' // 1차 평가 대기중 (학생 제출 완료)
  | 'EVALUATED_ROUND_1' // 1차 평가 완료 (평가자 피드백 반환, 학생 수정 가능)
  | 'SUBMITTED_ROUND_2' // 2차 평가 대기중 (학생 퇴고본 제출 완료)
  | 'EVALUATED_ROUND_2' // 2차 평가 완료 (최종 피드백 반환)
  | 'COMPLETED';        // 최종 완료

export interface EssaySubmissionRound {
  round: number;          // 1 (1차 초안), 2 (2차 퇴고본), ...
  content: string;        // 학생이 작성한 본문
  studentNotes?: string;  // 학생의 제출 메모 / 수정 이유
  submittedAt: string;    // 제출 시각
  
  // 평가 결과 (미평가 시 null / undefined)
  result?: AssessmentResult | null;
  evaluatorNotes?: string; // 평가자 총평 및 피드백 요약
  evaluatorName?: string;  // 평가자 이름
  evaluatedAt?: string;    // 평가 완료 시각
  isEvaluated: boolean;
}

export interface EssaySubmission {
  id: string;
  studentId: string | number;
  studentName: string;
  studentEmail?: string;
  title: string;
  program: IBProgram;
  gradeLevel: string;
  guide: AssessmentGuide;
  status: SubmissionStatus;
  currentRound: number;
  rounds: EssaySubmissionRound[];
  createdAt: string;
  updatedAt: string;
}


