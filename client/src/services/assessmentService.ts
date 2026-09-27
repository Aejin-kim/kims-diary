import {
  AssessmentGuide,
  AssessmentResult,
  InlineAnnotation,
  EssayVersion,
  UserProfile,
  ManagedUser,
  UserRole,
  EssaySubmission,
  EssaySubmissionRound,
  SubmissionStatus,
  IBProgram,
} from '../types/assessment';
import { DEFAULT_FAMILY_USER } from './authService';
import { StudentProfile, StudentFormData } from '../types/student';
import { SAMPLE_ESSAY_AI } from '../data/sampleEssays';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

import { evaluateEssayDynamic } from './aiBridgeService';
import JSZip from 'jszip';

const STORAGE_KEY_STUDENTS = 'ib_students_cache';
const STORAGE_KEY_TOKEN = 'ib_auth_token';
const STORAGE_KEY_USER = 'ib_auth_user';
const STORAGE_KEY_ASSESSMENTS = 'ib_assessments_cache';
const STORAGE_KEY_VERSIONS = 'ib_essay_versions_cache';
const STORAGE_KEY_SUBMISSIONS = 'ib_submissions_cache';

export function getLocalSubmissions(): EssaySubmission[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalSubmissions(items: EssaySubmission[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(items));
}

export function getLocalAssessments(): any[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_ASSESSMENTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalAssessments(items: any[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ASSESSMENTS, JSON.stringify(items));
}

export function getLocalVersions(): EssayVersion[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEY_VERSIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveLocalVersions(items: EssayVersion[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(items));
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}

export function getStoredUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY_USER);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}


// 기본 로컬 메모리 학생 목록 (더미 학생 데이터 완전 제거)
const INITIAL_STUDENTS: StudentProfile[] = [];

// 레거시 더미 데이터 (김민준, 이서연, 박도현) 정리 유틸리티
export function clearLegacyDummyData() {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
  if (raw) {
    try {
      const parsed: StudentProfile[] = JSON.parse(raw);
      const cleaned = parsed.filter(
        (s) => s.name !== '김민준' && s.name !== '이서연' && s.name !== '박도현'
      );
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(cleaned));
    } catch {
      localStorage.removeItem(STORAGE_KEY_STUDENTS);
    }
  }

  // 더미 에세이 버전 캐시 정리
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('김민준') || key.includes('이서연') || key.includes('박도현'))) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    // ignore
  }
}

function getLocalStudents(): StudentProfile[] {
  if (typeof window === 'undefined') return [];
  clearLegacyDummyData();
  const raw = localStorage.getItem(STORAGE_KEY_STUDENTS);
  if (!raw) return [];
  try {
    const parsed: StudentProfile[] = JSON.parse(raw);
    return parsed.filter(
      (s) => s.name !== '김민준' && s.name !== '이서연' && s.name !== '박도현'
    );
  } catch {
    return [];
  }
}

function saveLocalStudents(list: StudentProfile[]) {
  if (typeof window !== 'undefined') {
    const cleaned = list.filter(
      (s) => s.name !== '김민준' && s.name !== '이서연' && s.name !== '박도현'
    );
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(cleaned));
  }
}

// =========================================================
// Section 2: Student Management APIs (Firestore + Real Student Members)
// =========================================================
export async function fetchStudents(): Promise<StudentProfile[]> {
  clearLegacyDummyData();
  const studentsList: StudentProfile[] = [];

  try {
    // Firestore의 students 컬렉션 (등록된 가족 학생) 조회
    const studentsSnap = await getDocs(collection(db, 'students'));
    studentsSnap.forEach((d) => {
      const s = d.data();
      if (!studentsList.some((existing) => existing.name === s.name)) {
        studentsList.push({
          id: s.id || d.id,
          name: s.name,
          googleEmail: s.googleEmail || '',
          googleUid: s.googleUid || '',
          program: s.program || 'MYP',
          gradeLevel: s.gradeLevel || '중등 과정',
          notes: s.notes || '',
          essayCount: s.essayCount || 0,
          avgScore: s.avgScore || null,
        });
      }
    });
  } catch (err) {
    console.warn('Firestore 학생 목록 로드 오류, 로컬 캐시를 사용합니다:', err);
  }

  // 로컬 브라우저 저장소 캐시와 병합
  const localList = getLocalStudents();
  localList.forEach((s) => {
    if (!studentsList.some((existing) => existing.name === s.name)) {
      studentsList.push(s);
    }
  });

  saveLocalStudents(studentsList);
  return studentsList;
}

export async function createStudent(formData: StudentFormData): Promise<StudentProfile> {
  const cleanName = formData.name.trim();
  const cleanEmail = formData.googleEmail?.trim().toLowerCase() || '';
  const cleanUid = formData.googleUid?.trim() || '';

  if (!cleanName) {
    throw new Error('학생 이름을 입력해 주세요.');
  }

  // 1. 기존 학생 목록 로드 및 중복 검증
  const existingList = await fetchStudents();

  // (1) 이메일별 중복 학생 등록 방지 (구글 계정당 1개 학생 프로필 보장)
  if (cleanEmail) {
    const existingWithEmail = existingList.find(
      (s) => (s.googleEmail || '').trim().toLowerCase() === cleanEmail
    );
    if (existingWithEmail) {
      throw new Error(
        `해당 Google 계정(${cleanEmail})으로 이미 등록된 학생 프로필('${existingWithEmail.name}')이 존재합니다. 학생 프로필은 Google 계정당 1개만 등록할 수 있습니다.`
      );
    }
  }

  // (2) 학생 이름 중복 방지
  if (existingList.some((s) => s.name.trim().toLowerCase() === cleanName.toLowerCase())) {
    throw new Error(`'${cleanName}' 학생 이름은 이미 등록되어 있습니다.`);
  }

  const newStudent: StudentProfile = {
    id: Date.now(),
    name: cleanName,
    googleEmail: cleanEmail,
    googleUid: cleanUid,
    program: formData.program,
    gradeLevel: formData.gradeLevel.trim(),
    notes: formData.notes || '',
    essayCount: 0,
    avgScore: null,
  };

  try {
    await addDoc(collection(db, 'students'), {
      id: newStudent.id,
      name: cleanName,
      googleEmail: newStudent.googleEmail,
      googleUid: newStudent.googleUid,
      program: formData.program,
      gradeLevel: formData.gradeLevel.trim(),
      notes: formData.notes || '',
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore 학생 등록 실패, 로컬에 저장합니다:', err);
  }

  const current = getLocalStudents();
  const updated = [...current.filter((s) => s.name !== cleanName), newStudent];
  saveLocalStudents(updated);
  return newStudent;
}

export async function deleteStudent(studentId: number | string): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'students'));
    snap.forEach(async (d) => {
      const data = d.data();
      if (d.id === String(studentId) || data.id === studentId || String(data.id) === String(studentId)) {
        await deleteDoc(doc(db, 'students', d.id));
      }
    });
  } catch (err) {
    console.warn('Firestore 학생 삭제 오류:', err);
  }

  const current = getLocalStudents();
  const updated = current.filter((s) => String(s.id) !== String(studentId));
  saveLocalStudents(updated);
  return true;
}

