# 쭌이형제네 가족 포털 & IB 다면평가 시스템 개발/운영 공식 문서집
## (firebase_version Documentation Suite)

본 디렉토리(`firebase_version/docs/`)는 **쭌이형제네 가족 통합 포털** 및 **서브시스템 2.2 IB 서술형 에세이 다면평가 시스템**의 아키텍처, 권한 체계, 데이터 모델, AI 평가 파이프라인, 컴포넌트 구조 및 배포/운영 가이드를 종합 정리한 공식 기술 문서 저장소입니다.

---

## 📑 문서 목차 (Document Index)

| 번호 | 문서명 | 주요 내용 |
| :---: | :--- | :--- |
| **01** | [01_SYSTEM_ARCHITECTURE.md](./01_SYSTEM_ARCHITECTURE.md) | **전체 시스템 아키텍처 및 Gemini 파이프라인**<br>• Firebase(Hosting, Auth, Firestore, Functions) + Google Gemini API 직접 연동 구조<br>• 쭌이형제네 서브시스템 체계 (허브 2.0 / 가족앨범 2.1 / IB 다면평가 2.2)<br>• 실시간 동기식 에세이 평가 파이프라인 및 백오프 전략 |
| **02** | [02_ROLE_BASED_WORKFLOW.md](./02_ROLE_BASED_WORKFLOW.md) | **역할별 권한 매트릭스 및 포털 상호작용 워크플로**<br>• 5단계 권한 체계 (`super_admin`, `admin`, `evaluator`, `student`, `pending`)<br>• 학생 전용 포털: 계정 1:1 강제 바인딩, 글 제출(1차) $\rightarrow$ 대기 $\rightarrow$ 피드백 확인 $\rightarrow$ 퇴고(2차)<br>• 평가관 대시보드: 제출 리스트, 채점 작업대, 준거 점수 부여, 총평/지도 조언 반환<br>• 화면 요소별 권한별 ON/OFF 가시성 매트릭스 |
| **03** | [03_AI_AND_RULE_VALIDATION.md](./03_AI_AND_RULE_VALIDATION.md) | **한국어 어문 규범/논리 검증 엔진 & Gemini AI 다면평가 파이프라인**<br>• 0초 즉각 검증 엔진 (`koreanRuleValidator.ts`): 오탈자, 띄어쓰기, 조사, 논리 모순<br>• Gemini AI 심층 마스터 프롬프트 및 IB 4대 기준(A~D) 채점 지침<br>• 5대 인라인 첨삭 시각화: 맞춤법(Rose), 논리(Amber), 통찰(Emerald), 팩트(Purple), 맥락(Sky) |
| **04** | [04_DATA_MODELS_AND_FIRESTORE.md](./04_DATA_MODELS_AND_FIRESTORE.md) | **Firestore 데이터베이스 스키마 및 영구 데이터 모델**<br>• `users`, `students`, `essay_submissions`, `essay_versions` 컬렉션 구조<br>• 학생 프로필 및 작성 글의 계정 독립적 영구 보존 원칙<br>• N차 제출/퇴고 라운드(`rounds`) 및 인라인 첨삭(`annotations`) 데이터 구조 |
| **05** | [05_COMPONENT_REFERENCE.md](./05_COMPONENT_REFERENCE.md) | **프론트엔드 핵심 컴포넌트 아키텍처 레퍼런스**<br>• `App.tsx` (라우팅, 학생 매핑, 전역 상태 동기화)<br>• `AnnotatedEssayViewer.tsx` (인터랙티브 본문 하이라이트 & 양방향 스크롤)<br>• `EvaluatorDashboardView.tsx` (평가관 3대 탭 채점 작업대)<br>• `StudentAssessmentView.tsx` (학생 작성/퇴고 포털 & 원클릭 수정 반영)<br>• `Header.tsx`, `JjunBrothersHub.tsx`, `UserManagementModal.tsx` |
| **06** | [06_DEPLOYMENT_AND_OPERATION.md](./06_DEPLOYMENT_AND_OPERATION.md) | **빌드, 환경 설정, 배포 및 실운영 가이드**<br>• Vite & TypeScript 프로덕션 클린 빌드 검증<br>• 환경 변수 설정 (`.env.production`, `.env.local`) 및 Google Gemini Flash API 연동<br>• Firebase Hosting / Rules 원클릭 배포 명령어<br>• 운영 장애 점검 및 트러블슈팅 체크리스트 |

---

## 🏛️ 시스템 핵심 설계 원칙

1. **학생-평가자 간 명확한 워크플로 분리**:
   * 학생은 자신의 글을 올리고(1차), 평가관의 피드백을 확인한 후 이를 수정하여 재평가(2차)를 요청하는 작성 중심 포털을 이용합니다.
   * 평가자는 학생별 제출 목록을 조회하고, 실시간 어문 검증과 AI 초안을 바탕으로 첨삭 및 4대 준거 점수를 부여하여 학생에게 결과를 반환합니다.
2. **엄격한 권한 격리 및 학생 계정 1:1 바인딩**:
   * 학생 권한(`student`) 계정은 타 학생의 프로필을 선택하거나 변경할 수 없으며, 본인 계정(구글 이메일/UID)에 1:1로 매핑된 학생 프로필로만 글을 작성합니다.
   * 학생 화면에서는 학생 변경 버튼, IB 프로그램 단계 탭, 채점 가이드 설정, AI 홈서버 설정 등 관리자성 컨트롤이 원천적으로 은닉(OFF)됩니다.
3. **핵심 검증 기능 보존 및 이중 검증 파이프라인**:
   * **1차 실시간 룰 엔진 (0초)**: 한국어 표준 어문 규범(맞춤법, 띄어쓰기, 조사 '의/에' 혼동) 및 논리 모순/비약 검출.
   * **2차 Gemini AI 심층 다면평가**: 본문 전 구간(서론~결론)에 걸친 10~25건 이상의 풍부한 인라인 첨삭 및 IB 준거별 점수 산출.
4. **학생 글 영구 보존 원칙**:
   * 학생이 등록한 에세이는 구글 계정의 권한 변경이나 탈퇴와 무관하게 `students` 및 `essay_submissions` 컬렉션에 독립된 엔티티로 영구 관리됩니다.
