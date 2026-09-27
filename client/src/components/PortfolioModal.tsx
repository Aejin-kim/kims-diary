// =========================================================
// Section 1: Module Imports and Props Interface
// =========================================================
import React, { useEffect, useState } from 'react';
import {
  X,
  TrendingUp,
  AlertTriangle,
  BookCheck,
  Award,
  Calendar,
  ChevronRight,
  RotateCcw,
  Trash2,
  Users,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import {
  fetchPortfolioData,
  fetchAssessmentDetail,
  deleteAssessmentRecord,
  fetchStudents,
} from '../services/assessmentService';
import { AssessmentResult } from '../types/assessment';
import { StudentProfile } from '../types/student';

interface PortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  onSelectAssessment?: (content: string, result: AssessmentResult, title: string) => void;
  canManageHistory?: boolean;
}

// =========================================================
// Section 2: Portfolio Dashboard Component
// =========================================================
export const PortfolioModal: React.FC<PortfolioModalProps> = ({
  isOpen,
  onClose,
  studentName,
  onSelectAssessment,
  canManageHistory = true,
}) => {
  const [selectedStudent, setSelectedStudent] = useState<string>(studentName || '');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [data, setData] = useState<{
    history: any[];
    frequentErrors: { title: string; count: number }[];
    totalCount: number;
  }>({ history: [], frequentErrors: [], totalCount: 0 });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async (targetStudent: string) => {
    setLoading(true);
    try {
      const res = await fetchPortfolioData(targetStudent);
      setData(res);
    } catch (err) {
      console.error('포트폴리오 데이터 로드 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudents().then((list) => {
        setStudents(list || []);
      });
      setSelectedStudent(studentName || '');
      loadData(studentName || '');
    }
  }, [isOpen, studentName]);

  const handleStudentFilterChange = (newStudent: string) => {
    setSelectedStudent(newStudent);
    loadData(newStudent);
  };

  const handleDeleteHistory = async (h: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const title = h.title || '에세이';
    const sName = h.studentName || '학생';
    const dateStr = (h.createdAt || '').slice(0, 10);

    if (
      !window.confirm(
        `'${title}' (${sName}, ${dateStr}) 평가 이력을 영구 삭제하시겠습니까?\n\n` +
          `삭제 시 Firestore 및 로컬 캐시에서 완전히 제거되며, 학생 통계가 재계산됩니다.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(String(h.id));
      await deleteAssessmentRecord(String(h.id));
      await loadData(selectedStudent);
    } catch (err: any) {
      alert(`평가 이력 삭제 실패: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {selectedStudent ? `${selectedStudent} 학생` : '전체 학생'} 누적 성장 &amp; 평가 이력
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                  총 {data.history.length}편 보관
                </span>
              </div>
              <p className="text-xs text-slate-500">
                누적된 글쓰기 성취도 밴드 추이와 회차별 상세 첨삭 이력 (관리자 열람 및 삭제 가능)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Student Filter Selector */}
            {students.length > 0 && (
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedStudent}
                  onChange={(e) => handleStudentFilterChange(e.target.value)}
                  className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
                >
                  <option value="">전체 학생 이력 보기</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name} ({st.gradeLevel || st.program})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => loadData(selectedStudent)}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-200/60 transition"
              title="이력 새로고침"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
              <span className="text-[11px] font-semibold text-indigo-700">총 제출 에세이</span>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {data.history.length} 편
              </div>
            </div>
            <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700">최근 평균 성취도</span>
              <div className="text-2xl font-black text-emerald-950 mt-1">
                {data.history.length > 0
                  ? Math.round(
                      data.history.reduce((acc, h) => acc + (h.overallScore || 0), 0) /
                        data.history.length
                    )
                  : 0}{' '}
                <span className="text-xs font-normal text-emerald-700">/ 32점</span>
              </div>
            </div>
            <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-700">자주 감지된 피드백</span>
              <div className="text-sm font-bold text-amber-950 mt-1.5 truncate">
                {data.frequentErrors[0]?.title || '어문 규범 및 논리성 검토'}
              </div>
            </div>
          </div>

          {/* Frequent Errors Section */}
          {data.frequentErrors.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>자주 감지된 취약점 분석 (집중 퇴고 포인트)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {data.frequentErrors.map((err, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{err.title}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                      누적 {err.count}회 감지
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <BookCheck className="w-4 h-4 text-indigo-600" />
                <span>회차별 평가 이력 목록 ({data.history.length}건)</span>
              </h3>
              {canManageHistory && (
                <span className="text-[11px] text-slate-400">
                  * 관리자는 불필요한 이력을 우측 삭제 버튼으로 영구 정리할 수 있습니다.
                </span>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">평가 기록을 불러오는 중...</div>
            ) : data.history.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                아직 저장된 평가 이력이 없습니다.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {data.history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 hover:border-indigo-300 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded text-[10px]">
                            {h.studentName || '학생'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs">{h.title}</h4>
                          {h.engine && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px]">
                              <Cpu className="w-2.5 h-2.5" />
                              <span>{h.engine}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          <span>{(h.createdAt || h.assessedAt || '').slice(0, 16).replace('T', ' ')}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-indigo-600">{h.overallScore}</span>
                        <span className="text-xs text-slate-400"> / 32점</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] flex-wrap">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        A(분석): <b>{h.scoreA}/8</b>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        B(논리): <b>{h.scoreB}/8</b>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        C(표현): <b>{h.scoreC}/8</b>
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        D(규범): <b>{h.scoreD}/8</b>
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                        첨삭: {(h.annotations || []).length}건
                      </span>
                    </div>

                    {h.summary && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md leading-relaxed">
                        💡 {h.summary}
                      </p>
                    )}

                    <div className="pt-1 flex items-center justify-between">
                      {canManageHistory ? (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistory(h, e)}
                          disabled={deletingId === String(h.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="이 평가 기록 영구 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{deletingId === String(h.id) ? '삭제 중...' : '이력 삭제'}</span>
                        </button>
                      ) : (
                        <div></div>
                      )}

                      {onSelectAssessment && (
                        <button
                          onClick={async () => {
                            try {
                              const detail = await fetchAssessmentDetail(h.id);
                              if (detail && detail.content && detail.result) {
                                onSelectAssessment(detail.content, detail.result, detail.title || h.title);
                                onClose();
                                return;
                              }
                            } catch (err) {
                              console.warn('포트폴리오 상세 로드 실패:', err);
                            }
                            if (h.content) {
                              onSelectAssessment(h.content, h.result || h, h.title);
                              onClose();
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>이 에세이를 화면에 불러오기</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <span className="text-[11px] text-slate-500">
            평가 이력은 Firebase Firestore 및 로컬 캐시에 안전하게 보관되며, 관리자가 실시간 조회 및 삭제할 수 있습니다.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
          >
            확인 완료
          </button>
        </div>
      </div>
    </div>
  );
};
