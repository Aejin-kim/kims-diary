// =========================================================
// 쭌이형제네 구글 인증 서비스 (Google Auth Provider)
// =========================================================
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  collection,
  query,
  where,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserProfile, UserRole } from '../types/assessment';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const STORAGE_KEY_USER = 'ib_auth_user';
const STORAGE_KEY_TOKEN = 'ib_auth_token';

export const DEFAULT_FAMILY_USER: UserProfile = {
  id: 'family-admin',
  name: '쭌이형제네 가족',
  email: 'family@kims-diary.local',
  role: 'super_admin',
  isApproved: true,
  provider: 'local',
};

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

// 1. Google 계정 로그인 및 최초 가입 승인 로직
export async function loginWithGoogle(): Promise<{
  success: boolean;
  user: UserProfile;
  message: string;
}> {
  // 127.0.0.1 도메인은 Firebase OAuth 기본 허용 목록에 없으므로 localhost로 자동 전환
  if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
    const targetUrl = window.location.href.replace('127.0.0.1', 'localhost');
    window.location.replace(targetUrl);
    throw new Error('Google OAuth는 localhost 도메인에서 승인됩니다. localhost로 자동 전환 중입니다...');
  }

  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;

    const email = fbUser.email || `${fbUser.uid}@google.com`;
    const name = fbUser.displayName || '구글 사용자';
    const photoURL = fbUser.photoURL || '';
    const uid = fbUser.uid;
    const token = await fbUser.getIdToken();

    let userProfile: UserProfile;

    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDocFromServer(userRef).catch(() => getDoc(userRef));

      if (userSnap.exists()) {
        // 이미 가입된 회원: DB에 저장된 권한과 승인 상태를 엄격하게 로드
        const data = userSnap.data();
        userProfile = {
          id: data.id || uid,
          email: data.email || email,
          name: data.name || name,
          role: (data.role as UserRole) || 'student',
          isApproved: data.isApproved === true, // 불리언 true일 때만 승인 완료
          token,
          avatarUrl: photoURL || data.avatarUrl,
          provider: 'google',
        };
      } else {
        // 신규 가입자: 서버에서 기존 최고관리자 존재 여부 및 전체 회원 수 이중 확인
        const [superAdminSnap, allUsersSnap] = await Promise.all([
          getDocsFromServer(query(collection(db, 'users'), where('role', '==', 'super_admin')))
            .catch(() => getDocs(query(collection(db, 'users'), where('role', '==', 'super_admin')))),
          getDocsFromServer(collection(db, 'users'))
            .catch(() => getDocs(collection(db, 'users'))),
        ]);

        const hasSuperAdmin = !superAdminSnap.empty && superAdminSnap.docs.length > 0;
        const totalUsers = allUsersSnap.docs.length;

        // DB에 계정이 0명이고 최고관리자도 단 한 명도 없을 때만 최초 1인이 super_admin + 자동 승인
        const isFirstEverUser = totalUsers === 0 && !hasSuperAdmin;

        if (isFirstEverUser) {
          userProfile = {
            id: uid,
            email,
            name,
            role: 'super_admin',
            isApproved: true,
            token,
            avatarUrl: photoURL,
            provider: 'google',
          };
        } else {
          // 기존 계정이 있거나 최고관리자가 이미 존재하는 모든 경우: 무조건 승인대기 + 학생 권한
          userProfile = {
            id: uid,
            email,
            name,
            role: 'student',
            isApproved: false, // 보안 철칙: 무조건 관리자 승인 대기
            token,
            avatarUrl: photoURL,
            provider: 'google',
          };
        }

        // Firestore 서버에 사용자 레코드 저장
        await setDoc(userRef, {
          id: uid,
          uid,
          email,
          name,
          role: userProfile.role,
          isApproved: userProfile.isApproved,
          avatarUrl: photoURL,
          provider: 'google',
          createdAt: serverTimestamp(),
        });
      }
    } catch (firestoreErr) {
      console.warn('Firestore 연동 실패, 보안 기본값(학생/승인대기)을 적용합니다:', firestoreErr);
      userProfile = {
        id: uid,
        email,
        name,
        role: 'student',
        isApproved: false, // 오류 발생 시에도 절대 자동 승인되지 않음
        token,
        avatarUrl: photoURL,
        provider: 'google',
      };
    }

    setAuthToken(token);
    setStoredUser(userProfile);

    const message = userProfile.isApproved
      ? `'${userProfile.name}'님, 로그인되었습니다!`
      : `'${userProfile.name}'님의 가입이 접수되었습니다. 관리자 승인 후 이용하실 수 있습니다.`;

    return {
      success: true,
      user: userProfile,
      message,
    };
  } catch (err: any) {
    console.error('Google 로그인 오류:', err);

    if (err.code === 'auth/unauthorized-domain') {
      if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
        const targetUrl = window.location.href.replace('127.0.0.1', 'localhost');
        window.location.replace(targetUrl);
        throw new Error('Google OAuth는 localhost 도메인에서 지원됩니다. localhost로 자동 전환합니다.');
      }
      throw new Error(
        `현재 접속 도메인('${window.location.hostname}')이 Firebase 인증 허용 도메인 목록에 없습니다.\n'localhost'로 접속하시거나, Firebase 콘솔(Authentication -> Settings -> Authorized domains)에 '${window.location.hostname}'을 추가해 주세요.`
      );
    }

    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('popup-closed-by-user');
    }

    throw new Error(err.message || 'Google 로그인 중 오류가 발생했습니다.');
  }
}