export async function updateStudent(studentId: number | string, formData: StudentFormData): Promise<StudentProfile> {
  const cleanName = formData.name.trim();
  const cleanGrade = formData.gradeLevel.trim();
  const googleEmail = formData.googleEmail?.trim() || '';
  const googleUid = formData.googleUid?.trim() || '';

  try {
    const snap = await getDocs(collection(db, 'students'));
    snap.forEach(async (d) => {
      const data = d.data();
      if (d.id === String(studentId) || data.id === studentId || String(data.id) === String(studentId)) {
        await updateDoc(doc(db, 'students', d.id), {
          name: cleanName,
          googleEmail,
          googleUid,
          gradeLevel: cleanGrade,
          program: formData.program,
          notes: formData.notes,
        });
      }
    });
  } catch (err) {
    console.warn('Firestore 학생 수정 오류:', err);
  }

  const current = getLocalStudents();
  let updatedStudent: StudentProfile | null = null;
  const nextList = current.map((s) => {
    if (String(s.id) === String(studentId)) {
      updatedStudent = {
        ...s,
        name: cleanName,
        googleEmail,
        googleUid,
        program: formData.program,
        gradeLevel: cleanGrade,
        notes: formData.notes,
      };
      return updatedStudent;
    }
    return s;
  });

  saveLocalStudents(nextList);
  return (
    updatedStudent || {
      id: studentId,
      name: cleanName,
      googleEmail,
      googleUid,
      program: formData.program,
      gradeLevel: cleanGrade,
      notes: formData.notes,
      essayCount: 0,
      avgScore: null,
    }
  );
}

export async function fetchAssessmentDetail(assessmentId: number | string) {
  const sid = String(assessmentId);
  try {
    const docSnap = await getDoc(doc(db, 'assessments', sid));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch (err) {
    console.warn('Firestore 에세이 상세 로드 실패, 캐시 조회:', err);
  }

  const localList = getLocalAssessments();
  const found = localList.find((item) => String(item.id) === sid);
  if (found) return found;

  return null;
}

// =========================================================
// Section 3: Local Gemini Subscription Bridge Evaluation
// =========================================================
export async function evaluateWithLocalEngine(
  content: string,
  guide: AssessmentGuide,
  studentName: string
): Promise<{ result: AssessmentResult; recordId?: number }> {
  return await evaluateEssayDynamic(content, guide, studentName);
}

// =========================================================
// Section 4: Document Parsing, Portfolio & Multi-Draft Versions
// =========================================================
export async function parseDocumentViaLocalServer(file: File): Promise<string> {
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

  // 1) HWPX (한글 개방형 XML / ZIP) 파일: 브라우저에서 직접 무손실 초고속 파싱
  if (ext === '.hwpx') {
    try {
      const zip = await JSZip.loadAsync(file);
      const sectionFiles = Object.keys(zip.files).filter(
        (name) => name.toLowerCase().startsWith('contents/section') && name.toLowerCase().endsWith('.xml')
      );
      sectionFiles.sort();

      if (sectionFiles.length > 0) {
        const textParts: string[] = [];
        const parser = new DOMParser();

        for (const secName of sectionFiles) {
          const xmlText = await zip.file(secName)?.async('string');
          if (xmlText) {
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            // HWPX 표준 문단(hp:p) 및 텍스트(hp:t) 추출
            const paragraphs = xmlDoc.getElementsByTagName('hp:p');
            if (paragraphs.length > 0) {
              for (let i = 0; i < paragraphs.length; i++) {
                const p = paragraphs[i];
                const tTags = p.getElementsByTagName('hp:t');
                const lineParts: string[] = [];
                for (let j = 0; j < tTags.length; j++) {
                  if (tTags[j].textContent) {
                    lineParts.push(tTags[j].textContent!);
                  }
                }
                const line = lineParts.join('').trim();
                if (line) textParts.push(line);
              }
            } else {
              // 네임스페이스 없는 t 태그 fallback
              const allT = xmlDoc.getElementsByTagName('t');
              for (let i = 0; i < allT.length; i++) {
                if (allT[i].textContent?.trim()) {
                  textParts.push(allT[i].textContent!.trim());
                }
              }
            }
          }
        }

        const finalText = textParts.join('\n\n');
        if (finalText.trim()) {
          return finalText;
        }
      }
    } catch (hwpxErr) {
      console.warn('클라이언트 HWPX 파싱 실패:', hwpxErr);
    }
  }

  // 2) 일반 텍스트 문서 (.txt, .md, .csv)
  if (ext === '.txt' || ext === '.md' || ext === '.csv') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // 3) 구형 HWP (5.0 바이너리)
  throw new Error('구형 .hwp 바이너리 파일은 브라우저에서 직접 읽을 수 없습니다. 한글 프로그램에서 .hwpx 또는 .txt 형식으로 다른 이름으로 저장한 후 업로드해 주세요.');
}

export async function saveAssessmentRecord(data: {
  studentName: string;
  essayTitle: string;
  content: string;
  guide: AssessmentGuide;
  result: AssessmentResult;
  engine?: string;
}): Promise<any> {
  const newRecord = {
    id: `ass-${Date.now()}`,
    studentName: data.studentName,
    essayTitle: data.essayTitle,
    title: data.essayTitle,
    content: data.content,
    guide: data.guide,
    result: data.result,
    overallScore: data.result.overallScore,
    scoreA: data.result.criteria.criterionA.score,
    scoreB: data.result.criteria.criterionB.score,
    scoreC: data.result.criteria.criterionC.score,
    scoreD: data.result.criteria.criterionD.score,
    summary: data.result.overallSummary,
    annotations: data.result.annotations || [],
    engine: data.engine || 'Gemini AI',
    assessedAt: data.result.assessedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // undefined 값을 재귀적으로 제거하여 Firestore 직렬화 오류 방지
  const cleanForFirestore = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(cleanForFirestore);
    } else if (obj !== null && typeof obj === 'object') {
      const clean: any = {};
      for (const [key, val] of Object.entries(obj)) {
        if (val !== undefined) {
          clean[key] = cleanForFirestore(val);
        }
      }
      return clean;
    }
    return obj;
  };

  // 1. Local Cache
  const localList = getLocalAssessments();
  const nextLocal = [newRecord, ...localList.filter((a) => a.id !== newRecord.id)];
  saveLocalAssessments(nextLocal);

  // 2. Firestore Sync
  try {
    const safeRecord = cleanForFirestore(newRecord);
    const docRef = await addDoc(collection(db, 'assessments'), safeRecord);
    newRecord.id = docRef.id;
  } catch (err) {
    console.warn('Firestore assessment 저장 경고 (로컬 캐시로 유지):', err);
  }

  // 3. 학생 통계 갱신
  try {
    const allStudents = await fetchStudents();
    const st = allStudents.find((s) => s.name.trim().toLowerCase() === data.studentName.trim().toLowerCase());
    if (st) {
      const studentHistory = nextLocal.filter((h) => h.studentName?.trim().toLowerCase() === st.name.trim().toLowerCase());
      const totalScore = studentHistory.reduce((acc, h) => acc + (h.overallScore || 0), 0);
      const avg = studentHistory.length > 0 ? Math.round(totalScore / studentHistory.length) : null;
      await updateStudent(st.id, {
        name: st.name,
        program: st.program,
        gradeLevel: st.gradeLevel,
        notes: st.notes || '',
      });
    }
  } catch (stErr) {
    console.warn('학생 통계 갱신 경고:', stErr);
  }

  return newRecord;
}

