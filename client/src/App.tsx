// =========================================================
// 쭌이형제네 가족 통합 포털 (App.tsx)
// =========================================================
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { JjunBrothersLandingPage } from './components/JjunBrothersLandingPage';
import { JjunBrothersHub } from './components/JjunBrothersHub';
import { FamilyAlbumView } from './components/FamilyAlbumView';
import { InputToolbar } from './components/InputToolbar';
import { AssessmentSplitView } from './components/AssessmentSplitView';
import { GuideModal } from './components/GuideModal';
import { PortfolioModal } from './components/PortfolioModal';
import { StudentManagerModal } from './components/StudentManagerModal';
import { AIHomeServerAdminModal } from './components/AIHomeServerAdminModal';
import { UserManagementModal } from './components/UserManagementModal';
import { StudentAssessmentView } from './components/StudentAssessmentView';
import { EvaluatorDashboardView } from './components/EvaluatorDashboardView';
import {
  AssessmentGuide,
  AssessmentResult,
  IBProgram,
  EssayVersion,
  UserRole,
  UserProfile,
} from './types/assessment';
import { StudentProfile } from './types/student';
import {
  fetchStudents,
  fetchEssayVersions,
  submitRevisedEssay,
  saveAssessmentRecord,
  saveEssayVersionRecord,
  createStudent,
} from './services/assessmentService';
import {
  checkAiServiceStatus,
  evaluateEssayDynamic,
  AIHomeServerStatus,
} from './services/aiBridgeService';
import {
  loginWithGoogle,
  signOutUser,
  subscribeAuthState,
  getStoredUser,
  fetchFreshUserProfile,
} from './services/authService';
import { ArrowLeft, Clock, RefreshCw, LogOut, CheckCircle2, ShieldCheck, Heart } from 'lucide-react';

const DEFAULT_GUIDE: AssessmentGuide = {
  title: '서술형 논증 에세이',
  program: 'PYP',
  gradeLevel: '초등 6학년',
  promptOverview: '주제에 대한 자신의 생각을 논리적으로 서술하고 근거를 제시하는 에세이',
  focusPoints: ['논리적 비약 방지', '어문 규범 준수', '주제 적합성'],
  rubricRequirements: 'IB 공식 4대 기준(A, B, C, D) 평가',
  references: [],
};

