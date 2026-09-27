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
 * Google Gemini API 실시간 상태 및 연결 테스트
 */
export async function checkAiServiceStatus(): Promise<AIHomeServerStatus> {
  const apiKey = getDirectGeminiApiKey();
  const model = getDirectGeminiModel();

  if (!apiKey) {
    return {
      aiOnline: false,
      engine: `Google Gemini (${model} 직접 연동)`,
      message: 'Gemini API 키가 등록되지 않았습니다 (상단 [AI 설정]에서 등록).',
      lastChecked: new Date().toLocaleTimeString(),
    };
  }

  try {
    const testRes = await testDirectGeminiConnection(apiKey, model);
    return {
      aiOnline: testRes.success,
      latencyMs: testRes.latencyMs,
      engine: `Google Gemini (${model} 직접 연동)`,
      message: testRes.message,
      lastChecked: new Date().toLocaleTimeString(),
    };
  } catch (err: any) {
    return {
      aiOnline: false,
      engine: `Google Gemini (${model} 직접 연동)`,
      message: `Gemini API 연결 실패: ${err.message || '네트워크 오류'}`,
      lastChecked: new Date().toLocaleTimeString(),
    };
  }
}

/**
 * 실시간 동기 AI 에세이 다면평가 요청 (Google Gemini 직접 호출)
 */
export async function evaluateEssayDynamic(
  content: string,
  guide: AssessmentGuide,
  studentName: string
): Promise<{ result: AssessmentResult; engine: string }> {
  console.log('[AI Provider] 브라우저에서 Google Gemini API로 직접 호출합니다.');
  return await evaluateWithDirectGemini(content, guide, studentName);
}