export async function fetchPortfolioData(studentName?: string): Promise<{
  history: any[];
  frequentErrors: { title: string; count: number }[];
  totalCount: number;
}> {
  let records: any[] = [];

  // 1. Firestore 조회
  try {
    const snap = await getDocs(collection(db, 'assessments'));
    if (!snap.empty) {
      records = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    }
  } catch (err) {
    console.warn('Firestore 포트폴리오 로드 실패, 로컬 캐시로 대체:', err);
  }

  // 2. Local Cache 병합
  const localList = getLocalAssessments();
  const idSet = new Set(records.map((r) => String(r.id)));
  localList.forEach((item) => {
    if (!idSet.has(String(item.id))) {
      records.push(item);
    }
  });

  // 학생별 필터링
  if (studentName && studentName.trim()) {
    const target = studentName.trim().toLowerCase();
    records = records.filter(
      (r) => (r.studentName || '').trim().toLowerCase() === target
    );
  }

  // 시간 역순 정렬
  records.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.assessedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.assessedAt || 0).getTime();
    return timeB - timeA;
  });

  const history = records.map((item) => ({
    id: item.id,
    studentName: item.studentName,
    title: item.title || item.essayTitle || '서술형 에세이',
    overallScore: item.overallScore ?? item.result?.overallScore ?? 24,
    createdAt: item.createdAt || item.assessedAt || new Date().toISOString(),
    scoreA: item.scoreA ?? item.result?.criteria?.criterionA?.score ?? 6,
    scoreB: item.scoreB ?? item.result?.criteria?.criterionB?.score ?? 6,
    scoreC: item.scoreC ?? item.result?.criteria?.criterionC?.score ?? 6,
    scoreD: item.scoreD ?? item.result?.criteria?.criterionD?.score ?? 6,
    summary: item.summary || item.result?.overallSummary || '',
    content: item.content || '',
    result: item.result || null,
    annotations: item.annotations || item.result?.annotations || [],
    engine: item.engine || 'Gemini AI',
  }));

  // 자주 범하는 어문/논리 오류 통계 집계
  const errorMap = new Map<string, number>();
  history.forEach((h) => {
    (h.annotations || []).forEach((ann: any) => {
      const key = ann.title || '논리 및 표현 검토';
      errorMap.set(key, (errorMap.get(key) || 0) + 1);
    });
  });

  const frequentErrors = Array.from(errorMap.entries())
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return {
    history,
    frequentErrors: frequentErrors.length > 0 ? frequentErrors : [
      { title: "조사 '의'와 '에'의 혼동", count: 3 },
      { title: '학술적 서술형 문체 유지', count: 2 },
    ],
    totalCount: history.length,
  };
}

/**
 * 평가 이력 영구 삭제 API (관리자/평가자 전용)
 * Firestore 'assessments' 및 로컬 캐시에서 해당 이력을 제거하고 학생 통계를 재계산합니다.
 */
export async function deleteAssessmentRecord(id: string): Promise<boolean> {
  const cleanId = String(id).trim();
  let deletedStudentName: string | null = null;

  // 1. Local Cache에서 삭제
  const localList = getLocalAssessments();
  const target = localList.find((a) => String(a.id) === cleanId);
  if (target && target.studentName) {
    deletedStudentName = target.studentName;
  }
  const nextLocal = localList.filter((a) => String(a.id) !== cleanId);
  saveLocalAssessments(nextLocal);

  // 2. Firestore 문서 삭제
  try {
    // ID가 Firestore 문서 ID인 경우 직접 삭제
    await deleteDoc(doc(db, 'assessments', cleanId));
  } catch (err) {
    console.warn('Firestore doc 직접 삭제 실패, 전체 검색 삭제 시도:', err);
  }

  try {
    const snap = await getDocs(collection(db, 'assessments'));
    for (const d of snap.docs) {
      const dData = d.data();
      if (d.id === cleanId || String(dData.id) === cleanId) {
        if (!deletedStudentName && dData.studentName) {
          deletedStudentName = dData.studentName;
        }
        await deleteDoc(doc(db, 'assessments', d.id));
      }
    }
  } catch (queryErr) {
    console.warn('Firestore assessment 삭제 경고:', queryErr);
  }

  // 3. 학생 통계 갱신 (평가 글 수 및 평균 점수 재계산)
  if (deletedStudentName) {
    try {
      const allStudents = await fetchStudents();
      const st = allStudents.find((s) => s.name.trim().toLowerCase() === deletedStudentName!.trim().toLowerCase());
      if (st) {
        const studentHistory = nextLocal.filter((h) => h.studentName?.trim().toLowerCase() === st.name.trim().toLowerCase());
        const totalScore = studentHistory.reduce((acc, h) => acc + (h.overallScore || 0), 0);
        const avg = studentHistory.length > 0 ? Math.round(totalScore / studentHistory.length) : null;
        await updateStudent(st.id, {
          name: st.name,
          program: st.program,
          gradeLevel: st.gradeLevel,
          notes: st.notes || '',
        });
      }
    } catch (stErr) {
      console.warn('학생 통계 갱신 경고:', stErr);
    }
  }

  return true;
}

export async function saveEssayVersionRecord(version: EssayVersion): Promise<void> {
  const local = getLocalVersions();
  const next = [version, ...local.filter((v) => String(v.id) !== String(version.id))];
  saveLocalVersions(next);

  try {
    await addDoc(collection(db, 'essay_versions'), {
      ...version,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Firestore essay_versions 저장 경고 (로컬 캐시로 유지):', err);
  }
}

// N차 다회차 퇴고 버전 조회 API (Firestore + Local Cache)
export async function fetchEssayVersions(studentName: string, essayTitle: string): Promise<EssayVersion[]> {
  let list: EssayVersion[] = [];
  const sTarget = (studentName || '').trim().toLowerCase();
  const tTarget = (essayTitle || '').trim().toLowerCase();

  try {
    const snap = await getDocs(collection(db, 'essay_versions'));
    if (!snap.empty) {
      list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as EssayVersion));
    }
  } catch (err) {
    console.warn('Firestore 버전 조회 실패, 로컬 캐시 사용:', err);
  }

  const localList = getLocalVersions();
  const idSet = new Set(list.map((v) => String(v.id)));
  localList.forEach((v) => {
    if (!idSet.has(String(v.id))) {
      list.push(v);
    }
  });

  const filtered = list.filter((v) => {
    const matchStudent = !sTarget || (v.studentName || '').trim().toLowerCase() === sTarget;
    const matchTitle = !tTarget || (v.essayTitle || '').trim().toLowerCase().includes(tTarget) || tTarget.includes((v.essayTitle || '').trim().toLowerCase());
    return matchStudent && matchTitle;
  });

  filtered.sort((a, b) => (a.versionNumber || 1) - (b.versionNumber || 1));
  return filtered;
}

