# 06. 빌드, 환경 설정, 배포 및 실운영 가이드
## (Build, Environment, Deployment & Operations Guide)

---

## 1. 개요 및 배포 아키텍처

쭌이형제네 가족 통합 포털 및 IB 다면평가 시스템은 Google의 글로벌 CDN 인프라를 활용하는 **Firebase Hosting**을 통해 정적 웹 애플리케이션으로 전 세계에 서비스됩니다.

* **운영 서비스 도메인**: `https://kims-diary.web.app` (보조 도메인: `https://kims-diary.firebaseapp.com`)
* **데이터베이스**: Google Cloud Firestore (프로덕션 리전: `asia-northeast3` 서울 또는 글로벌)
* **인증 제공자**: Firebase Authentication (Google OAuth 2.0)
* **AI 백엔드 연동**: Google Gemini Flash API 브라우저 직접 호출 (Direct Gemini API)

---

## 2. 환경 설정 파일 명세

애플리케이션은 실행 환경(로컬 개발 vs 프로덕션 배포)에 따라 다음 환경 변수를 참조합니다:

### 2.1 프로덕션 배포 환경 설정 (`client/.env.production`)

```properties
# ==============================================================================
# Firebase 프로덕션 운영 배포 환경 설정 (.env.production)
# ==============================================================================

# Google AI Studio 발급 프로덕션 API Key (또는 웹 UI [AI 설정]에서 입력)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_MODEL=gemini-3.8-flash

# 클라우드 운영 환경 (Firebase 로컬 에뮬레이터 비활성화)
VITE_USE_FIREBASE_EMULATOR=false
```

### 2.2 로컬 개발 환경 설정 (`client/.env.local`)

```properties
# 로컬 개발 시에는 개발자 전용 Gemini API Key를 재정의하여 사용할 수 있습니다.
VITE_AI_PROVIDER=direct_gemini
VITE_GEMINI_MODEL=gemini-3.8-flash
```

> [!TIP]
> **런타임 브라우저 로컬 저장소 우선 원칙**:
> 사용자나 평가관이 브라우저 상단의 `[AI 설정]` 모달에서 본인의 Gemini API Key나 모델을 입력하면, `.env` 파일의 값보다 **브라우저의 `localStorage` 저장값(`jjun_gemini_api_key`)이 우선 적용**됩니다. 따라서 배포된 키가 만료되거나 변경되어도 재배포 없이 웹 UI 상에서 즉시 갱신할 수 있습니다.

---

## 3. 로컬 개발 환경 실행

### 3.1 로컬 개발 서버 기동 (Vite)
```powershell
# 이동: client 디렉토리
cd c:\dev\dev\kims-diary\firebase_version\client

# Vite 개발 서버 실행 (포트: 5173)
npm run dev
```

### 3.2 로컬 Google OAuth 주의사항 (중요)
Firebase Authentication의 Google OAuth 허용 도메인은 기본적으로 `localhost`로 등록되어 있습니다.
* **접속 주소**: 반드시 **`http://localhost:5173/`** 로 접속해야 합니다.
* **자동 전환 보호**: 코드 내에 `127.0.0.1`로 접속 시 자동으로 `localhost`로 URL을 치환하는 리디렉션 코드가 내장되어 있어 OAuth 승인 오류를 원천 차단합니다.

---

## 4. 프로덕션 빌드 및 검증

배포 전 TypeScript 컴파일 에러 및 번들 결함을 사전에 검증합니다.

```powershell
# 이동: client 디렉토리
cd c:\dev\dev\kims-diary\firebase_version\client

# TypeScript 검사 및 Vite 프로덕션 빌드
npm run build
```

빌드가 성공하면 `c:\dev\dev\kims-diary\firebase_version\client\dist\` 폴더에 정적 배포 번들이 생성됩니다:
* `dist/index.html`
* `dist/assets/index-[hash].js`
* `dist/assets/index-[hash].css`

---

## 5. Firebase 원클릭 운영 배포

프로젝트 루트 디렉토리(`firebase_version`)에서 `firebase-tools`를 사용하여 호스팅 및 보안 규칙을 배포합니다.

### 5.1 호스팅(Hosting) 운영 배포
```powershell
# 이동: firebase_version 루트
cd c:\dev\dev\kims-diary\firebase_version

# Firebase Hosting 배포
npx -y firebase-tools deploy --only hosting
```

### 5.2 Firestore 보안 규칙 배포
```powershell
# Firestore rules 파일 단독 배포
npx -y firebase-tools deploy --only firestore:rules
```

### 5.3 전체 일괄 배포
```powershell
npx -y firebase-tools deploy
```

---

## 6. 실운영 트러블슈팅 및 점검 가이드

### 6.1 Google 로그인 후 가입 승인 대기 화면에 갇히는 경우
* **원인**: 최초 시스템 등록자가 아니거나, 관리자가 아직 승인을 처리하지 않은 경우입니다.
* **해결 방법**:
  1. 최고관리자(`super_admin`) 계정으로 로그인합니다.
  2. 우측 상단 `[가족 회원 관리]` 모달을 엽니다.
  3. 해당 사용자의 `승인` 버튼을 클릭하여 `승인 완료`로 전환합니다.
  4. 대기 중인 사용자가 화면의 `[승인 상태 다시 확인]` 버튼을 클릭하면 즉시 포털 메인으로 진입합니다.

### 6.2 학생 화면에서 타 학생의 글이 보이거나 학생 변경이 가능한 경우
* **원인**: 해당 계정의 권한이 `student`가 아닌 `evaluator` 또는 `admin`으로 설정되어 있거나, 학생 프로필 바인딩이 누락된 경우입니다.
* **해결 방법**:
  1. `[가족 회원 관리]` 모달에서 해당 계정의 역할을 `평가대상자 (학생)`(`student`)으로 강등 지정합니다.
  2. `[가족 학생 관리]` 모달에서 해당 학생 프로필의 `googleEmail` 항목에 해당 구글 계정 이메일이 정확히 입력되어 있는지 확인합니다.

### 6.3 AI 채점 요청 시 90초 타임아웃 오류가 발생하는 경우
* **원인**: 네트워크 지연 또는 Google Gemini API 서버의 일시적 응답 지연입니다.
* **해결 방법**:
  1. 상단 `[AI 설정]` 버튼을 클릭하여 현재 등록된 Gemini API Key의 유효성을 점검합니다.
  2. 모델을 `gemini-3.8-flash`에서 경량 모델인 `gemini-2.5-flash`로 변경하여 요청을 재시도합니다.
  3. 채점 대시보드의 **1단계 룰 검증기(`koreanRuleValidator`)**는 네트워크와 무관하게 0초 만에 상시 작동하므로, AI 응답 대기 중에도 실시간 어문 검증 결과를 즉시 확인할 수 있습니다.
