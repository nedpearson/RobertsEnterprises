import React, { useState } from 'react';
import { Play, CheckCircle2, Clock, BookOpen, ChevronRight, Award } from 'lucide-react';
import { OWNER_ONBOARDING_COURSE } from '../api/trainingApi';
import { guidedTourEngine } from '../services/guidedTourEngine';
import { TrainingLesson } from '../types/trainingTypes';

export function OwnerOnboardingCurriculum() {
  const [selectedLesson, setSelectedLesson] = useState<TrainingLesson>(OWNER_ONBOARDING_COURSE.lessons[0]);

  const startLessonTour = (lesson: TrainingLesson) => {
    guidedTourEngine.startTour(lesson.steps, 'guided');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-rose-500" />
            <h2 className="text-xl font-black text-stone-900">{OWNER_ONBOARDING_COURSE.title}</h2>
          </div>
          <p className="text-xs text-stone-500 mt-1">{OWNER_ONBOARDING_COURSE.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-stone-100 rounded-full text-xs font-bold text-stone-700">
            {OWNER_ONBOARDING_COURSE.lessons.length} Phases
          </span>
          <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-100">
            ~{OWNER_ONBOARDING_COURSE.estimatedMinutes} Minutes Total
          </span>
        </div>
      </div>

      {/* Grid Layout: Lesson List + Step Inspector */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left 5 Cols: Phase Cards */}
        <div className="md:col-span-5 space-y-3">
          {OWNER_ONBOARDING_COURSE.lessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => setSelectedLesson(lesson)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                selectedLesson.id === lesson.id
                  ? 'bg-stone-900 text-white border-stone-900 shadow-md'
                  : 'bg-white text-stone-900 border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="space-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedLesson.id === lesson.id ? 'text-rose-400' : 'text-stone-500'
                }`}>
                  {lesson.category}
                </span>
                <h4 className="font-bold text-xs">{lesson.title}</h4>
                <p className={`text-[11px] line-clamp-1 ${
                  selectedLesson.id === lesson.id ? 'text-stone-300' : 'text-stone-500'
                }`}>
                  {lesson.description}
                </p>
              </div>

              <ChevronRight className={`h-5 w-5 ${
                selectedLesson.id === lesson.id ? 'text-rose-400' : 'text-stone-400'
              }`} />
            </div>
          ))}
        </div>

        {/* Right 7 Cols: Selected Phase Details & Interactive Tour Launcher */}
        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Selected Phase</span>
              <h3 className="text-lg font-black text-stone-900">{selectedLesson.title}</h3>
              <p className="text-xs text-stone-500 mt-0.5">{selectedLesson.description}</p>
            </div>

            <button
              onClick={() => startLessonTour(selectedLesson)}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-rose-500 transition-colors flex items-center gap-2"
              data-training-id="btn-start-phase-tour"
            >
              <Play className="h-4 w-4 fill-white" /> Start Phase Tour
            </button>
          </div>

          {/* Steps Detail Roster */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">Interactive Guided Steps</h4>
            {selectedLesson.steps.map((step, idx) => (
              <div key={step.id} className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h5 className="font-bold text-xs text-stone-900">{step.title}</h5>
                  </div>
                  <span className="text-[10px] font-mono bg-stone-200 px-2 py-0.5 rounded text-stone-700">
                    Route: {step.route}
                  </span>
                </div>
                <p className="text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200/60 leading-relaxed font-medium">
                  "{step.narration}"
                </p>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
