import { Info } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  getWorkbenchTooltip,
  type WorkbenchTooltipId,
} from '../dsp/workbenchTooltips';

interface InfoTooltipProps {
  tooltipId: WorkbenchTooltipId;
  className?: string;
}

interface TooltipCoords {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

export function InfoTooltip({ tooltipId, className = '' }: InfoTooltipProps) {
  const info = getWorkbenchTooltip(tooltipId);
  const tooltipDomId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openedByHoverRef = useRef(false);
  const wasPinnedOpenBeforeDownRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords>({
    top: 0,
    left: 12,
    placement: 'bottom',
  });

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openTooltip = useCallback(() => {
    clearCloseTimer();
    setIsOpen(true);
  }, [clearCloseTimer]);

  const scheduleCloseTooltip = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      openedByHoverRef.current = false;
      setIsOpen(false);
    }, 110);
  }, [clearCloseTimer]);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const margin = 12;
    const gap = 8;
    const tooltipW = Math.min(300, viewportW - margin * 2);
    const measuredH = tooltipRef.current?.offsetHeight ?? 175;

    // Center horizontally around trigger, clamped within viewport bounds
    let left = rect.left + rect.width / 2 - tooltipW / 2;
    left = Math.max(margin, Math.min(left, viewportW - tooltipW - margin));

    // Prefer opening below unless insufficient space below and more room above
    const spaceBelow = viewportH - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openAbove = spaceBelow < measuredH + gap && spaceAbove > spaceBelow;

    const top = openAbove
      ? Math.max(margin, rect.top - measuredH - gap)
      : Math.min(viewportH - measuredH - margin, rect.bottom + gap);

    setCoords({
      top,
      left,
      placement: openAbove ? 'top' : 'bottom',
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        openedByHoverRef.current = false;
        setIsOpen(false);
      }
    };
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        tooltipRef.current?.contains(target)
      ) {
        return;
      }
      openedByHoverRef.current = false;
      setIsOpen(false);
    };
    const handleReposition = () => updatePosition();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Learn about ${info.title}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipDomId : undefined}
        onMouseEnter={() => {
          openedByHoverRef.current = true;
          openTooltip();
        }}
        onMouseLeave={scheduleCloseTooltip}
        onFocus={openTooltip}
        onBlur={scheduleCloseTooltip}
        onPointerDown={() => {
          wasPinnedOpenBeforeDownRef.current = isOpen && !openedByHoverRef.current;
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          clearCloseTimer();
          openedByHoverRef.current = false;
          setIsOpen(!wasPinnedOpenBeforeDownRef.current);
        }}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:text-cyan-300 focus-visible:text-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-400 ${className}`}
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipDomId}
            role="tooltip"
            data-placement={coords.placement}
            onMouseEnter={openTooltip}
            onMouseLeave={scheduleCloseTooltip}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: 'min(300px, calc(100vw - 24px))',
            }}
            className="fixed z-50 rounded-md border border-slate-700 bg-[#0F172A] p-3 text-left shadow-2xl shadow-black/80"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
              {info.role}
            </div>
            <div className="mt-0.5 text-xs font-semibold text-slate-100">
              {info.title}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              {info.summary}
            </p>
            {info.formula && (
              <div className="mt-2 rounded border border-slate-800 bg-[#0B0F17] px-2 py-1 font-mono-tabular text-[11px] text-emerald-300">
                {info.formula}
              </div>
            )}
            <p className="mt-2 border-t border-slate-800 pt-1.5 text-[11px] leading-relaxed text-slate-400">
              <span className="font-semibold text-amber-300">Try: </span>
              {info.experimentTip}
            </p>
          </div>,
          document.body
        )}
    </>
  );
}
