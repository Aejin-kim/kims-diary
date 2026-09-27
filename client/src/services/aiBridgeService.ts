// =========================================================
// Real-Time AI Service (Direct Google Gemini API)
// (aiBridgeService.ts)
// =========================================================
// 학생 정보, IB 4대 루브릭 평가 기준, 원문 글, 참조자료를
// 단일 마스터 프롬프트로 구성하여 Google Gemini API에
// 직접 동기 호출하고 정밀 다면 평가 JSON을 반환하는 서비스입니다.
// =========================================================

import { AssessmentGuide, AssessmentResult } from '../types/assessment';
import {
  getDirectGeminiApiKey,
  getDirectGeminiModel,
  evaluateWithDirectGemini,
  testDirectGeminiConnection,
} from './geminiDirectService';

export interface AIHomeServerStatus {
  aiOnline: boolean;
  latencyMs?: number;
  engine?: string;
  message?: string;
  lastChecked: string;
}

/**
 * Google Gemini AI 실시간 상태 및 연결 테스트 (Firebase Functions 백엔드 경유)
 */
export async function checkAiServiceStatus(): Promise<AIHomeServerStatus> {
  const apiKey = getDirectGeminiApiKey();
  const model = getDirectGeminiModel();

  try {
    const testRes = await testDirectGeminiConnection(apiKey, model);
    return {
      aiOnline: testRes.success,
      latencyMs: testRes.latencyMs,
      engine: apiKey ? `Google Gemini (${model}, 커스텀 키)` : `Firebase Functions Cloud (${model})`,
      message: testRes.message,
      lastChecked: new Date().toLocaleTimeString(),
    };
  } catch (err: any) {
    return {
      aiOnline: false,
      engine: `Firebase Functions Cloud (${model})`,
      message: `AI 평가 서버 연결 실패: ${err.message || '네트워크 오류'}`,
      lastChecked: new Date().toLocaleTimeString(),
    };
  }
}

/**
 * 실시간 동기 AI 에세이 다면평가 요청 (Firebase Functions 백엔드 호출)
 */
export async function evaluateEssayDynamic(
  content: string,
  guide: AssessmentGuide,
  studentName: string
): Promise<{ result: AssessmentResult; engine: string }> {
  console.log('[AI Provider] Firebase Cloud Functions 백엔드를 통해 안전하게 다면평가를 요청합니다.');
  return await evaluateWithDirectGemini(content, guide, studentName);
}