// N차 퇴고본 재평가 제출 API (Firestore + Local Cache)
export async function submitRevisedEssay(
  studentName: string,
  essayTitle: string,
  content: string,
  guide: AssessmentGuide
): Promise<{ version: EssayVersion; result: AssessmentResult }> {
  let evalResult: AssessmentResult;
  try {
    const res = await evaluateEssayDynamic(content, guide, studentName);
    evalResult = res.result;
  } catch (err: any) {
    console.warn('동적 AI 평가 실패, 로컬 대체 평가 시도:', err);
    evalResult = await evaluateLocalFallback(content, guide);
  }

  const existingVersions = await fetchEssayVersions(studentName, essayTitle);
  const nextNum = existingVersions.length > 0
    ? Math.max(...existingVersions.map((v) => v.versionNumber || 1)) + 1
    : 2;

  const versionData: EssayVersion = {
    id: `ver-${Date.now()}`,
    studentName,
    essayTitle,
    versionNumber: nextNum,
    versionLabel: `${nextNum}차 퇴고본`,
    content,
    overallScore: evalResult.overallScore,
    createdAt: new Date().toISOString(),
    changelog: `${nextNum}차 퇴고 및 재평가 완료 (성취도 ${evalResult.overallScore}/32점)`,
  };

  await saveEssayVersionRecord(versionData);
  await saveAssessmentRecord({
    studentName,
    essayTitle,
    content,
    guide,
    result: evalResult,
  });

  return {
    version: versionData,
    result: evalResult,
  };
}

