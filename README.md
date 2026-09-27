# 쭌이형제네 가족 포털 & IB 서술형 에세이 다면평가 시스템 (firebase_version)

본 디렉토리(`firebase_version/`)는 **Firebase 클라우드 인프라(Hosting, Auth, Firestore, Functions)**와 **Google Gemini 최신 AI 모델(Direct Gemini API)**을 기반으로 하는 **서버리스 올인원 웹 애플리케이션 프로젝트**입니다.

별도의 복잡한 외부 AI 홈서버 구동 없이, 브라우저에서 Google Gemini API와 한국어 어문 규범 룰 엔진을 통해 실시간으로 IB 공식 4대 기준 다면평가 및 인라인 첨삭을 수행합니다.

---

## 🏛️ 전체 시스템 아키텍처

```
[학생 / 평가관 웹 브라우저] (PC, 태블릿, 모바일 어디서나 접속)
         │
         ├── ① 글로벌 CDN 웹 호스팅 & Google OAuth 2.0 (Firebase Hosting & Auth)
         ├── ② 에세이 작성, 피드백, 버전 히스토리 영구 저장 (Cloud Firestore)
         │
         ├── ③ 0초 즉각 검증 엔진: 한국어 표준 어문규범 / 맞춤법 / 띄어쓰기 / 논리 룰 (koreanRuleValidator.ts)
         │
         └── ④ 실시간 심층 다면평가: Google Gemini API 직접 동기 호출 (geminiDirectService.ts)
              (gemini-3.8-flash / gemini-2.5-flash)
```

---

## 📂 디렉토리 구조

```
firebase_version/
├── firebase.json              # Firebase 호스팅, 클라우드 함수, Firestore 배포 설정
├── firestore.rules            # Firestore 사용자별 보안 및 접근 제어 규칙
├── firestore.indexes.json     # Firestore 쿼리 색인 설정
├── .firebaserc                # Firebase 프로젝트 식별자 (kims-diary)
├── .gitignore                 # 보안 키(sa/), .env 환경변수, 빌드 산출물 차단 규칙
│
├── client/                    # [프론트엔드] React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── firebase/config.ts # Firebase 초기화 (Auth, Firestore, Functions)
│   │   ├── services/
│   │   │   ├── geminiDirectService.ts # Google Gemini API 직접 연동 및 마스터 프롬프트
│   │   │   ├── koreanRuleValidator.ts # 0초 즉각 한국어 어문규범 및 논리 검증 엔진
│   │   │   ├── aiBridgeService.ts     # Gemini AI 실시간 상태 점검 및 평가 서비스
│   │   │   ├── assessmentService.ts   # 에세이 제출, N차 퇴고, 학생 프로필 관리
│   │   │   └── authService.ts         # Google OAuth 및 5단계 권한 관리
│   │   ├── components/
│   │   │   ├── Header.tsx             # 전역 헤더, 서브시스템 내비게이션, 권한 배지
│   │   │   ├── JjunBrothersHub.tsx    # 서브시스템 2.0 포털 메인 허브
│   │   │   ├── FamilyAlbumView.tsx    # 서브시스템 2.1 가족앨범
│   │   │   ├── StudentAssessmentView.tsx  # 서브시스템 2.2 학생 전용 글쓰기/퇴고 포털
│   │   │   ├── EvaluatorDashboardView.tsx # 서브시스템 2.2 평가관 채점 대시보드
│   │   │   ├── AnnotatedEssayViewer.tsx   # 본문 인터랙티브 5대 인라인 첨삭 뷰어
│   │   │   ├── UserManagementModal.tsx    # 회원 승인 및 5단계 권한 관리
│   │   │   └── AIHomeServerAdminModal.tsx # Gemini API 키, 모델 및 평가 이력 콘솔
│   │   └── App.tsx                    # 전역 라우터 및 상태 동기화
│   ├── .env.example           # 환경 설정 템플릿
│   ├── package.json
│   └── vite.config.ts
│
├── functions/                 # [API 게이트웨이] Firebase Cloud Functions (TypeScript)
│   ├── src/index.ts           # 헬스체크(/health) 기본 엔드포인트
│   ├── package.json
│   └── tsconfig.json
│
└── docs/                      # [공식 문서집] 전체 시스템 기술 및 운영 가이드
    ├── README.md
    ├── 01_SYSTEM_ARCHITECTURE.md
    ├── 02_ROLE_BASED_WORKFLOW.md
    ├── 03_AI_AND_RULE_VALIDATION.md
    ├── 04_DATA_MODELS_AND_FIRESTORE.md
    ├── 05_COMPONENT_REFERENCE.md
    └── 06_DEPLOYMENT_AND_OPERATION.md
```

---

## 🚀 빠른 시작 및 로컬 실행 가이드

### 1. 프론트엔드 클라이언트 실행
```bash
cd firebase_version/client
npm install
npm run dev
```
- 브라우저 접속: `http://localhost:5173/`
- 구글 계정으로 로그인 후 상단 `[AI 설정]` 창에서 Gemini API 키를 등록하면 즉시 AI 다면평가를 사용할 수 있습니다.

### 2. 프로덕션 빌드 및 배포
```bash
# 1) 클라이언트 빌드
cd firebase_version/client
npm run build

# 2) Firebase Hosting 원클릭 배포
cd firebase_version
npx -y firebase-tools deploy --only hosting
```