// 2. Google 로그아웃
export async function signOutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.warn('Firebase 로그아웃 실패:', e);
  } finally {
    setAuthToken(null);
    setStoredUser(null);
  }
}

// 3. Auth 상태 변경 구독 (브라우저 새로고침 시 실시간 Firestore 세션 복원)
export function subscribeAuthState(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      try {
        const token = await fbUser.getIdToken();
        const userRef = doc(db, 'users', fbUser.uid);
        // 캐시 대신 서버의 실시간 승인 및 권한 상태를 강제 조회
        const userSnap = await getDocFromServer(userRef).catch(() => getDoc(userRef));

        let profile: UserProfile;
        if (userSnap.exists()) {
          const data = userSnap.data();
          profile = {
            id: data.id || fbUser.uid,
            email: data.email || fbUser.email || '',
            name: data.name || fbUser.displayName || '구글 사용자',
            role: (data.role as UserRole) || 'student',
            isApproved: data.isApproved === true, // 엄격한 불리언 검증
            token,
            avatarUrl: fbUser.photoURL || data.avatarUrl || undefined,
            provider: 'google',
          };
        } else {
          // Firestore에 레코드가 아직 없는 경우: 무조건 미승인 대기 상태
          profile = {
            id: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || '구글 사용자',
            role: 'student',
            isApproved: false,
            token,
            avatarUrl: fbUser.photoURL || undefined,
            provider: 'google',
          };
        }

        setAuthToken(token);
        setStoredUser(profile);
        callback(profile);
        return;
      } catch (err) {
        console.warn('Google 세션 복원 중 Firestore 오류:', err);
      }
    }

    // 비로그인 상태
    setAuthToken(null);
    setStoredUser(null);
    callback(null);
  });
}

// 4. 승인 상태 즉시 새로고침 (클라이언트 요청용 - 서버 강제 조회)
export async function fetchFreshUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDocFromServer(userRef).catch(() => getDoc(userRef));
    if (snap.exists()) {
      const data = snap.data();
      const profile: UserProfile = {
        id: data.id || uid,
        email: data.email || '',
        name: data.name || '',
        role: (data.role as UserRole) || 'student',
        isApproved: data.isApproved === true,
        avatarUrl: data.avatarUrl || '',
        provider: 'google',
      };
      setStoredUser(profile);
      return profile;
    }
  } catch (err) {
    console.warn('프로필 갱신 실패:', err);
  }
  return null;
}

export function getCurrentUser(): UserProfile | null {
  return getStoredUser();
}
