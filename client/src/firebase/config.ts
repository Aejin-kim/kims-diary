// =========================================================
// Firebase Initialization & SDK Exports for 쭌이형제네
// =========================================================
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD9WB0dZotVEAND32Cf5RJXxcyHDEzJ9EU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "kims-diary.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "kims-diary",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "kims-diary.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "142718220138",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:142718220138:web:3ccd91f230568987705713",
  measurementId: "G-VPV2NVT4BW",
};

// Firebase 앱 싱글톤 초기화
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// 로컬 접속 여부 판별 (localhost 또는 127.0.0.1)
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// 로컬 환경에서 테스트 중일 때는 자동으로 로컬 Firebase 에뮬레이터에 연결
// 클라우드 운영 환경(kims-diary.web.app)에서는 자동으로 실제 Firebase에 연결
const useEmulator = isLocalhost;

if (useEmulator && typeof window !== 'undefined') {
  const host = window.location.hostname;
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    console.log(`[Firebase] 로컬 Auth 에뮬레이터에 연결되었습니다 (http://${host}:9099)`);
  } catch (e) {
    // already connected
  }
  try {
    connectFirestoreEmulator(db, host, 8080);
    console.log(`[Firebase] 로컬 Firestore 에뮬레이터에 연결되었습니다 (http://${host}:8080)`);
  } catch (e) {
    // already connected
  }
  try {
    connectFunctionsEmulator(functions, host, 5001);
  } catch (e) {
    // already connected
  }
}
