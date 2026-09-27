# 05. 프론트엔드 핵심 컴포넌트 아키텍처 레퍼런스
## (Frontend Component Reference & Architecture)

---

## 1. 컴포넌트 계층 트리 구조

```
App.tsx (전역 상태 및 최상위 라우터)
│
├── JjunBrothersLandingPage.tsx (비로그인 상태 안내 및 Google OAuth 시작)
│
├── [가입 승인 대기 화면] (isApproved === false 사용자 전용 차단 뷰)
│
└── [승인 완료 사용자 뷰]
    ├── Header.tsx (전역 헤더, 권한 배지, 서브시스템 내비게이션, 모달 제어)
    │
    ├── [서브시스템 2.0] JjunBrothersHub.tsx (가족 포털 대시보드)
    │
    ├── [서브시스템 2.1] FamilyAlbumView.tsx (가족 앨범 - 준비 중)
    │
    ├── [서브시스템 2.2 - 평가관] EvaluatorDashboardView.tsx
    │   ├── 학생별 제출 에세이 큐 (미평가/평가완료 필터)
    │   ├── AnnotatedEssayViewer.tsx (본문 인터랙티브 하이라이트)
    │   └── 3대 채점 작업 탭:
    │       ├── 탭 1: [인라인 첨삭] (어문규범 룰 검증 + AI 초안 + 수동 첨삭)
    │       ├── 탭 2: [IB 4대 준거 루브릭] (A~D 기준 1~8점 슬라이더 채점)
    │       └── 탭 3: [총평 & 조언] (Praise/Push 피드백 & 지도 메모)
    │
    ├── [서브시스템 2.2 - 학생] StudentAssessmentView.tsx
    │   ├── 1:1 강제 바인딩된 본인 프로필 영역 (타 학생 접근 차단)
    │   ├── 1차 새 에세이 작성 및 제출 폼
    │   ├── 평가 결과 열람 상세 뷰 (AnnotatedEssayViewer.tsx 연동)
    │   └── 2차 퇴고 작성 폼 ([본문에 반영] 원클릭 자동 수정 지원)
    │
    └── 전역 관리 모달군:
        ├── UserManagementModal.tsx (가족 회원 5단계 권한 및 승인 관리)
        ├── StudentManagerModal.tsx (가족 학생 프로필 등록 및 이메일 바인딩)
        ├── AIHomeServerAdminModal.tsx (Google Gemini API 키, 모델 및 평가 이력 콘솔)
        ├── PortfolioModal.tsx (학생별 누적 점수 추이 및 역량 레이더 차트)
        └── GuideModal.tsx (IB 과제 개요, 루브릭 및 참조 자료 설정)
```

---

## 2. 최상위 컴포넌트: `App.tsx`

전역 인증 세션, 서브시스템 전환, 에세이 및 버전 상태 동기화를 총괄합니다.

### 2.1 주요 상태 관리 (State Management)
* `userProfile: UserProfile | null`: 현재 Google 로그인 사용자 프로필.
* `currentSubsystem: 'hub' | 'album' | 'ib_assessment'`: 활성화된 서브시스템.
* `currentStudent: StudentProfile | null`: 학생 권한 시 본인 1:1 바인딩 프로필, 평가관 시 선택된 학생.
* `isEvaluatorInStudentMode: boolean`: 평가관이 본인 글쓰기를 위해 학생 모드로 전환했는지 여부.
* `aiServerStatus: AIHomeServerStatus | null`: Direct Gemini 또는 홈서버 AI 실시간 상태.

### 2.2 3단계 라우팅 파이프라인
1. **비로그인 분기**: `!userProfile` $\rightarrow$ `JjunBrothersLandingPage` 렌더링.
2. **승인 대기 분기**: `userProfile && !userProfile.isApproved` $\rightarrow$ 승인 대기 잠금 카드 렌더링.
3. **정상 승인 분기**: `Header` 고정 렌더링 + `currentSubsystem`에 따른 화면 전환.

---

## 3. 본문 인터랙티브 뷰어: `AnnotatedEssayViewer.tsx`

에세이 본문 내 첨삭 위치를 하이라이트하고, 우측 채점 카드와 양방향 스크롤을 연동하는 핵심 시각화 컴포넌트입니다.

### 3.1 인터페이스 명세
```typescript
interface AnnotatedEssayViewerProps {
  content: string;                        // 에세이 본문 텍스트
  annotations: InlineAnnotation[];        // 인라인 첨삭 데이터 목록
  activeAnnotationId: string | null;      // 현재 사용자가 선택한 첨삭 ID
  onSelectAnnotation: (id: string | null) => void; // 첨삭 선택 핸들러
  className?: string;
}
```

### 3.2 핵심 기능
* **뷰 모드 전환**: `[첨삭 하이라이트]` 모드와 `[순수 원문]` 모드를 탭 버튼으로 토글.
* **타겟 텍스트 파싱**: 본문에 실재하는 `targetText`의 위치를 순차 탐색하여 일반 텍스트와 `<mark>`/`<span>` 태그를 결합 렌더링.
* **자동 스크롤**: `activeAnnotationId` 변경 시 `data-ann-id` 속성을 갖는 DOM 요소를 찾아 `scrollIntoView({ behavior: 'smooth', block: 'center' })` 실행.

