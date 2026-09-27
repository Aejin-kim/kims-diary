// =========================================================
// 쭌이형제네 서브시스템 2.1: 가족앨범 시스템 (향후 개발 예정)
// =========================================================
import React, { useState } from 'react';
import {
  Camera,
  ArrowLeft,
  Sparkles,
  Calendar,
  Heart,
  Tag,
  CheckCircle2,
  Bell,
  Award,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';

interface FamilyAlbumViewProps {
  onBackToHub: () => void;
  onGoToIBAssessment: () => void;
}

export const FamilyAlbumView: React.FC<FamilyAlbumViewProps> = ({
  onBackToHub,
  onGoToIBAssessment,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'daily' | 'trip' | 'school'>('all');
  const [subscribed, setSubscribed] = useState(false);

  const sampleMockPhotos = [
    {
      id: 1,
      title: '주말 숲속 캠핑과 별자리 관측',
      date: '2026-08-15',
      category: 'trip',
      tags: ['가족여행', '캠핑', '여름방학'],
      color: 'from-amber-400 to-orange-500',
    },
    {
      id: 2,
      title: '교내 과학탐구 페스티벌 발표',
      date: '2026-07-22',
      category: 'school',
      tags: ['민준', '과학발표', 'MYP'],
      color: 'from-sky-400 to-indigo-500',
    },
    {
      id: 3,
      title: '쭌이형제 주말 자전거 라이딩',
      date: '2026-06-10',
      category: 'daily',
      tags: ['일상', '라이딩', '봄날'],
      color: 'from-emerald-400 to-teal-500',
    },
    {
      id: 4,
      title: '도서관 북클럽 독서 토론',
      date: '2026-05-30',
      category: 'school',
      tags: ['독서토론', '도서관', '글쓰기'],
      color: 'from-indigo-400 to-purple-500',
    },
  ];

  const filteredPhotos =
    activeCategory === 'all'
      ? sampleMockPhotos
      : sampleMockPhotos.filter((p) => p.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 w-full">
      {/* ========================================================= */}
      {/* 1. Header Navigation & Breadcrumbs */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={onBackToHub}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>쭌이형제네 포털 홈으로</span>
        </button>

        <button
          onClick={onGoToIBAssessment}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-2xs cursor-pointer"
        >
          <Award className="w-3.5 h-3.5" />
          <span>IB 서술형 다면평가 시스템으로 이동 →</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* 2. Hero Coming Soon Banner */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>서브시스템 2.1 개발 준비 중</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-3">
            쭌이형제네 가족앨범 시스템 📷
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 leading-relaxed mb-6">
            외부 상용 SNS에 아이들의 사진을 올리지 않고, 우리 가족만의 프라이빗 보안 저장소에 원본 화질 그대로 영구 보관하고 감상할 수 있는 가족 전용 앨범 시스템입니다.
          </p>

          <button
            onClick={() => setSubscribed(!subscribed)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
              subscribed
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-amber-900 hover:bg-amber-50'
            }`}
          >
            {subscribed ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>오픈 알림 신청 완료 (등록됨)</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 text-amber-700" />
                <span>가족앨범 정식 오픈 시 알림 받기</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. Feature Showcase & Preview Grid */}
      {/* ========================================================= */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">가족앨범 미리보기 (Mockup)</h3>
          <p className="text-xs text-slate-500">향후 오픈 시 제공될 타임라인 및 앨범 뷰 예시입니다.</p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          {[
            { key: 'all', label: '전체' },
            { key: 'daily', label: '일상 기록' },
            { key: 'trip', label: '가족 여행' },
            { key: 'school', label: '학교/행사' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key as any)}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeCategory === cat.key
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col"
          >
            {/* Mock Image Gradient Header */}
            <div
              className={`h-40 bg-gradient-to-tr ${photo.color} flex items-center justify-center text-white relative`}
            >
              <ImageIcon className="w-10 h-10 opacity-60" />
              <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/40 text-[10px] text-white backdrop-blur-xs font-mono">
                {photo.date}
              </span>
            </div>

            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{photo.title}</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {photo.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* 4. Planned Capabilities Specs */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
        <h4 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Camera className="w-5 h-5 text-amber-600" />
          <span>개발 예정 핵심 스펙</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed text-slate-600">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>1. 자동 날짜별 타임라인</span>
            </div>
            <p>사진 메타데이터(EXIF)를 자동 분석하여 쭌이형제의 성장 연도, 월별 히스토리 타임라인을 자동 생성합니다.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-sm">
              <Tag className="w-4 h-4 text-amber-600" />
              <span>2. Gemini AI 얼굴 인식</span>
            </div>
            <p>Google Gemini AI 비전 모델을 활용하여 인물별, 가족 구성원별 앨범을 자동으로 분류하고 태깅합니다.</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5 text-sm">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>3. 가족 프라이빗 안전 백업</span>
            </div>
            <p>외부에 사진이 유출되지 않고, 가족 전용 보안 스토리지에 무손실 원본으로 암호화 보관됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