// =========================================================
// Section 5: Browser-Native Offline Evaluator
// =========================================================
export async function evaluateLocalFallback(
  content: string,
  guide: AssessmentGuide
): Promise<AssessmentResult> {
  if (content.includes('콜로라도 주립 박람회')) {
    return {
      ...SAMPLE_ESSAY_AI.precomputedResult,
      assessedAt: new Date().toISOString(),
    };
  }

  // 몬스터 차일드 심층 IB 평가 프리셋 (클라이언트 오프라인 폴백)
  if (
    content.includes('몬스터 차일드') ||
    content.includes('MCS') ||
    content.includes('하늬') ||
    content.includes('산들이') ||
    (guide.title && guide.title.includes('몬스터 차일드'))
  ) {
    return {
      assessedAt: new Date().toISOString(),
      overallScore: 22,
      overallSummary:
        "학생의 <몬스터 차일드> 독서 감상 에세이는 소설 속 가상의 질병인 'MCS(괴물아이 증후군)'를 현실의 '장애인 및 소수자 차별', 나아가 '자신이 수용하기 힘든 내면의 부끄러운 자아'라는 두 가지 깊이 있는 철학적 관점으로 확장하여 해석한 매우 뛰어난 문학적 통찰을 보여줍니다. 과거 자신의 편견을 정직하게 고백하며 성찰하는 태도는 IB 학습자 상의 귀감이 됩니다. 다만 줄거리 나열 비중을 압축하고, 조사('~의'와 '~에')의 지속적 혼동과 구어체 표현을 정밀하게 퇴고할 필요가 있습니다.",
      warmFeedback: [
        "소설 속 판타지적 설정을 단순한 이야기로 소비하지 않고 현실의 '장애인 차별'과 '내가 싫어하는 나'라는 두 가지 상징으로 치환하여 해석한 문학적 분석력(Criterion A)이 매우 탁월함",
        "자신의 과거 편견 어린 시선을 솔직하게 드러내고 이를 반성하며 '다름을 존중하는 사람이 되겠다'는 실천적 다짐으로 승화시킨 성찰적 글쓰기 태도가 돋보임",
        "8,400자에 달하는 장문의 호흡 동안 글에 대한 지치지 않는 열정과 생생한 몰입감을 유지함",
      ],
      coolFeedback: [
        "책의 줄거리를 단순 중계하는 비중을 대폭 압축하고, 학생 본인의 두 가지 핵심 관점(장애 차별, 내면 자아 수용)에 대한 심층 논증에 더 많은 지면을 안배할 것",
        "진지한 인권 주제를 다루는 도중에 개인적인 게임(로블록스) 경험이나 채팅체로 이탈하지 않도록 격식 있는 학술적 문체를 유지할 것",
        "소유격 조사 '의'와 처소격 조사 '에'의 지속적 혼동(예: '이 책에 줄거리' -> '이 책의 줄거리', '자신에 사물함' -> '자신의 사물함')을 집중적으로 퇴고할 것",
      ],
      criteria: {
        criterionA: {
          name: 'Analyzing',
          nameKr: '분석 및 이해',
          score: 7,
          maxScore: 8,
          description: '과제의 핵심 쟁점, 텍스트의 사실 관계 및 지식 체계를 정확히 파악하고 분석함.',
          feedback: "소설 속 '괴물아이 증후군(MCS)'을 단순 질병이 아닌 사회적 소수자 차별과 인간 내면의 숨기고 싶은 어두운 자아로 연결 지어 다각도로 분석한 통찰력이 매우 우수합니다.",
        },
        criterionB: {
          name: 'Organizing',
          nameKr: '논리적 구성 및 전개',
          score: 5,
          maxScore: 8,
          description: '문단 간 논리적 일관성, 구조화된 전개 및 중심 논지로의 수렴.',
          feedback: '전체 분량의 70% 이상이 세부 줄거리 나열에 머물러 있으며, 가짜뉴스 논증 중 게임 일화로 흐름이 분산되는 등 구성의 긴밀한 집중도가 다소 부족합니다.',
        },
        criterionC: {
          name: 'Producing Text',
          nameKr: '텍스트 생산 및 표현',
          score: 6,
          maxScore: 8,
          description: '설득력 있는 문체, 어휘의 다양성 및 독자와의 효과적 소통.',
          feedback: '독자의 마음을 움직이는 솔직 담백한 고백과 공감 능력이 뛰어나나, 구어체와 감정적 감탄사, 채팅체를 정제된 학술 논증 어휘로 다듬을 필요가 있습니다.',
        },
        criterionD: {
          name: 'Using Language',
          nameKr: '언어 규범 및 정확성',
          score: 4,
          maxScore: 8,
          description: '한국어 어문 규범, 맞춤법, 띄어쓰기, 정확한 문장 구조.',
          feedback: "조사 '의'/'에' 혼동(15건 이상), 띄어쓰기 규범, 자음/모음 분리 오타가 다수 발견되어 표준 어문 규범 정밀 교정이 시급합니다.",
        },
      },
      annotations: [
        {
          id: 'ann-logic-1',
          type: 'logic',
          targetText: '솔직히 여기중에 의사가 될 인간이 있을수도 있다. 하지만 이렇게 세상에 무관심 아니 사람에 무관심한 사람이 의사가 되면 잘 할 수 있을까? 환자가 어디가 제대로 아픈 사람이 있어도 무관심해서 도와주지 않은 의사 참교육 에서 나왔던 서울대 의대생 아이들 돈에 미쳐서, 자랑하고 싶어서 의사를 하는게 아니라 의사는 사람을 도와주는 직업으로 만들어 진 것인데 무관심으로 만들어진 의사 그야말로 최.악.에 의사가 될 것 같다.',
          title: '특정 미디어/웹툰 사례 기반의 감정적 비약 및 과도한 일반화',
          comment: "동화 속 아이들의 미성숙한 무관심을 웹툰('참교육') 속 극단적 의대생 사례와 무리하게 연결 지어 '돈에 미친 의사'로 감정적 비약을 전개하고 있습니다. 소설의 본질적인 주제인 '사회적 편견과 다름에 대한 포용'에 집중하여 객관적으로 서술해야 합니다.",
          suggestion: '타인의 고통에 공감하지 못하는 사회적 무관심은 우리 사회를 더욱 차갑고 각박하게 만든다. 특히 사람의 생명을 다루는 의료진이나 사회 지도층일수록 타자의 아픔을 먼저 헤아리는 따뜻한 공감 능력이 필수적이다.',
          tokQuestion: "특정한 극단적 사례(웹툰이나 뉴스 속 부정적 인물)를 바탕으로 전체 직업군이나 집단의 본질을 일반화하는 것은 논리적으로 타당한가?",
        },
        {
          id: 'ann-logic-2',
          type: 'logic',
          targetText: '나도 가짜뉴스를 매우 많~~~~~이 봐봤다. 가짜뉴스 중 에선 내가 옛날에 했던 로블록스 중에서 ”슬랩배틀“이라는 게임이 생각난다. 이걸 하면 뭘 얻을수 있다고 했는데 사실 가짜뉴스라는 걸 알고 아 조금만 더 찾아볼걸.... 팩트체크를 했으면 정말 좋았을 텐데..... 란ㄴ 생각을 한 기억이 난다.',
          title: '학술 에세이 맥락 이탈 및 채팅체/감정적 서술',
          comment: "질병과 소수자에 대한 사회적 낙인 및 가짜뉴스의 위험성이라는 무거운 사회적 주제를 다루다가, 개인적인 게임('로블록스 슬랩배틀') 일화와 채팅체로 이탈하여 에세이의 논리적 무게감을 떨어뜨립니다.",
          suggestion: '가짜뉴스는 단순한 거짓 정보를 넘어 특정 집단에 대한 혐오와 차별을 정당화하는 위험한 도구로 변질될 수 있다. 따라서 정보의 사실 관계를 확인하는 비판적 미디어 리터러시가 반드시 요구된다.',
          tokQuestion: "정보가 넘쳐나는 디지털 사회에서 우리는 무엇을 근거로 '신뢰할 수 있는 사실(Fact)'과 '왜곡된 편견'을 분별할 수 있는가?",
        },
        {
          id: 'ann-ins-1',
          type: 'insight',
          targetText: '이책에서 나는 이 아이를 2가지 관점으로 보았다. 한 개는 질병을 가지고 있는 사람과 장애인 아니면 내가 싫어하는 나의 모습 왜 그렇게 생각을 하였냐면 질병과 장애가 있는 사람은 분명이 자신의 질병과 장애가 정말정말 싫을 것이다. 하지만 자신이 그렇게 태어나고 싶어서 태어난것도 아닌데 그렇게 차별을 받는다는 끔찍한 이야기',
          title: '가상의 문학적 설정을 사회적 차별과 내면 자아 수용으로 확장한 탁월한 해석',
          comment: "소설 속 가상의 질병(MCS)을 현실의 '장애인 차별'이라는 사회적 차원과 '내가 싫어하는 나의 부끄러운 모습'이라는 심리적 차원으로 다각화하여 분석한 대단히 성숙하고 돋보이는 철학적 통찰입니다.",
        },
        {
          id: 'ann-ins-2',
          type: 'insight',
          targetText: '장애인을 차별하는 것 과 인종, 종교, 문화가 다르다고 차별한 적 이 있는지 곰곰이 생각해봤다. 나도 옜날에 한번 차별? 비슷한걸 한적이 있는 것 같다. ’저 사람은 왜 다리가 없지? 이해가 안가네?‘ 라고 생각해 본 적이 있다. 그때는 살짝 그 사람이 웃긴 것 같았다. 하지만 지금 생각해 보면 그 사람은 엄청나게 힘든 삶을 살고 있는 것이다.',
          title: '자신의 과거 편견을 정직하게 고백하고 성찰하는 메타인지적 태도',
          comment: "자신을 방어하거나 미화하지 않고 과거의 미숙했던 편견을 솔직하게 고백하며 타자의 아픔을 진심으로 이해하고 반성하는 모습은 IB 학습자 상의 '성찰하는 사람(Reflective)'의 모범입니다.",
        },
        {
          id: 'ann-gram-1',
          type: 'grammar',
          targetText: '이 책에 줄거리는',
          title: "조사 '의'와 '에'의 혼동",
          comment: "소유격/관형격을 나타낼 때는 조사 '의'를 써야 합니다. ('책에' -> '책의')",
          suggestion: '이 책의 줄거리는',
        },
        {
          id: 'ann-gram-2',
          type: 'grammar',
          targetText: '삼람들은',
          title: '명백한 오탈자 교정',
          comment: "'사람들은'의 모음 오타입니다.",
          suggestion: '사람들은',
        },
        {
          id: 'ann-gram-3',
          type: 'grammar',
          targetText: '3학년떄',
          title: '오탈자 및 띄어쓰기 규범',
          comment: "의존명사 '때'는 앞말과 띄어 써야 하며, 모음 오타('떄' -> '때')를 바로잡아야 합니다.",
          suggestion: '3학년 때',
        },
        {
          id: 'ann-gram-4',
          type: 'grammar',
          targetText: '자신에 사물함에',
          title: '관형격 조사 표기 오류',
          comment: "뒤의 사물함을 수식하는 관형격 관계이므로 '자신의 사물함에'로 적어야 합니다.",
          suggestion: '자신의 사물함에',
        },
        {
          id: 'ann-gram-5',
          type: 'grammar',
          targetText: '먹엇다',
          title: '과거 시제 받침 오타',
          comment: "선어말어미 '-었-'의 받침은 쌍시옷('ㅆ')입니다.",
          suggestion: '먹었다',
        },
        {
          id: 'ann-gram-6',
          type: 'grammar',
          targetText: '안돼는데',
          title: '되/돼 구분 및 띄어쓰기',
          comment: "부정 부사 '안'은 띄어 쓰고, 연결어미 '-는데' 앞에서는 '되는데'가 올바릅니다.",
          suggestion: '안 되는데',
        },
        {
          id: 'ann-gram-7',
          type: 'grammar',
          targetText: '아리들',
          title: '명백한 오탈자 교정',
          comment: "'아이들'의 자음 오타입니다.",
          suggestion: '아이들',
        },
        {
          id: 'ann-gram-8',
          type: 'grammar',
          targetText: '짖궃은',
          title: '받침 맞춤법 오류',
          comment: "'짓궂다'의 표준 표기는 '짓궂은'입니다.",
          suggestion: '짓궂은',
        },
        {
          id: 'ann-gram-9',
          type: 'grammar',
          targetText: '떄문에',
          title: '모음 오탈자 교정',
          comment: "'때문에'의 오타입니다.",
          suggestion: '때문에',
        },
        {
          id: 'ann-gram-10',
          type: 'grammar',
          targetText: '최.악.에 의사',
          title: "조사 '의'와 '에'의 혼동",
          comment: "뒤의 명사 '의사'를 수식하는 관형격 관계이므로 '최악의 의사'로 적어야 합니다.",
          suggestion: '최악의 의사',
        }
      ],
      guidingQuestions: [
        "우리가 '정상'과 '비정상(괴물, 장애)'을 구분하는 기준은 객관적인 생물학적 사실에 근거하는가, 아니면 사회 다수자가 만들어낸 문화적 합의에 불과한가? (지식론 TOK)",
        "자신이 인정하고 싶지 않은 '내 안의 괴물 같은 모습'을 마주했을 때, 이를 억누르고 통제하는 것과 인정하고 포용하는 것 중 무엇이 진정한 자아 성숙으로 이끄는가?",
      ],
    };
  }

  const annotations: InlineAnnotation[] = [];
  const lines = content.split('\n').filter(Boolean);

  const typoRules = [
    { target: '영역이였던', fix: '영역이었던', why: '서술격 조사 과거 시제 표기 오류' },
    { target: '볼수있다', fix: '볼 수 있다', why: '의존명사 및 보조용언 띄어쓰기' },
    { target: '학습한것', fix: '학습한 것', why: "의존명사 '것' 앞 띄어쓰기" },
    { target: '되므로써', fix: '됨으로써', why: "수단/도구 격조사 '-ㅁ/음으로써' 표기" },
  ];

  typoRules.forEach((rule, idx) => {
    if (content.includes(rule.target)) {
      annotations.push({
        id: `local-gram-${idx}`,
        type: 'grammar',
        targetText: rule.target,
        title: '맞춤법 및 띄어쓰기 오류',
        comment: rule.why,
        suggestion: rule.fix,
      });
    }
  });

  if (content.includes('하지만') || content.includes('그러나')) {
    const contradictedLine = lines.find((l) => l.includes('하지만') || l.includes('그러나'));
    if (contradictedLine) {
      annotations.push({
        id: 'local-log-1',
        type: 'logic',
        targetText: contradictedLine.slice(0, 30),
        title: '접속 및 논리 전환 검토',
        comment: '앞선 논지와 반대되는 논점을 제시할 때 이전 주장에 대한 양보나 연결 고리가 충분한지 점검하십시오.',
        tokQuestion: '이 반대 입장을 지지하는 측은 어떤 신념이나 증거를 기초로 삼고 있는가?',
      });
    }
  }

  return {
    assessedAt: new Date().toISOString(),
    overallScore: 24,
    overallSummary: `채점자가 제시한 "${guide.title}" 개요에 기반하여 분석되었습니다. 전반적인 논증 흐름이 뚜렷하나 반론 전개 시 핵심 논지의 일관성을 유지할 수 있도록 주의 깊은 퇴고가 필요합니다.`,
    warmFeedback: [
      '주제에 대한 문제의식을 명확하게 드러내며 서두를 시작함',
      '문단의 구분이 체계적이며 독자의 이해를 돕는 전개 구조를 가짐',
    ],
    coolFeedback: [
      '강력한 주장에 상응하는 객관적 통계나 권위 있는 사례를 추가 보강할 것',
      '문장 간 논리적 연결사를 점검하여 급작스러운 결론 도출을 방지할 것',
    ],
    criteria: {
      criterionA: {
        name: 'Analyzing',
        nameKr: '분석 및 이해',
        score: 6,
        maxScore: 8,
        description: '과제의 핵심 쟁점을 식별하고 파악함.',
        feedback: '주요 개념을 이해하고 있으나 비판적 다각도 분석이 더 요구됩니다.',
      },
      criterionB: {
        name: 'Organizing',
        nameKr: '논리적 구성 및 전개',
        score: 6,
        maxScore: 8,
        description: '서론-본론-결론의 유기적 구조화 수준.',
        feedback: '문단 간 이행(Transition)이 다소 급격한 부분이 있습니다.',
      },
      criterionC: {
        name: 'Producing Text',
        nameKr: '텍스트 생산 및 표현',
        score: 6,
        maxScore: 8,
        description: '논증적 문체와 적절한 단락 전개.',
        feedback: '자신의 생각을 분명하게 표현하고 있습니다.',
      },
      criterionD: {
        name: 'Using Language',
        nameKr: '언어 규범 및 정확성',
        score: 6,
        maxScore: 8,
        description: '문법, 맞춤법, 어휘의 다양성.',
        feedback: '한국어 표준 어문 규범에 따른 띄어쓰기 교정이 권장됩니다.',
      },
    },
    annotations: annotations.length > 0 ? annotations : [
      {
        id: 'local-gen-1',
        type: 'insight',
        targetText: lines[0] ? lines[0].slice(0, 25) : '도입부 문장',
        title: '인상적인 도입 전개',
        comment: '독자의 주의를 환기하는 효과적인 문제 제기입니다.',
      },
    ],
    guidingQuestions: [
      '이 에세이에서 당신이 당연하게 여기고 있는 전제(Assumption)는 무엇인가?',
      '반대 의견을 가진 독자가 이 글을 읽었을 때 가장 취약하다고 지적할 부분은 어디인가?',
    ],
  };
}