export const App: React.FC = () => {
  // 127.0.0.1 접속 시 구글 OAuth 기본 승인 도메인인 localhost로 자동 전환
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
      const targetUrl = window.location.href.replace('127.0.0.1', 'localhost');
      window.location.replace(targetUrl);
    }
  }, []);

  // Subsystem Navigation State ('hub' | 'album' | 'ib_assessment')
  const [currentSubsystem, setCurrentSubsystem] = useState<'hub' | 'album' | 'ib_assessment'>('hub');

  // Google Auth Profile State (세션 복원 지원)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(getStoredUser());
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Student Profile State
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  const [studentsList, setStudentsList] = useState<StudentProfile[]>([]);

  // Evaluator Writing-as-Student Mode State
  const [evaluatorStudentProfile, setEvaluatorStudentProfile] = useState<StudentProfile | null>(null);
  const [isEvaluatorInStudentMode, setIsEvaluatorInStudentMode] = useState<boolean>(false);

  // Essay & Guide State
  const [content, setContent] = useState<string>('');
  const [guide, setGuide] = useState<AssessmentGuide>(DEFAULT_GUIDE);

  // Result & Active Annotation State
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // Multi-Draft Versioning State
  const [versions, setVersions] = useState<EssayVersion[]>([]);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number>(1);
  const [isRevising, setIsRevising] = useState<boolean>(false);

  // Execution & Modal States
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState<boolean>(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [isAiAdminModalOpen, setIsAiAdminModalOpen] = useState<boolean>(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState<boolean>(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState<boolean>(false);

  // Role Checker
  const isEvaluator =
    userProfile?.role === 'evaluator' ||
    userProfile?.role === 'admin' ||
    userProfile?.role === 'super_admin' ||
    userProfile?.role === 'teacher';

  // AI Service Real-Time Status State
  const [aiServerStatus, setAiServerStatus] = useState<AIHomeServerStatus | null>(null);
  const refreshAiStatus = async () => {
    try {
      const status = await checkAiServiceStatus();
      setAiServerStatus(status);
    } catch {
      setAiServerStatus({
        aiOnline: false,
        message: 'AI 서비스를 확인할 수 없습니다.',
        lastChecked: new Date().toLocaleTimeString(),
      });
    }
  };

  useEffect(() => {
    refreshAiStatus();
    const interval = setInterval(refreshAiStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Google Auth State Subscription
  useEffect(() => {
    const unsubscribe = subscribeAuthState((user) => {
      setUserProfile(user);
    });
    return () => unsubscribe();
  }, []);

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        setUserProfile(res.user);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('popup-closed-by-user')) {
        alert(err.message);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Logout Handler
  const handleLogout = async () => {
    await signOutUser();
    setUserProfile(null);
    setCurrentSubsystem('hub');
  };

  // 승인 대기 상태 수동 즉시 확인
  const handleCheckApproval = async () => {
    if (!userProfile?.id) return;
    setIsCheckingApproval(true);
    try {
      const fresh = await fetchFreshUserProfile(String(userProfile.id));
      if (fresh) {
        setUserProfile(fresh);
        if (fresh.isApproved) {
          alert('🎉 관리자 승인이 완료되었습니다! 쭌이형제네 포털에 오신 것을 환영합니다.');
        } else {
          alert('아직 관리자 승인 대기 중입니다. 최고관리자에게 승인을 요청해 주세요.');
        }
      }
    } catch {
      alert('승인 상태 확인 중 오류가 발생했습니다.');
    } finally {
      setIsCheckingApproval(false);
    }
  };

  // Load real registered students from server & strictly match current user
  const loadStudents = async () => {
    try {
      const list = await fetchStudents();
      setStudentsList(list || []);

      if (userProfile?.role === 'student') {
        // [학생 권한 계정]: 반드시 본인 계정의 이메일/UID/이름에 매핑된 학생 프로필을 우선 지정
        const userEmail = (userProfile.email || '').trim().toLowerCase();
        const userName = (userProfile.name || '').trim().toLowerCase();
        const userUid = String(userProfile.id || '').trim();

        // 1. 구글 이메일 정확 일치
        let myStudentProfile = list.find((s) => {
          const sEmail = (s.googleEmail || '').trim().toLowerCase();
          return Boolean(userEmail && sEmail && sEmail === userEmail);
        });

        // 2. 구글 UID 일치
        if (!myStudentProfile && userUid) {
          myStudentProfile = list.find((s) => s.googleUid && String(s.googleUid).trim() === userUid);
        }

        // 3. 이름 일치
        if (!myStudentProfile && userName) {
          myStudentProfile = list.find((s) => s.name.trim().toLowerCase() === userName);
        }

        // 4. 이메일 아이디(prefix)와 이름 일치 (예: jdkim0418)
        if (!myStudentProfile && userEmail) {
          const emailPrefix = userEmail.split('@')[0];
          myStudentProfile = list.find((s) => s.name.trim().toLowerCase() === emailPrefix);
        }

        if (myStudentProfile) {
          setCurrentStudent(myStudentProfile);
          setGuide((prev) => ({
            ...prev,
            program: myStudentProfile.program,
            gradeLevel: myStudentProfile.gradeLevel,
          }));
        } else {
          // 아직 학생 프로필로 등록되지 않은 경우: 본인 계정으로 즉시 신규 학생 프로필 자동 생성 등록
          try {
            const autoCreated = await createStudent({
              name: userProfile.name || (userEmail ? userEmail.split('@')[0] : '학생'),
              googleEmail: userProfile.email,
              googleUid: String(userProfile.id),
              program: 'MYP',
              gradeLevel: 'MYP 3 (중2)',
              notes: '학생 계정 최초 로그인 자동 등록',
            });
            setCurrentStudent(autoCreated);
            setStudentsList((prev) => [...prev, autoCreated]);
            setGuide((prev) => ({
              ...prev,
              program: autoCreated.program,
              gradeLevel: autoCreated.gradeLevel,
            }));
          } catch (createErr) {
            console.warn('학생 프로필 자동 등록 경고/확인:', createErr);
            // 만약 이미 존재하여 에러가 났다면 최신 목록에서 다시 재조회
            const refreshed = await fetchStudents();
            const found = refreshed.find(
              (s) =>
                (s.googleEmail && s.googleEmail.trim().toLowerCase() === userEmail) ||
                (s.name && s.name.trim().toLowerCase() === userName) ||
                (userEmail && s.name.trim().toLowerCase() === userEmail.split('@')[0])
            );
            if (found) {
              setCurrentStudent(found);
              setStudentsList(refreshed);
              setGuide((prev) => ({
                ...prev,
                program: found.program,
                gradeLevel: found.gradeLevel,
              }));
            } else {
              // 최후 안전 가상 임시 프로필 생성 (절대 다른 학생의 프로필을 임의 할당하지 않음)
              const fallbackStudent: StudentProfile = {
                id: Date.now(),
                name: userProfile.name || (userEmail ? userEmail.split('@')[0] : '학생'),
                googleEmail: userProfile.email,
                googleUid: String(userProfile.id),
                program: 'MYP',
                gradeLevel: 'MYP 3 (중2)',
              };
              setCurrentStudent(fallbackStudent);
            }
          }
        }
      } else {
        // [평가자 / 관리자 권한 계정]: 전체 학생 중 기존 선택 유지 또는 첫 번째 학생 선택
        if (list && list.length > 0) {
          if (!currentStudent || !list.some((s) => s.name === currentStudent.name)) {
            setCurrentStudent(list[0]);
            setGuide((prev) => ({
              ...prev,
              program: list[0].program,
              gradeLevel: list[0].gradeLevel,
            }));
          }
        } else {
          setCurrentStudent(null);
        }
      }
    } catch (e) {
      console.error('학생 목록 로드 실패:', e);
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadStudents();
    }
  }, [userProfile]);

  // Sync versions whenever student or title changes
  const syncVersions = async (studentName: string, title: string) => {
    if (!studentName || !title) return;
    const list = await fetchEssayVersions(studentName, title);
    setVersions(list);
    if (list.length > 0) {
      setCurrentVersionNumber(list[list.length - 1].versionNumber);
    }
  };

  useEffect(() => {
    if (currentStudent && guide) {
      syncVersions(currentStudent.name, guide.title);
    }
  }, [currentStudent?.name, guide?.title]);

  // =========================================================
  // Event Handlers
  // =========================================================
  const handleProgramChange = (p: IBProgram) => {
    setGuide((prev) => ({ ...prev, program: p }));
  };

  const handleSelectStudent = (student: StudentProfile) => {
    setCurrentStudent(student);
    setGuide((prev) => ({
      ...prev,
      program: student.program,
      gradeLevel: student.gradeLevel,
    }));
    setContent('');
    setResult(null);
    setActiveAnnotationId(null);
    syncVersions(student.name, guide.title);
  };

  const handleRestoreAssessment = (restoredContent: string, restored: AssessmentResult, title?: string) => {
    setContent(restoredContent);
    setResult(restored);
    setActiveAnnotationId(null);
    if (title) {
      setGuide((prev) => ({ ...prev, title }));
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleNewEssay = () => {
    if (content.trim() && !result) {
      if (!window.confirm('작성 중인 내용이 아직 평가되지 않았습니다. 현재 내용을 비우고 새 에세이를 작성하시겠습니까?')) {
        return;
      }
    }
    const entered = window.prompt(
      '새로 작성할 에세이의 제목을 입력해 주세요:\n(이전 평가 결과는 [성장 분석] 포트폴리오에 안전하게 보관되어 있습니다)',
      '자유 주제 서술형 에세이'
    );
    if (entered === null) return;

    const newTitle = entered.trim() || '자유 주제 서술형 에세이';
    setContent('');
    setResult(null);
    setActiveAnnotationId(null);
    setVersions([]);
    setCurrentVersionNumber(1);
    setGuide((prev) => ({
      ...prev,
      title: newTitle,
    }));
  };

  const handleEvaluate = async () => {
    if (!currentStudent) {
      alert('평가 대상 학생이 지정되지 않았습니다. 등록된 가족 학생을 선택하거나 학생을 신규 등록해 주세요.');
      setIsStudentModalOpen(true);
      return;
    }

    if (!content.trim()) {
      alert('평가할 에세이 본문을 입력해 주세요.');
      return;
    }

    setIsEvaluating(true);
    setActiveAnnotationId(null);

    try {
      const { result: finalResult, engine } = await evaluateEssayDynamic(
        content,
        guide,
        currentStudent.name
      );
      setResult(finalResult);

      // 평가 결과 자동 저장 및 1차 초안 등록
      await saveAssessmentRecord({
        studentName: currentStudent.name,
        essayTitle: guide.title,
        content,
        guide,
        result: finalResult,
        engine,
      });

      const existingVersions = await fetchEssayVersions(currentStudent.name, guide.title);
      if (existingVersions.length === 0) {
        await saveEssayVersionRecord({
          id: `ver-${Date.now()}`,
          studentName: currentStudent.name,
          essayTitle: guide.title,
          versionNumber: 1,
          versionLabel: '1차 초안',
          content,
          overallScore: finalResult.overallScore,
          createdAt: new Date().toISOString(),
          changelog: '초안 최초 작성 및 평가 완료',
        });
      }

      await syncVersions(currentStudent.name, guide.title);
      alert(
        `'${currentStudent.name}' 학생의 에세이 IB 다면평가가 완료되었습니다.\n\n` +
        `• 총 성취도: ${finalResult.overallScore} / 32점\n` +
        `• 정밀 첨삭 항목: ${finalResult.annotations?.length || 0}건\n` +
        `• 적용 엔진: ${engine}\n\n` +
        `좌측 본문의 하이라이트 첨삭 및 우측의 IB 4대 기준 루브릭을 확인해 보세요.`
      );
    } catch (err: any) {
      if (err.code === 'MISSING_API_KEY') {
        const goSettings = window.confirm(
          `${err.message}\n\n지금 바로 [AI 설정] 창을 열어 Gemini API 키를 등록하시겠습니까?`
        );
        if (goSettings) {
          setIsAiAdminModalOpen(true);
        }
      } else {
        alert(`평가 처리 중 오류: ${err.message || '다시 시도해 주세요.'}`);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleSelectVersion = (version: EssayVersion) => {
    setContent(version.content);
    setCurrentVersionNumber(version.versionNumber);
    setResult({
      assessedAt: version.createdAt,
      overallScore: version.overallScore,
      overallSummary: `${version.versionLabel} 평가 기록 복원`,
      warmFeedback: ['이전 회차 에세이 기록입니다.'],
      coolFeedback: ['수정 후 재평가를 실행해 보세요.'],
      criteria: {
        criterionA: { name: 'Analyzing', nameKr: '분석 및 이해', score: Math.round(version.overallScore / 4), maxScore: 8, description: '', feedback: '' },
        criterionB: { name: 'Organizing', nameKr: '논리적 구성', score: Math.round(version.overallScore / 4), maxScore: 8, description: '', feedback: '' },
        criterionC: { name: 'Producing Text', nameKr: '텍스트 생산', score: Math.round(version.overallScore / 4), maxScore: 8, description: '', feedback: '' },
        criterionD: { name: 'Using Language', nameKr: '언어 규범', score: Math.round(version.overallScore / 4), maxScore: 8, description: '', feedback: '' },
      },
      annotations: [],
      guidingQuestions: [],
    });
  };

  const handleSubmitRevision = async (revisedContent: string) => {
    if (!currentStudent) {
      alert('평가 대상 학생이 지정되지 않았습니다.');
      return;
    }
    setIsRevising(true);
    try {
      const res = await submitRevisedEssay(
        currentStudent.name,
        guide.title,
        revisedContent,
        guide
      );
      setContent(res.version.content);
      setCurrentVersionNumber(res.version.versionNumber);
      setResult(res.result);
      await syncVersions(currentStudent.name, guide.title);
      alert(`🎉 ${res.version.versionLabel} 재평가가 완료되었습니다! 점수: ${res.version.overallScore}점`);
    } catch (err: any) {
      alert(`퇴고본 재평가 제출 실패: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      setIsRevising(false);
    }
  };

  // =========================================================
  // View Routing 1: 비로그인 상태일 때는 로그인 유도 랜딩 페이지만 렌더링
  // =========================================================
  if (!userProfile) {
    return (
      <JjunBrothersLandingPage
        onLoginWithGoogle={handleGoogleLogin}
        isLoggingIn={isLoggingIn}
        aiServerStatus={aiServerStatus}
        onRefreshAiStatus={refreshAiStatus}
      />
    );
  }

  // =========================================================
  // View Routing 2: 로그인했으나 관리자 승인 대기 중인 사용자 화면
  // =========================================================
  if (userProfile && !userProfile.isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6 relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
            <Clock className="w-8 h-8 animate-pulse text-amber-500" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 text-xs font-bold mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>가입 승인 대기 중</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-1">
              관리자의 승인을 기다리고 있습니다
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              쭌이형제네 가족 통합 포털에 오신 것을 환영합니다!<br />
              현재 계정은 보안 및 가족 승인 정책에 따라 대기 상태입니다.
            </p>
          </div>

          {/* User Account Info Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left flex items-center gap-3">
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="w-11 h-11 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                {userProfile.name ? userProfile.name.slice(0, 1) : '구'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-slate-900 truncate">{userProfile.name}</h4>
              <p className="text-xs text-slate-500 truncate">{userProfile.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold">
                기본 권한: {userProfile.role === 'student' ? '평가대상자 (학생)' : userProfile.role}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 text-left space-y-1">
            <p className="font-semibold text-indigo-900 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>승인 절차 안내</span>
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              최고 관리자 또는 관리자가 회원 관리 페이지에서 가입을 승인하면 IB 서술형 다면평가와 포털 서비스를 이용하실 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={handleCheckApproval}
              disabled={isCheckingApproval}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition text-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingApproval ? 'animate-spin' : ''}`} />
              <span>{isCheckingApproval ? '승인 상태 확인 중...' : '승인 상태 다시 확인'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>로그아웃 (다른 계정으로 로그인)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // 로그인 & 승인 완료 상태: 상단 헤더 및 서브시스템 화면 렌더링
  // =========================================================
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans">
      {/* Global Header */}
      <Header
        program={guide.program}
        onProgramChange={handleProgramChange}
        onOpenGuideModal={() => setIsGuideModalOpen(true)}
        onOpenPortfolioModal={() => setIsPortfolioModalOpen(true)}
        onOpenStudentModal={() => setIsStudentModalOpen(true)}
        onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
        currentStudent={isEvaluator && isEvaluatorInStudentMode ? (evaluatorStudentProfile || currentStudent) : currentStudent}
        userRole={userProfile.role}
        userProfile={userProfile}
        onLoginWithGoogle={handleGoogleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        onOpenAiAdmin={() => setIsAiAdminModalOpen(true)}
        aiServerStatus={aiServerStatus}
        onRefreshAiStatus={refreshAiStatus}
        currentSubsystem={currentSubsystem}
        onSubsystemChange={(sub) => setCurrentSubsystem(sub)}
        isEvaluatorInStudentMode={isEvaluatorInStudentMode}
        onToggleEvaluatorStudentMode={() => setIsEvaluatorInStudentMode(!isEvaluatorInStudentMode)}
      />

      {/* Dynamic Subsystem View Router */}
      {currentSubsystem === 'hub' && (
        <main className="flex-1 overflow-y-auto">
          <JjunBrothersHub
            userProfile={userProfile}
            aiServerStatus={aiServerStatus}
            studentsCount={studentsList.length}
            onSelectSubsystem={(sub) => setCurrentSubsystem(sub)}
            onOpenPortfolioModal={() => setIsPortfolioModalOpen(true)}
            onOpenStudentModal={isEvaluator ? () => setIsStudentModalOpen(true) : undefined}
            onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
            onLoginWithGoogle={handleGoogleLogin}
            isLoggingIn={isLoggingIn}
          />
        </main>
      )}

      {currentSubsystem === 'album' && (
        <main className="flex-1 overflow-y-auto">
          <FamilyAlbumView
            onBackToHub={() => setCurrentSubsystem('hub')}
            onGoToIBAssessment={() => setCurrentSubsystem('ib_assessment')}
          />
        </main>
      )}

      {currentSubsystem === 'ib_assessment' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Back to Hub shortcut pill for quick navigation */}
          <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex items-center justify-between text-xs shrink-0">
            <button
              onClick={() => setCurrentSubsystem('hub')}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-semibold transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>쭌이형제네 포털 홈으로</span>
            </button>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>서브시스템 2.2 · IB 서술형 다면평가 시스템</span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-indigo-700">
                {isEvaluator
                  ? isEvaluatorInStudentMode
                    ? '평가자 계정 (학생 모드 전환됨)'
                    : '평가관 채점 대시보드'
                  : '학생 포털'}
              </span>
            </div>
          </div>

          {/* Role-based Dynamic Subsystem Workflow */}
          {isEvaluator && !isEvaluatorInStudentMode ? (
            /* 평가자 전용 뷰: 학생이 올린 글 리스트 조회 및 채점/피드백 반환 */
            <EvaluatorDashboardView
              userProfile={userProfile}
              aiServerStatus={aiServerStatus}
              onRefreshAiStatus={refreshAiStatus}
              onOpenAiAdmin={() => setIsAiAdminModalOpen(true)}
              onSwitchToStudentMode={(profile) => {
                setEvaluatorStudentProfile(profile);
                setIsEvaluatorInStudentMode(true);
              }}
              onOpenStudentModal={() => setIsStudentModalOpen(true)}
              onOpenUserManagement={() => setIsUserManagementModalOpen(true)}
              onOpenPortfolioModal={() => setIsPortfolioModalOpen(true)}
            />
          ) : (
            /* 학생 전용 뷰: 글 작성 및 1차 평가 요청, 피드백 확인 후 2차 퇴고 요청 */
            <StudentAssessmentView
              userProfile={userProfile}
              currentStudent={isEvaluator ? (evaluatorStudentProfile || currentStudent) : currentStudent}
              onOpenStudentModal={isEvaluator ? () => setIsStudentModalOpen(true) : undefined}
              onSwitchToEvaluator={isEvaluator ? () => setIsEvaluatorInStudentMode(false) : undefined}
              isEvaluatorUser={isEvaluator}
            />
          )}
        </div>
      )}

      {/* Guide / Prompt Modal */}
      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        guide={guide}
        onSave={(newGuide) => setGuide(newGuide)}
      />

      {/* Cumulative Growth Portfolio Modal */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        studentName={currentStudent?.name || ''}
        onSelectAssessment={handleRestoreAssessment}
        canManageHistory={true}
      />

      {/* Student Manager & Past Assessment History Modal */}
      <StudentManagerModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          loadStudents();
        }}
        currentStudent={currentStudent}
        onSelectStudent={handleSelectStudent}
        onRestoreAssessment={handleRestoreAssessment}
      />

      {/* AI Settings / Gemini API Control Modal */}
      <AIHomeServerAdminModal
        isOpen={isAiAdminModalOpen}
        onClose={() => setIsAiAdminModalOpen(false)}
        currentUser={userProfile}
        onRestoreAssessment={handleRestoreAssessment}
        onAiConfigChange={refreshAiStatus}
      />

      {/* User Approval & Role Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
        currentUser={userProfile}
        onUserUpdated={() => loadStudents()}
      />
    </div>
  );
};

export default App;
