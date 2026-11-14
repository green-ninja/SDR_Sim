import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  filterCheatsheetSections,
  SDR_CHEATSHEET_SECTIONS,
  SDR_RULES_OF_THUMB,
  type CheatsheetCategory,
} from '../dsp/cheatsheet';

const CATEGORY_OPTIONS: Array<'All' | CheatsheetCategory> = [
  'All',
  'RF Fundamentals',
  'Front-End & I/Q',
  'ADC & FFT',
  'Filtering & Modulation',
  'RF Cybersecurity',
];

const KEY_CONSTANTS = [
  { label: 'Speed of Light (c)', value: '2.998 × 10⁸ m/s' },
  { label: 'Thermal Noise Density (290 K)', value: '−174 dBm/Hz' },
  { label: 'Power Doubling / Halving', value: '±3.01 dB' },
  { label: 'Voltage Doubling / Halving', value: '±6.02 dB' },
];

export function CheatsheetView() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | CheatsheetCategory>('All');

  const totalTermsCount = useMemo(
    () => SDR_CHEATSHEET_SECTIONS.reduce((sum, section) => sum + section.entries.length, 0),
    []
  );

  const visibleSections = useMemo(
    () => filterCheatsheetSections(SDR_CHEATSHEET_SECTIONS, query, selectedCategory),
    [query, selectedCategory]
  );

  const visibleTermsCount = useMemo(
    () => visibleSections.reduce((sum, section) => sum + section.entries.length, 0),
    [visibleSections]
  );

  const isFiltered = query.trim().length > 0 || selectedCategory !== 'All';

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory('All');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 [text-wrap:balance]">
            SDR &amp; RF Terminology Cheatsheet
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-300">
            Single-page field reference covering electromagnetic propagation, complex I/Q sampling, ADC &amp; FFT math, modulation schemes, and RF cybersecurity concepts.
          </p>
        </div>
        <div className="font-mono-tabular text-xs text-slate-400 shrink-0">
          Showing <strong className="text-cyan-300">{visibleTermsCount}</strong> of {totalTermsCount} terms
          {' · '}
          {visibleSections.length} {visibleSections.length === 1 ? 'section' : 'sections'}
        </div>
      </div>

      {/* Quick Rules of Thumb & Constants Strip */}
      <section
        aria-label="SDR Rules of Thumb and Physical Constants"
        className="rounded-md border border-slate-800 bg-[#111827] p-4 sm:p-5"
      >
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Quick Rules of Thumb &amp; Key Constants
            </h2>
            <p className="text-xs text-slate-400">
              Essential back-of-the-envelope relationships for fast RF bench calculations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono-tabular text-slate-300">
            {KEY_CONSTANTS.map((item) => (
              <span key={item.label}>
                <span className="text-slate-400">{item.label}:</span>{' '}
                <strong className="text-amber-300">{item.value}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SDR_RULES_OF_THUMB.map((item) => (
            <div
              key={item.rule}
              className="rounded border border-slate-800 bg-[#0B0F17] p-3.5"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                {item.rule}
              </div>
              <div className="mt-1.5 font-mono-tabular text-sm font-medium text-emerald-300">
                {item.expression}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {item.takeaway}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Search & Category Filter Toolbar */}
      <section
        aria-label="Filter cheatsheet terminology"
        className="rounded-md border border-slate-800 bg-[#111827] p-4 space-y-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <label htmlFor="cheatsheet-search" className="sr-only">
              Search SDR terminology, symbols, or concepts
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              id="cheatsheet-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search terms, symbols (dBFS, FSPL, I/Q), or concepts..."
              className="w-full rounded border border-slate-700 bg-[#0B0F17] py-2 pl-9 pr-9 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search query"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter cheatsheet by category"
            className="flex flex-wrap items-center gap-1.5"
          >
            {CATEGORY_OPTIONS.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-700 bg-[#0B0F17] text-slate-300 hover:border-slate-600 hover:text-slate-100'
                  }`}
                >
                  {category}
                </button>
              );
            })}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Section Anchor Links */}
        {visibleSections.length > 1 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-800/80 pt-2.5 text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              Jump to:
            </span>
            {visibleSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <span className="font-mono-tabular text-cyan-400">{section.number}</span>{' '}
                {section.category}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Single-Page Sections Grid */}
      {visibleSections.length === 0 ? (
        <div className="rounded-md border border-slate-800 bg-[#111827] p-8 text-center">
          <p className="text-sm text-slate-300">
            No terminology entries matched <strong className="text-slate-100">“{query}”</strong>
            {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-4 rounded border border-cyan-500/50 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="scroll-mt-4 rounded-md border border-slate-800 bg-[#111827] p-4 sm:p-5"
            >
              <div className="flex flex-col gap-1 border-b border-slate-800 pb-3 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h2
                    id={`${section.id}-heading`}
                    className="text-lg font-semibold text-slate-100"
                  >
                    <span className="font-mono-tabular text-cyan-400">{section.number}</span>
                    <span aria-hidden="true" className="mx-2 text-slate-600">·</span>
                    {section.category}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">{section.description}</p>
                </div>
                <span className="font-mono-tabular text-xs text-slate-400 shrink-0">
                  {section.entries.length} {section.entries.length === 1 ? 'term' : 'terms'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
                {section.entries.map((entry) => (
                  <article
                    key={entry.term}
                    className="flex flex-col justify-between rounded border border-slate-800 bg-[#0B0F17] p-4"
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-sm font-semibold text-cyan-300">
                          {entry.term}
                        </h3>
                        {entry.symbol && (
                          <span className="font-mono-tabular text-xs font-medium text-amber-300 shrink-0">
                            {entry.symbol}
                          </span>
                        )}
                      </div>

                      {entry.formula && (
                        <div className="mt-2 rounded border border-slate-800/90 bg-[#111827] px-2.5 py-1.5 font-math text-sm italic text-emerald-300">
                          {entry.formula}
                        </div>
                      )}

                      <p className="mt-2.5 text-sm leading-relaxed text-slate-200">
                        {entry.explanation}
                      </p>
                    </div>

                    <p className="mt-3 border-t border-slate-800/80 pt-2.5 text-xs leading-relaxed text-slate-400">
                      <span className="font-semibold text-cyan-400">Lab Note:</span>{' '}
                      {entry.practicalNote}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