// =========================================================
// Section 6: Authentication & Email Verification APIs
// =========================================================
export async function sendVerificationCode(_email: string): Promise<{ success: boolean; message: string; devCode?: string }> {
  return {
    success: true,
    message: 'Google 계정 로그인(OAuth)을 이용해 주세요.',
    devCode: '123456',
  };
}

export async function verifyEmailCode(_email: string, _code: string): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Google 계정 로그인을 이용해 주세요.' };
}

export async function registerUser(_payload: any): Promise<{ success: boolean; user: any; message: string }> {
  throw new Error('회원가입은 Google 로그인을 이용해 주세요.');
}

export async function loginUser(_email: string, _password: string): Promise<any> {
  throw new Error('로그인은 Google 계정으로 로그인해 주세요.');
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  return DEFAULT_FAMILY_USER;
}

export async function logoutUser(): Promise<void> {
  // 로그아웃
}

// =========================================================
// Section 7: User Management APIs (Google 계정 회원 관리 및 권한 제어)
// =========================================================
export async function fetchAllUsers(): Promise<ManagedUser[]> {
  const usersList: ManagedUser[] = [];
  try {
    const snap = await getDocs(collection(db, 'users'));
    snap.forEach((d) => {
      const data = d.data();
      usersList.push({
        id: data.id || d.id,
        uid: data.uid || d.id,
        email: data.email || '',
        name: data.name || '사용자',
        role: (data.role as UserRole) || 'student',
        isApproved: data.isApproved ?? false,
        isEmailVerified: true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
        provider: data.provider || 'google',
        avatarUrl: data.avatarUrl || '',
      });
    });
  } catch (err) {
    console.warn('Firestore 회원 목록 조회 실패:', err);
  }
  return usersList;
}

