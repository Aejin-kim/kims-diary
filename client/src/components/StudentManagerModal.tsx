// =========================================================
// Section 1: Module Imports and Props Interface
// =========================================================
import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, Award, BookOpen, Trash2, CheckCircle2, ChevronRight, RotateCcw, Calendar, FileText, RefreshCw, Edit3 } from 'lucide-react';
import { StudentProfile, StudentFormData } from '../types/student';
import { fetchStudents, createStudent, updateStudent, deleteStudent, fetchPortfolioData, fetchAssessmentDetail, deleteAssessmentRecord, fetchAllUsers } from '../services/assessmentService';
import { IBProgram, AssessmentResult, ManagedUser } from '../types/assessment';

interface StudentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudent: StudentProfile | null;
  onSelectStudent: (student: StudentProfile) => void;
  onRestoreAssessment: (content: string, result: AssessmentResult, title: string) => void;
}

// =========================================================
// Section 2: Student Manager Component Implementation
// =========================================================
export const StudentManagerModal: React.FC<StudentManagerModalProps> = ({
  isOpen,
  onClose,
  currentStudent,
  onSelectStudent,
  onRestoreAssessment,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<ManagedUser[]>([]);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<StudentProfile | null>(currentStudent);
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student Form State (Create / Edit)
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    googleEmail: '',
    googleUid: '',
    program: 'MYP',
    gradeLevel: 'MYP 3 (중2)',
    notes: '',
  });

  // Load students on open
  useEffect(() => {
    if (isOpen) {
      loadStudents();
    }
  }, [isOpen]);

  const loadStudents = async () => {
    try {
      const [list, users] = await Promise.all([
        fetchStudents(),
        fetchAllUsers().catch(() => []),
      ]);
      const uniqueMap = new Map<string, StudentProfile>();
      list.forEach((s) => uniqueMap.set(s.name, s));
      const uniqueList = Array.from(uniqueMap.values());
      
      setStudents(uniqueList);
      setRegisteredUsers(users);
      if (!selectedStudentForHistory && uniqueList.length > 0) {
        setSelectedStudentForHistory(uniqueList[0]);
      }
    } catch (e) {
      console.warn('학생 목록 조회 실패:', e);
    }
  };

  // Load history when student selection changes
  useEffect(() => {
    const targetStudent = selectedStudentForHistory || currentStudent;
    if (targetStudent) {
      setIsLoadingHistory(true);
      fetchPortfolioData(targetStudent.name)
        .then((res) => setStudentHistory(res.history || []))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [selectedStudentForHistory, currentStudent]);

  if (!isOpen) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      alert('학생 이름을 입력해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await createStudent({
        ...formData,
        name: trimmedName,
      });

      await loadStudents();
      onSelectStudent(created);
      setSelectedStudentForHistory(created);
      setActiveTab('list');
      setFormData({ name: '', googleEmail: '', googleUid: '', program: 'MYP', gradeLevel: 'MYP 3 (중2)', notes: '' });
    } catch (err) {
      alert((err as Error).message || '학생 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (studentId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 학생 프로필을 삭제하시겠습니까?')) {
      await deleteStudent(studentId);
      await loadStudents();
      if (selectedStudentForHistory?.id === studentId) {
        setSelectedStudentForHistory(null);
      }
    }
  };

  const handleStartEdit = (student: StudentProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingStudent(student);
    setFormData({
      name: student.name,
      googleEmail: student.googleEmail || '',
      googleUid: student.googleUid || '',
      program: student.program,
      gradeLevel: student.gradeLevel,
      notes: student.notes || '',
    });
    setActiveTab('edit');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || isSubmitting) return;

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      alert('학생 이름을 입력해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updated = await updateStudent(editingStudent.id, {
        ...formData,
        name: trimmedName,
      });

      await loadStudents();
      if (currentStudent?.id === editingStudent.id) {
        onSelectStudent(updated);
      }
      if (selectedStudentForHistory?.id === editingStudent.id) {
        setSelectedStudentForHistory(updated);
      }

      setActiveTab('list');
      setEditingStudent(null);
      setFormData({ name: '', googleEmail: '', googleUid: '', program: 'MYP', gradeLevel: 'MYP 3 (중2)', notes: '' });
    } catch (err) {
      alert((err as Error).message || '학생 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

// =========================================================
// Section 3: Modal Render View
// =========================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">학생 관리 및 개별 글 평가 이력</h2>
              <p className="text-xs text-slate-500">
                자녀/학생별 IB 과정(PYP/MYP/DP)을 등록하고 과거 평가 에세이를 언제든 다시 조회·복원합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('list');
              setEditingStudent(null);
            }}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>등록된 학생 목록 & 평가 이력 ({students.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('create');
              setEditingStudent(null);
              setFormData({ name: '', program: 'MYP', gradeLevel: 'MYP 3 (중2)', notes: '' });
            }}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>신규 학생 등록</span>
          </button>
          {activeTab === 'edit' && editingStudent && (
            <button
              className="pb-2.5 border-b-2 border-amber-600 text-amber-700 flex items-center gap-1.5 font-bold"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>{editingStudent.name} 학생 정보 수정/진학</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {activeTab === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Student List (5/12) */}
              <div className="md:col-span-5 space-y-2.5 border-r border-slate-100 pr-4">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  학생을 클릭하면 과거 작성 이력이 열립니다
                </div>
                {students.map((st) => {
                  const isCurrent = currentStudent?.name === st.name;
                  const isSelected = selectedStudentForHistory?.id === st.id;

                  return (
                    <div
                      key={st.id}
                      onClick={() => {
                        setSelectedStudentForHistory(st);
                        onSelectStudent(st);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                            {st.name.slice(0, 1)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">{st.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                  현재 선택됨
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{st.gradeLevel}</span>
                            {st.googleEmail ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60 font-mono">
                                  <span className="font-bold">G</span>
                                  <span className="truncate max-w-[140px]">{st.googleEmail}</span>
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Program Badge */}
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-md text-[10px]">
                          IB {st.program}
                        </span>
                      </div>

                      {st.notes && (
                        <p className="text-[11px] text-slate-600 mt-2 bg-slate-100/60 p-1.5 rounded-md truncate">
                          📝 {st.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                        <span>평가 글: <b>{st.essayCount || 0}편</b></span>
                        <div className="flex items-center gap-1.5">
                          {st.avgScore && (
                            <span className="text-indigo-600 font-bold mr-1">평균 {st.avgScore}/32점</span>
                          )}
                          <button
                            onClick={(e) => handleStartEdit(st, e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition font-medium text-[10px]"
                            title="학년 진학 및 정보 수정"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600" />
                            <span>수정/진학</span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(st.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="학생 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Past Assessment History for Selected Student (7/12) */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800">
                      {selectedStudentForHistory?.name} 학생의 평가 이력 ({studentHistory.length}건)
                    </span>
                  </div>
                  {selectedStudentForHistory && (
                    <span className="text-[11px] text-indigo-600 font-medium">
                      IB {selectedStudentForHistory.program} 과정
                    </span>
                  )}
                </div>

                {isLoadingHistory ? (
                  <div className="p-8 text-center text-slate-400">평가 기록을 불러오는 중...</div>
                ) : studentHistory.length > 0 ? (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {studentHistory.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-indigo-300 hover:shadow-xs transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            {item.title}
                          </h4>
                          <span className="text-sm font-black text-indigo-600">
                            {item.overallScore} <span className="text-xs text-slate-400 font-normal">/ 32점</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.createdAt.slice(0, 10)}
                          </span>
                          <span>•</span>
                          <span>A:{item.scoreA}점 | B:{item.scoreB}점 | C:{item.scoreC}점 | D:{item.scoreD}점</span>
                        </div>

                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md leading-relaxed line-clamp-2">
                          {item.summary}
                        </p>

                        <div className="pt-1 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (
                                !confirm(
                                  `'${item.title}' (${selectedStudentForHistory?.name} 학생) 평가 이력을 삭제하시겠습니까?`
                                )
                              ) {
                                return;
                              }
                              await deleteAssessmentRecord(item.id);
                              if (selectedStudentForHistory) {
                                const res = await fetchPortfolioData(selectedStudentForHistory.name);
                                setStudentHistory(res.history || []);
                              }
                              await loadStudents();
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition text-xs font-semibold cursor-pointer"
                            title="이 평가 기록 영구 삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>이력 삭제</span>
                          </button>

                          <button
                            onClick={async () => {
                              // DB에서 원본 글과 결과를 불러와 메인 2열 화면에 복원
                              try {
                                const detail = await fetchAssessmentDetail(item.id);
                                if (detail && detail.content && detail.result) {
                                  onRestoreAssessment(detail.content, detail.result, detail.title || item.title);
                                  onClose();
                                  return;
                                }
                              } catch (err) {
                                console.warn('상세 로드 실패, 기본 캐시로 복원:', err);
                              }

                              if (item.content) {
                                onRestoreAssessment(
                                  item.content,
                                  {
                                    assessedAt: item.createdAt,
                                    overallScore: item.overallScore,
                                    overallSummary: item.summary,
                                    warmFeedback: ['이전 평가 기록에서 복원되었습니다.'],
                                    coolFeedback: ['이전 평가 기록을 바탕으로 다음 퇴고를 진행하세요.'],
                                    criteria: {
                                      criterionA: { name: 'Analyzing', nameKr: '분석 및 이해', score: item.scoreA, maxScore: 8, description: '', feedback: '' },
                                      criterionB: { name: 'Organizing', nameKr: '논리 구성', score: item.scoreB, maxScore: 8, description: '', feedback: '' },
                                      criterionC: { name: 'Producing Text', nameKr: '텍스트 생산', score: item.scoreC, maxScore: 8, description: '', feedback: '' },
                                      criterionD: { name: 'Using Language', nameKr: '언어 규범', score: item.scoreD, maxScore: 8, description: '', feedback: '' },
                                    },
                                    annotations: [],
                                    guidingQuestions: [],
                                  },
                                  item.title
                                );
                                onClose();
                              }
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>이 에세이를 화면에 불러오기</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                    아직 평가받은 에세이가 없습니다.<br />
                    상단에서 학생을 선택한 후 에세이를 작성하고 [평가하기]를 눌러보세요!
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'edit' && editingStudent ? (
            /* Tab 3: Edit Student & Grade Advancement Form */
            <form onSubmit={handleEditSubmit} className="max-w-xl mx-auto space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
                <Edit3 className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">학년 진학 및 학생 정보 수정</span>
                  <p className="text-[11px] text-amber-800">
                    학년이 올라갔거나(예: 초6 → 중1 진학), IB 교육 과정(PYP → MYP → DP)이 변경되었을 때 최신 정보로 갱신합니다.
                  </p>
                </div>
              </div>

              {/* Google Account Mapping */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-1.5">
                <label className="block font-bold text-amber-950 text-xs flex items-center justify-between">
                  <span>🔗 연동할 Google 가입 계정 매핑</span>
                  <span className="text-[11px] font-normal text-amber-700">로그인 계정과 학생 프로필 연결</span>
                </label>
                <select
                  value={formData.googleUid || ''}
                  onChange={(e) => {
                    const selUid = e.target.value;
                    if (!selUid) {
                      setFormData({ ...formData, googleUid: '', googleEmail: '' });
                    } else {
                      const found = registeredUsers.find((u) => u.uid === selUid);
                      if (found) {
                        setFormData({
                          ...formData,
                          googleUid: found.uid,
                          googleEmail: found.email,
                          name: formData.name || found.name || found.displayName || found.email.split('@')[0],
                        });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">-- Google 계정 연동 안 함 (오프라인 학생) --</option>
                  {registeredUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name || u.displayName || '이름 없음'} ({u.email}) - {u.role === 'student' ? '학생' : u.role === 'evaluator' ? '평가자' : u.role === 'admin' ? '관리자' : '최고관리자'}{u.isApproved ? '' : ' [대기]'}
                    </option>
                  ))}
                </select>
                {formData.googleEmail && (
                  <p className="text-[11px] text-amber-900 flex items-center gap-1 font-medium">
                    ✓ 연결 계정: <span className="font-bold underline">{formData.googleEmail}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  학생 이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 김유준"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                  required
                />
              </div>

              {/* IB Program Selection Radio Cards */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  IB 교육 과정 선택 (진학 변경 가능)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['PYP', 'MYP', 'DP'] as IBProgram[]).map((prog) => (
                    <label
                      key={prog}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        formData.program === prog
                          ? 'border-amber-600 bg-amber-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-amber-900 text-sm">IB {prog}</span>
                        <input
                          type="radio"
                          name="edit-program"
                          value={prog}
                          checked={formData.program === prog}
                          onChange={() => setFormData({ ...formData, program: prog })}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {prog === 'PYP' ? '초등 과정 (만 3~12세)' : prog === 'MYP' ? '중등 과정 (만 11~16세)' : '고등 대입 (만 16~19세)'}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        {prog === 'PYP' ? '탐구·표현 중심' : prog === 'MYP' ? '논증·분석 중심' : '심화 학술·지식론 TOK'}
                      </p>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  진학한 학년 / 현재 수준
                </label>
                <input
                  type="text"
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  placeholder="예: 중학교 1학년 / MYP 1, 중3 / MYP 4, 고2 / DP 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  지도 메모 / 성장 관심 영역
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="예: 최근 논리적 모순이 크게 개선되었으며, 문헌 인용에 집중하고 있음."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>수정 저장 중...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>변경사항 저장 완료</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Tab 2: Create Student Form */
            <form onSubmit={handleCreateSubmit} className="max-w-xl mx-auto space-y-4">
              {/* Google Account Mapping & Duplication Prevention */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                    <span>🔗 연동할 Google 승인 계정 선택 (필수/권장)</span>
                  </label>
                  <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded font-semibold border border-indigo-200">
                    1계정 1학생 등록
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  학생 등록은 Google 가입/승인된 계정을 바탕으로 등록되며, 향후 계정 권한이 바뀌거나 탈퇴하더라도 학생의 에세이 및 평가 기록은 영구 보존됩니다.
                </p>
                <select
                  value={formData.googleUid || ''}
                  onChange={(e) => {
                    const selUid = e.target.value;
                    if (!selUid) {
                      setFormData({ ...formData, googleUid: '', googleEmail: '' });
                    } else {
                      const found = registeredUsers.find((u) => u.uid === selUid);
                      if (found) {
                        setFormData({
                          ...formData,
                          googleUid: found.uid,
                          googleEmail: found.email,
                          name: formData.name || found.name || found.displayName || found.email.split('@')[0],
                        });
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="">-- Google 계정 선택 (승인된 회원) --</option>
                  {registeredUsers.map((u) => {
                    const isAlreadyRegistered = students.some(
                      (st) => (st.googleEmail || '').trim().toLowerCase() === (u.email || '').trim().toLowerCase()
                    );

                    return (
                      <option
                        key={u.uid}
                        value={u.uid}
                        disabled={isAlreadyRegistered}
                      >
                        {u.name || u.displayName || '이름 없음'} ({u.email}) - {u.role === 'student' ? '학생' : u.role === 'evaluator' ? '평가자' : u.role === 'admin' ? '관리자' : '최고관리자'}
                        {isAlreadyRegistered ? ' [이미 학생 등록됨 ✕]' : u.isApproved ? ' [승인완료 ✓]' : ' [대기중]'}
                      </option>
                    );
                  })}
                </select>
                {formData.googleEmail && (
                  <p className="text-[11px] text-indigo-700 flex items-center gap-1 font-medium bg-white p-1.5 rounded-lg border border-indigo-100">
                    ✓ 연결 계정: <span className="font-bold underline">{formData.googleEmail}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  학생 이름 (또는 자녀 이름)
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="등록할 학생의 실명을 입력하세요"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                  required
                />
              </div>

              {/* IB Program Selection Radio Cards */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  IB 교육 과정 선택
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['PYP', 'MYP', 'DP'] as IBProgram[]).map((prog) => (
                    <label
                      key={prog}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                        formData.program === prog
                          ? 'border-indigo-600 bg-indigo-50/50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-indigo-900 text-sm">IB {prog}</span>
                        <input
                          type="radio"
                          name="program"
                          value={prog}
                          checked={formData.program === prog}
                          onChange={() => setFormData({ ...formData, program: prog })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {prog === 'PYP' ? '초등 과정 (만 3~12세)' : prog === 'MYP' ? '중등 과정 (만 11~16세)' : '고등 대입 (만 16~19세)'}
                      </span>
                      <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                        {prog === 'PYP' ? '탐구·표현 중심' : prog === 'MYP' ? '논증·분석 중심' : '심화 학술·지식론 TOK'}
                      </p>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  학년 / 수준
                </label>
                <input
                  type="text"
                  value={formData.gradeLevel}
                  onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                  placeholder="예: 초등 5학년, 중학교 3학년 / MYP 4, 고등학교 2학년 / DP 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  지도 메모 / 관심 탐구 영역
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="예: 과학 기술과 환경 문제에 관심이 많으며, 반론을 전개할 때 전제와 결론이 부딪히는 경향이 있음."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>등록 처리 중...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>학생 등록 완료</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