---

## 4. 평가관 채점 대시보드: `EvaluatorDashboardView.tsx`

평가관(`evaluator`, `admin`, `super_admin`) 전용 대시보드로, 학생 에세이 모니터링 및 정밀 채점을 지원합니다.

### 4.1 3대 서브 탭 작업대
1. **[인라인 첨삭] 탭**:
   * 에세이 로드 즉시 `validateKoreanRules`를 가동하여 맞춤법/띄어쓰기 0초 즉각 검출.
   * `[AI 정밀 첨삭 초안 생성]` 버튼을 통해 Gemini 모델로부터 심층 첨삭 일괄 수신.
   * `[+ 직접 첨삭 추가]` 버튼을 통해 평가관이 본문 드래그 영역에 수동 피드백 작성.
   * 첨삭 카드별 삭제(`Trash2`) 및 편집 지원.
2. **[IB 4대 준거 루브릭] 탭**:
   * 기준 A (지식과 이해, 1~8점)
   * 기준 B (텍스트 분석 및 비판, 1~8점)
   * 기준 C (구성과 논리적 흐름, 1~8점)
   * 기준 D (언어 구사 및 어문 규범, 1~8점)
   * 슬라이더 인터랙션으로 직관적 점수 조정 및 총점(32점 만점) 자동 합산.
3. **[총평 & 조언] 탭**:
   * 종합 총평(Overall Summary) 입력.
   * 칭찬과 강점(Warm Feedback) 목록 관리.
   * 다음 성장을 위한 도전 과제(Cool Feedback) 목록 관리.
   * 평가관 서명 및 최종 `[평가 완료 및 학생에게 피드백 반환]` 실행.

---

## 5. 학생 전용 글쓰기/퇴고 포털: `StudentAssessmentView.tsx`

학생(`student`) 사용자가 타 학생의 화면에 간섭받지 않고 본인 글쓰기와 퇴고에 몰입하는 전용 컴포넌트입니다.

### 5.1 엄격한 1:1 바인딩 보호
* 현재 로그인한 계정(`userProfile`)의 이메일 및 UID로 `students` 컬렉션에서 단일 학생 프로필을 특정합니다.
* 학생 화면에서는 **학생 프로필 전환/선택 드롭다운이 원천 은닉**됩니다.

### 5.2 2차 퇴고 모드 및 원클릭 교정 반영
* 1차 평가가 완료된 건의 `[1차 평가 바탕으로 수정하기]`를 누르면 2차 퇴고 폼이 활성화됩니다.
* 우측 첨삭 피드백 카드 목록에 `[본문에 반영]` 버튼이 노출됩니다:
```typescript
const handleApplySuggestion = (targetText: string, suggestion?: string) => {
  if (!suggestion || !targetText) return;
  setDraftContent((prev) => prev.replace(targetText, suggestion));
};
```
* 학생은 수정한 본문과 퇴고 메모를 작성한 뒤 `[퇴고본 재평가 요청 (2차)]`을 제출합니다.

---

## 6. 전역 헤더: `Header.tsx`

### 6.1 권한별 UI 가시성 제어
* **학생 선택기 (`currentStudent`)**:
  * 평가관(`evaluator`, `admin`, `super_admin`)에게만 노출되며, 학생(`student`)에게는 은닉됩니다.
* **서브시스템 전환 탭**:
  * 쭌이형제네 허브 (2.0), 가족앨범 (2.1), IB 다면평가 (2.2) 간 원클릭 라우팅.
* **평가자 글쓰기 모드 토글 버튼**:
  * 평가관에게 `[학생 모드로 전환]` 토글 버튼을 제공하여 본인도 학생 자격으로 에세이를 제출해 볼 수 있도록 지원합니다.
* **권한 배지**:
  * `super_admin`: 보라색 (`최고관리자`)
  * `admin`: 남색 (`관리자`)
  * `evaluator`: 하늘색 (`평가자`)
  * `student`: 초록색 (`가족 회원`)

---

## 7. 가족 회원 관리 모달: `UserManagementModal.tsx`

최고관리자 및 관리자가 가족 회원을 승인하고 권한을 조정하는 제어판입니다.

### 7.1 권한 변경 및 안전장치 규칙
1. **최고관리자 보호**: 최고관리자 본인의 권한은 시스템 잠금을 방지하기 위해 스스로 강등하거나 변경할 수 없습니다 (`disabled`).
2. **일반관리자 제약**: 일반관리자(`admin`)는 최고관리자의 권한을 변경할 수 없으며, 타인을 최고관리자로 승격시킬 수 없습니다.
3. **원클릭 승인 토글**: 신규 가입한 `pending` 사용자를 승인 완료(`isApproved: true`)로 전환합니다.