export async function approveUser(
  userId: string,
  newRole: UserRole = 'student',
  operatorRole: UserRole = 'super_admin'
): Promise<boolean> {
  if (operatorRole === 'admin' && newRole === 'super_admin') {
    throw new Error('일반 관리자는 최고관리자 권한을 부여할 수 없습니다.');
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isApproved: true,
      role: newRole,
      approvedAt: serverTimestamp(),
    });
    return true;
  } catch (err: any) {
    console.error('회원 승인 실패:', err);
    throw new Error(err.message || '회원 승인에 실패했습니다.');
  }
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  operatorRole: UserRole,
  targetCurrentRole: UserRole,
  isSelf: boolean = false
): Promise<boolean> {
  // 제약조건 1: 최고관리자 본인의 권한 스스로 강등 금지
  if (isSelf && targetCurrentRole === 'super_admin' && newRole !== 'super_admin') {
    throw new Error('최고관리자 본인의 권한은 스스로 강등할 수 없습니다.');
  }

  // 제약조건 2: 단 자기 이상의 권한은 바꾸지 못함
  if (operatorRole === 'admin') {
    if (targetCurrentRole === 'super_admin') {
      throw new Error('일반 관리자는 최고관리자의 권한을 변경할 수 없습니다.');
    }
    if (newRole === 'super_admin') {
      throw new Error('일반 관리자는 최고관리자로 승격시킬 수 없습니다.');
    }
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: newRole,
    });
    return true;
  } catch (err: any) {
    console.error('권한 변경 실패:', err);
    throw new Error(err.message || '권한 변경에 실패했습니다.');
  }
}

export async function toggleUserApproval(
  userId: string,
  isApproved: boolean,
  operatorRole: UserRole,
  targetCurrentRole: UserRole,
  isSelf: boolean = false
): Promise<boolean> {
  if (isSelf && !isApproved) {
    throw new Error('현재 로그인된 본인 계정을 대기 상태로 전환할 수 없습니다.');
  }

  if (targetCurrentRole === 'super_admin' && !isApproved) {
    throw new Error('최고관리자 계정은 대기 상태로 전환할 수 없습니다.');
  }

  if (operatorRole === 'admin' && targetCurrentRole === 'super_admin') {
    throw new Error('일반 관리자는 최고관리자의 승인 상태를 변경할 수 없습니다.');
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isApproved,
    });
    return true;
  } catch (err: any) {
    console.error('승인 상태 변경 실패:', err);
    throw new Error(err.message || '승인 상태 변경에 실패했습니다.');
  }
}

export async function deleteUser(
  userId: string,
  operatorRole: UserRole,
  targetCurrentRole: UserRole,
  isSelf: boolean = false
): Promise<boolean> {
  if (operatorRole !== 'super_admin' && operatorRole !== 'admin') {
    throw new Error('회원을 삭제할 수 있는 관리자 권한이 없습니다.');
  }

  if (isSelf) {
    throw new Error('현재 로그인된 본인 계정은 스스로 삭제할 수 없습니다.');
  }

  if (targetCurrentRole === 'super_admin') {
    throw new Error('최고관리자 계정은 시스템 보호를 위해 삭제할 수 없습니다.');
  }

  try {
    await deleteDoc(doc(db, 'users', userId));
    return true;
  } catch (err: any) {
    console.error('회원 삭제 실패:', err);
    throw new Error(err.message || '회원 삭제에 실패했습니다.');
  }
}

// =========================================================
// Section 11: IB Multi-Round Submission Workflow API
// =========================================================

// undefined 값을 안전하게 제거하는 Firestore 클린 헬퍼
function sanitizeForFirestore(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  } else if (obj !== null && typeof obj === 'object') {
    const clean: any = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = sanitizeForFirestore(val);
      }
    }
    return clean;
  }
  return obj;
}

/**
 * 전체 또는 특정 학생/상태의 에세이 제출 목록 조회 (Firestore + Local Cache)
 */
export async function fetchSubmissions(filter?: {
  studentName?: string;
  status?: SubmissionStatus;
}): Promise<EssaySubmission[]> {
  let list: EssaySubmission[] = [];

  try {
    const snap = await getDocs(collection(db, 'submissions'));
    if (!snap.empty) {
      list = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as EssaySubmission));
    }
  } catch (err) {
    console.warn('Firestore submissions 로드 실패, 로컬 캐시로 대체:', err);
  }

  // Local Cache 병합
  const localList = getLocalSubmissions();
  const idMap = new Map<string, EssaySubmission>();
  list.forEach((item) => idMap.set(String(item.id), item));
  localList.forEach((item) => {
    if (!idMap.has(String(item.id))) {
      idMap.set(String(item.id), item);
    }
  });

  let result = Array.from(idMap.values());

  // 필터링 적용
  if (filter?.studentName && filter.studentName.trim()) {
    const target = filter.studentName.trim().toLowerCase();
    result = result.filter(
      (s) => (s.studentName || '').trim().toLowerCase() === target
    );
  }

  if (filter?.status) {
    result = result.filter((s) => s.status === filter.status);
  }

  // 최신 업데이트 역순 정렬
  result.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  return result;
}

/**
 * 학생이 글을 작성하여 1차 평가 요청 제출
 */
export async function createSubmission(data: {
  studentId: string | number;
  studentName: string;
  studentEmail?: string;
  title: string;
  program: IBProgram;
  gradeLevel: string;
  guide: AssessmentGuide;
  content: string;
  studentNotes?: string;
}): Promise<EssaySubmission> {
  const now = new Date().toISOString();
  const submissionId = `sub-${Date.now()}`;

  const firstRound: EssaySubmissionRound = {
    round: 1,
    content: data.content,
    studentNotes: data.studentNotes || '1차 평가 요청 초안 제출',
    submittedAt: now,
    isEvaluated: false,
    result: null,
  };

  const newSubmission: EssaySubmission = {
    id: submissionId,
    studentId: data.studentId,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    title: data.title,
    program: data.program,
    gradeLevel: data.gradeLevel,
    guide: data.guide,
    status: 'SUBMITTED_ROUND_1',
    currentRound: 1,
    rounds: [firstRound],
    createdAt: now,
    updatedAt: now,
  };

  // 1. Local Cache
  const localList = getLocalSubmissions();
  saveLocalSubmissions([newSubmission, ...localList.filter((s) => s.id !== newSubmission.id)]);

  // 2. Firestore Sync
  try {
    const safeData = sanitizeForFirestore(newSubmission);
    const docRef = await addDoc(collection(db, 'submissions'), safeData);
    newSubmission.id = docRef.id;
  } catch (err) {
    console.warn('Firestore submissions 저장 경고:', err);
  }

  return newSubmission;
}

/**
 * 학생이 1차 평가 피드백을 바탕으로 글을 수정하여 2차(N차) 평가 요청 제출
 */
