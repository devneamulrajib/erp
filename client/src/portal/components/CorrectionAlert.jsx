import { useEffect, useRef } from 'react';
import { AlertTriangle, ArrowDown } from 'lucide-react';

// Eye-catching "admin requested a correction" card.
// Place it directly under the requisition details card, above the response form.
//
// Props:
//   note      - the admin's correction text (quotation.correctionNote)
//   targetId  - id of the response form card; the button scrolls to it
//   autoScroll - scroll the alert into view when the page opens (default true)
export default function CorrectionAlert({ note, targetId, autoScroll = true }) {
  const ref = useRef(null);

  useEffect(() => {
    if (autoScroll && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [autoScroll]);

  function goToForm() {
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div
      ref={ref}
      role="alert"
      className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4 shadow-lg shadow-amber-200/60"
    >
      {/* left accent bar */}
      <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />

      <div className="flex items-start gap-3 pl-2">
        {/* pulsing icon */}
        <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-40" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-white shadow-md">
            <AlertTriangle size={20} />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
            Action required
          </p>
          <h3 className="text-base font-bold leading-tight text-slate-900">
            Admin requested a correction
          </h3>

          {note ? (
            <div className="mt-2.5 rounded-xl border border-amber-200 bg-white/80 px-3 py-2.5">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Admin's note
              </p>
              <p className="break-words text-sm font-medium text-slate-800">“{note}”</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Please review your quotation and re-submit it.
            </p>
          )}

          {targetId && (
            <button
              type="button"
              onClick={goToForm}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 active:bg-amber-700"
            >
              Update my response <ArrowDown size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}