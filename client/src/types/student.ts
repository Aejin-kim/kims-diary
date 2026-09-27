// =========================================================
// Section 1: IB Program & Student Profile Types
// =========================================================
import { IBProgram } from './assessment';

export interface StudentProfile {
  id: number | string;
  name: string;
  googleEmail?: string;
  googleUid?: string;
  program: IBProgram;
  gradeLevel: string;
  notes?: string;
  essayCount?: number;
  avgScore?: number | null;
  createdAt?: string;
}

// =========================================================
// Section 2: Student Creation Form State
// =========================================================
export interface StudentFormData {
  name: string;
  googleEmail?: string;
  googleUid?: string;
  program: IBProgram;
  gradeLevel: string;
  notes: string;
}

// =========================================================
// Section 3: Past Assessment Brief Summary
// =========================================================
export interface PastAssessmentItem {
  id: number | string;
  studentName: string;
  title: string;
  program: IBProgram;
  gradeLevel: string;
  overallScore: number;
  scoreA: number;
  scoreB: number;
  scoreC: number;
  scoreD: number;
  content: string;
  createdAt: string;
  summary: string;
}