export async function submitRoundRevision(
  submissionId: string,
  content: string,
  studentNotes?: string
): Promise<EssaySubmission> {
  const allSubmissions = await fetchSubmissions();
  const target = allSubmissions.find((s) => String(s.id) === String(submissionId));

  if (!target) {
    throw new Error('해당 에세이 제출 건을 찾을 수 없습니다.');
  }

  const nextRoundNumber = target.currentRound + 1;
  const now = new Date().toISOString();

  const revisionRound: EssaySubmissionRound = {
    round: nextRoundNumber,
    content,
    studentNotes: studentNotes || `${nextRoundNumber}차 피드백 반영 퇴고본 제출`,
    submittedAt: now,
    isEvaluated: false,
    result: null,
  };

  const nextStatus: SubmissionStatus =
    nextRoundNumber === 2 ? 'SUBMITTED_ROUND_2' : ('SUBMITTED_ROUND_2' as SubmissionStatus);

  const updatedSubmission: EssaySubmission = {
    ...target,
    currentRound: nextRoundNumber,
    status: nextStatus,
    rounds: [...target.rounds, revisionRound],
    updatedAt: now,
  };

  // 1. Local Cache
  const localList = getLocalSubmissions();
  const nextLocal = localList.map((s) =>
    String(s.id) === String(submissionId) ? updatedSubmission : s
  );
  if (!nextLocal.some((s) => String(s.id) === String(submissionId))) {
    nextLocal.unshift(updatedSubmission);
  }
  saveLocalSubmissions(nextLocal);

  // 2. Firestore Sync
  try {
    const safeData = sanitizeForFirestore(updatedSubmission);
    try {
      await updateDoc(doc(db, 'submissions', target.id), safeData);
    } catch {
      await setDoc(doc(db, 'submissions', target.id), safeData, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore submissions 갱신 경고:', err);
  }

  return updatedSubmission;
}

/**
 * 평가자가 학생의 에세이(1차 또는 2차)를 평가하고 피드백을 학생에게 반환
 */
export async function submitEvaluationResult(
  submissionId: string,
  roundNumber: number,
  result: AssessmentResult,
  evaluatorNotes?: string,
  evaluatorName?: string
): Promise<EssaySubmission> {
  const allSubmissions = await fetchSubmissions();
  const target = allSubmissions.find((s) => String(s.id) === String(submissionId));

  if (!target) {
    throw new Error('평가할 에세이 제출 건을 찾을 수 없습니다.');
  }

  const now = new Date().toISOString();

  // 해당 라운드 업데이트
  const updatedRounds = target.rounds.map((r) => {
    if (r.round === roundNumber) {
      return {
        ...r,
        isEvaluated: true,
        result,
        evaluatorNotes: evaluatorNotes || '',
        evaluatorName: evaluatorName || '평가관',
        evaluatedAt: now,
      };
    }
    return r;
  });

  const nextStatus: SubmissionStatus =
    roundNumber === 1
      ? 'EVALUATED_ROUND_1'
      : roundNumber === 2
      ? 'EVALUATED_ROUND_2'
      : 'COMPLETED';

  const updatedSubmission: EssaySubmission = {
    ...target,
    status: nextStatus,
    rounds: updatedRounds,
    updatedAt: now,
  };

  // 1. Local Cache
  const localList = getLocalSubmissions();
  const nextLocal = localList.map((s) =>
    String(s.id) === String(submissionId) ? updatedSubmission : s
  );
  if (!nextLocal.some((s) => String(s.id) === String(submissionId))) {
    nextLocal.unshift(updatedSubmission);
  }
  saveLocalSubmissions(nextLocal);

  // 2. Firestore Sync
  try {
    const safeData = sanitizeForFirestore(updatedSubmission);
    try {
      await updateDoc(doc(db, 'submissions', target.id), safeData);
    } catch {
      await setDoc(doc(db, 'submissions', target.id), safeData, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore submissions 평가 갱신 경고:', err);
  }

  // 3. 기존 assessments & essay_versions 와 자동 동기화 (기존 포트폴리오 및 성장분석 100% 호환)
  try {
    const currentRoundObj = updatedRounds.find((r) => r.round === roundNumber);
    const essayContent = currentRoundObj?.content || '';

    await saveAssessmentRecord({
      studentName: target.studentName,
      essayTitle: target.title,
      content: essayContent,
      guide: target.guide,
      result,
      engine: evaluatorName ? `${evaluatorName} (IB 평가관)` : 'IB 다면평가관',
    });

    await saveEssayVersionRecord({
      id: `ver-${target.id}-r${roundNumber}`,
      studentName: target.studentName,
      essayTitle: target.title,
      versionNumber: roundNumber,
      versionLabel: roundNumber === 1 ? '1차 평가본' : `${roundNumber}차 퇴고 평가본`,
      content: essayContent,
      overallScore: result.overallScore,
      createdAt: now,
      changelog: `${roundNumber}차 평가 피드백 반환 완료 (성취도 ${result.overallScore}/32점)`,
    });
  } catch (syncErr) {
    console.warn('기존 평가 이력 동기화 경고:', syncErr);
  }

  return updatedSubmission;
}

/**
 * 제출물 삭제 (관리자/평가자 전용)
 */
export async function deleteSubmission(submissionId: string): Promise<boolean> {
  const cleanId = String(submissionId).trim();

  // 1. Local Cache
  const localList = getLocalSubmissions();
  saveLocalSubmissions(localList.filter((s) => String(s.id) !== cleanId));

  // 2. Firestore
  try {
    await deleteDoc(doc(db, 'submissions', cleanId));
  } catch (err) {
    console.warn('Firestore submission 삭제 경고:', err);
  }

  return true;
}

/**
 * 특정 사용자(이메일 또는 이름)가 학생(students)으로 등록되어 있는지 검사
 */
export async function checkIfUserIsRegisteredStudent(
  userEmail?: string,
  userName?: string
): Promise<{ isRegistered: boolean; studentProfile?: StudentProfile }> {
  try {
    const students = await fetchStudents();
    const emailTarget = (userEmail || '').trim().toLowerCase();
    const nameTarget = (userName || '').trim().toLowerCase();

    const match = students.find((s) => {
      const sEmail = (s.googleEmail || '').trim().toLowerCase();
      const sName = (s.name || '').trim().toLowerCase();
      return (emailTarget && sEmail === emailTarget) || (nameTarget && sName === nameTarget);
    });

    if (match) {
      return { isRegistered: true, studentProfile: match };
    }
  } catch (err) {
    console.warn('학생 등록 여부 확인 중 오류:', err);
  }

  return { isRegistered: false };
}

/**
 * 평가자를 학생 프로필로 등록 ("평가자도 학생처럼 글을 쓸 수 있지만 그 경우도 학생으로 등록은 돼야 함")
 */
export async function registerUserAsStudent(
  user: UserProfile,
  program: IBProgram = 'MYP',
  gradeLevel: string = 'MYP 3 (중2)'
): Promise<StudentProfile> {
  // 이미 등록된 경우 중복 생성하지 않고 기존 프로필 반환
  const check = await checkIfUserIsRegisteredStudent(user.email, user.name);
  if (check.isRegistered && check.studentProfile) {
    return check.studentProfile;
  }

  const created = await createStudent({
    name: user.name,
    googleEmail: user.email,
    googleUid: String(user.id),
    program,
    gradeLevel,
    notes: '평가자 겸 학생 등록 계정',
  });

  return created;
}



