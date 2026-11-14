import { useState } from 'react';
import {
  SDR_TUTORIAL_TOPICS,
  calculateMasteryProgress,
  evaluateQuizAnswer,
  type TopicLevel,
} from '../dsp/curriculum';
import type { PipelineStageId, SdrConfig } from '../dsp/types';
import { TopicInteractiveDemo } from './TopicInteractiveDemo';

interface TutorialsViewProps {
  completedTopicIds: string[];
  onToggleTopicComplete: (topicId: string, forceComplete?: boolean) => void;
  onLaunchLab: (patch: Partial<SdrConfig>, stage?: PipelineStageId) => void;
}

const LEVEL_TEXT_CLASS: Record<TopicLevel, string> = {
  Beginner: 'text-emerald-400',
  Intermediate: 'text-cyan-300',
  Expert: 'text-amber-300',
};

export function TutorialsView({
  completedTopicIds,
  onToggleTopicComplete,
  onLaunchLab,
}: TutorialsViewProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(SDR_TUTORIAL_TOPICS[0].id);
  const [levelFilter, setLevelFilter] = useState<'All' | TopicLevel>('All');
  const [showFormulae, setShowFormulae] = useState<boolean>(true);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const visibleTopics =
    levelFilter === 'All'
      ? SDR_TUTORIAL_TOPICS
      : SDR_TUTORIAL_TOPICS.filter((t) => t.level === levelFilter);

  const topicIndex = Math.max(
    0,
    SDR_TUTORIAL_TOPICS.findIndex((t) => t.id === selectedTopicId)
  );
  const activeTopic = SDR_TUTORIAL_TOPICS[topicIndex];
  const progress = calculateMasteryProgress(completedTopicIds);
  const isTopicCompleted = completedTopicIds.includes(activeTopic.id);

  const selectedOption = selectedAnswers[activeTopic.id];
  const quizResult =
    selectedOption !== undefined
      ? evaluateQuizAnswer(activeTopic, selectedOption)
      : null;

  const handleSelectOption = (optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [activeTopic.id]: optionIdx }));
    const res = evaluateQuizAnswer(activeTopic, optionIdx);
    if (res.isCorrect) {
      onToggleTopicComplete(activeTopic.id, true);
    }
  };

  const handleLevelFilter = (nextLevel: 'All' | TopicLevel) => {
    setLevelFilter(nextLevel);
    if (nextLevel !== 'All') {
      const matching = SDR_TUTORIAL_TOPICS.filter((t) => t.level === nextLevel);
      if (matching.length > 0 && activeTopic.level !== nextLevel) {
        setSelectedTopicId(matching[0].id);
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header & Mastery Progress */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
            SDR Mastery Curriculum: Beginner to Expert
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Progress from general RF terminology through every SDR hardware and DSP stage, with live interactive visual demonstrations inside every topic.
          </p>
        </div>

        <div className="w-full sm:w-64 rounded-md border border-slate-800 bg-[#111827] px-3.5 py-2.5">
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className="text-slate-300">Curriculum Progress</span>
            <strong className="text-cyan-300">
              {progress.completedCount}/{progress.totalCount} ({progress.percent}%)
            </strong>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-cyan-400 transition-all duration-200"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left Sidebar: Level Filter + Structured Topics List */}
        <aside
          aria-label="Tutorial Topics"
          className="w-full shrink-0 rounded-md border border-slate-800 bg-[#111827] p-3 lg:w-[330px]"
        >
          <div
            role="group"
            aria-label="Filter tutorial topics by difficulty level"
            className="mb-3 grid grid-cols-4 gap-1 rounded border border-slate-800 bg-[#0B0F17] p-1"
          >
            {(['All', 'Beginner', 'Intermediate', 'Expert'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLevelFilter(lvl)}
                className={`rounded px-1.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  levelFilter === lvl
                    ? 'bg-cyan-500/20 text-cyan-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <h2 className="px-1 text-xs font-semibold text-slate-200">
            Topics ({visibleTopics.length})
          </h2>
          <nav aria-label="Tutorial topic selector" className="mt-2 space-y-1.5">
            {visibleTopics.map((topic) => {
              const isActive = topic.id === activeTopic.id;
              const isDone = completedTopicIds.includes(topic.id);
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex w-full flex-col items-start rounded border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                    isActive
                      ? 'border-cyan-500/70 bg-[#131C2B]'
                      : 'border-slate-800 bg-[#0B0F17] hover:border-slate-700'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2 text-[11px] font-mono-tabular">
                    <span>
                      <span className="text-slate-300">Topic {topic.number}</span>
                      <span className="mx-1.5 text-slate-600" aria-hidden="true">·</span>
                      <span className={`font-semibold ${LEVEL_TEXT_CLASS[topic.level]}`}>
                        {topic.level}
                      </span>
                    </span>
                    <span className={isDone ? 'text-emerald-400' : 'text-slate-400'}>
                      {isDone ? '✓ Mastered' : '○ Open'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-100">
                    {topic.title}
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Detail Panel */}
        <article
          aria-label={`Topic ${activeTopic.number}: ${activeTopic.title}`}
          className="min-w-0 flex-1 space-y-5 rounded-md border border-slate-800 bg-[#111827] p-5"
        >
          {/* Topic Header & Controls */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-slate-400">
                <span className="text-cyan-300 font-semibold">
                  Topic {activeTopic.number}
                </span>
                <span aria-hidden="true">·</span>
                <span className={`font-semibold ${LEVEL_TEXT_CLASS[activeTopic.level]}`}>
                  Level: {activeTopic.level}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeTopic.componentFocus}</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-100">
                {activeTopic.title}
              </h2>
              <p className="mt-1 text-sm text-slate-300">{activeTopic.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={showFormulae}
                onClick={() => setShowFormulae((prev) => !prev)}
                className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  showFormulae
                    ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200'
                    : 'border-slate-700 bg-[#0B0F17] text-slate-300 hover:border-slate-600'
                }`}
              >
                {showFormulae ? 'Formulae: Visible' : 'Show Formulae'}
              </button>

              <button
                type="button"
                onClick={() => onToggleTopicComplete(activeTopic.id)}
                className={`rounded border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isTopicCompleted
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200'
                    : 'border-slate-700 bg-[#0B0F17] text-slate-200 hover:border-slate-600'
                }`}
              >
                {isTopicCompleted ? '✓ Completed' : 'Mark Completed'}
              </button>
            </div>
          </div>

          {/* 1. Core Terminology */}
          <section aria-label="Core Terminology">
            <h3 className="text-sm font-semibold text-slate-100">
              01. Core Terminology
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {activeTopic.terminology.map((item) => (
                <div
                  key={item.term}
                  className="rounded border border-slate-800 bg-[#0B0F17] p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-cyan-300">
                      {item.term}
                    </span>
                    {item.symbol && (
                      <span className="font-mono-tabular text-[11px] text-amber-300">
                        {item.symbol}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    {item.definition}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 2. Interactive Visual Demonstration (Embedded directly in every topic) */}
          <section
            aria-label="Interactive Topic Visual Simulator"
            className="rounded-md border border-slate-800 bg-[#0B0F17] p-4"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  02. Interactive Visual Demonstration
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Adjust the parameters below to see the physics and DSP behavior respond instantaneously.
                </p>
              </div>
              <span className="font-mono-tabular text-[11px] text-cyan-300">
                Live Interactive Component
              </span>
            </div>
            <TopicInteractiveDemo topicId={activeTopic.id} />
          </section>

          {/* 3. How It Works */}
          <section aria-label="Physics and Component Architecture">
            <h3 className="text-sm font-semibold text-slate-100">
              03. Physics & Component Architecture
            </h3>
            <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-slate-300">
              {activeTopic.explanation.map((para) => (
                <p key={para}>{para}</p>
              ))}
            </div>
          </section>

          {/* 4. Governing Formulae (Toggleable) */}
          {showFormulae && (
            <section aria-label="Topic Formulae">
              <h3 className="text-sm font-semibold text-slate-100">
                04. Governing Formulae
              </h3>
              <div className="mt-2.5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {activeTopic.formulae.map((f) => (
                  <div
                    key={f.label}
                    className="rounded border border-slate-800 bg-[#0B0F17] p-3.5"
                  >
                    <div className="text-xs font-semibold text-cyan-300">{f.label}</div>
                    <div className="mt-1.5 rounded border border-slate-800 bg-[#111827] px-3 py-2 font-math text-sm italic text-emerald-300">
                      {f.equation}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-300">
                      {f.meaning}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 5. Interactive Hands-On Lab */}
          <section
            aria-label="Hands-On Workbench Lab"
            className="rounded-md border border-slate-800 bg-[#0B0F17] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  05. Full Workbench Lab Exercise
                </h3>
                <p className="mt-0.5 text-xs text-slate-300">
                  {activeTopic.labExercise.objective}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onLaunchLab(
                    activeTopic.labExercise.configPatch,
                    activeTopic.pipelineStage
                  )
                }
                className="rounded border border-cyan-500/50 bg-cyan-500/15 px-3.5 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0"
              >
                Launch Topic Lab in Workbench
              </button>
            </div>

            <ol className="mt-3 space-y-1.5 text-xs text-slate-300 list-decimal list-inside">
              {activeTopic.labExercise.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          {/* 6. Mastery Check Quiz */}
          <section
            aria-label="Topic Mastery Check"
            className="rounded-md border border-slate-800 bg-[#0B0F17] p-4"
          >
            <h3 className="text-sm font-semibold text-slate-100">
              06. Mastery Check
            </h3>
            <p className="mt-1.5 text-xs font-medium text-slate-200">
              {activeTopic.quiz.question}
            </p>

            <div className="mt-3 space-y-2">
              {activeTopic.quiz.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrectOpt = idx === activeTopic.quiz.correctIndex;
                let stateClass =
                  'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700';
                if (isSelected) {
                  stateClass = isCorrectOpt
                    ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200'
                    : 'border-rose-500/60 bg-rose-950/30 text-rose-200';
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    aria-pressed={isSelected}
                    className={`block w-full rounded border px-3 py-2 text-left text-xs transition-colors ${stateClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {quizResult && (
              <div
                className={`mt-3 rounded border px-3 py-2 text-xs ${
                  quizResult.isCorrect
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                    : 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                }`}
              >
                <strong className="font-semibold">
                  {quizResult.isCorrect ? '✓ Correct: ' : '▲ Review: '}
                </strong>
                {quizResult.explanation}
              </div>
            )}
          </section>

          {/* Footer Pagination */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <button
              type="button"
              disabled={topicIndex === 0}
              onClick={() =>
                setSelectedTopicId(SDR_TUTORIAL_TOPICS[topicIndex - 1].id)
              }
              className="rounded border border-slate-700 bg-[#0B0F17] px-3 py-1.5 text-xs font-medium text-slate-200 disabled:opacity-40 hover:border-slate-600 transition-colors whitespace-nowrap shrink-0"
            >
              Previous Topic
            </button>

            <span className="font-mono-tabular text-xs text-slate-400">
              Topic {topicIndex + 1} of {SDR_TUTORIAL_TOPICS.length}
            </span>

            <button
              type="button"
              disabled={topicIndex === SDR_TUTORIAL_TOPICS.length - 1}
              onClick={() =>
                setSelectedTopicId(SDR_TUTORIAL_TOPICS[topicIndex + 1].id)
              }
              className="rounded border border-cyan-500/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 disabled:opacity-40 hover:bg-cyan-500/25 transition-colors whitespace-nowrap shrink-0"
            >
              Next Topic
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
