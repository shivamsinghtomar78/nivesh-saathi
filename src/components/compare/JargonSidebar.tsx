"use client";

import { JARGON_DICTIONARY, type JargonTerm } from "@/lib/jargon";

interface JargonSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  term: JargonTerm | null;
  onSelectTerm: (id: string) => void;
}

export default function JargonSidebar({
  isOpen,
  onClose,
  term,
  onSelectTerm,
}: JargonSidebarProps) {
  if (!isOpen || !term) return null;

  const relatedTerms = JARGON_DICTIONARY.filter((t) =>
    term.relatedTerms.includes(t.id)
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50 transition-opacity"
        onClick={onClose}
      />
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 overflow-y-auto animate-slide-in card-shadow-lg">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-outline/20 p-5 flex justify-between items-start">
          <div>
            <p className="text-saffron font-heading text-lg font-semibold">
              {term.termHi}
            </p>
            <p className="text-ink font-mono text-sm uppercase tracking-wider mt-1">
              {term.termEn}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-cream-dark rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-ink">close</span>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Plain Explanation */}
          <div>
            <p className="text-ink leading-relaxed">{term.plainEn}</p>
            <p className="text-ink-light text-sm mt-2 italic leading-relaxed">
              {term.plainHi}
            </p>
          </div>

          {/* Visual Analogy */}
          <div className="bg-saffron-bg/50 rounded-xl p-5">
            <h3 className="text-saffron font-semibold flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-lg">
                auto_awesome
              </span>
              How it grows over time
            </h3>
            <div className="flex items-center justify-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-forest-light flex items-center justify-center text-forest-dark text-lg font-bold">
                  ₹
                </div>
                <span className="text-xs text-ink-muted">Start</span>
              </div>
              <span className="material-symbols-outlined text-saffron">
                arrow_forward
              </span>
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 rounded-full bg-forest-light flex items-center justify-center text-forest-dark">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <span className="text-xs text-ink-muted">Time</span>
              </div>
              <span className="material-symbols-outlined text-saffron">
                arrow_forward
              </span>
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-forest-light flex items-center justify-center text-forest-dark text-lg font-bold">
                  ₹₹
                </div>
                <span className="text-xs text-ink-muted">Grown</span>
              </div>
            </div>
          </div>

          {/* Example */}
          <div>
            <h4 className="font-semibold text-sm text-ink mb-3">
              An Example:
            </h4>
            <div className="border border-outline/30 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex justify-between items-center border-b border-outline/10">
                <span className="text-ink-light text-sm">Deposit Amount</span>
                <span className="font-mono font-semibold text-ink">
                  ₹10,000
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center border-b border-outline/10">
                <span className="text-ink-light text-sm">
                  Year 1 Interest (10%)
                </span>
                <span className="font-mono font-semibold text-forest">
                  + ₹1,000
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center border-b border-outline/10 bg-cream/50">
                <span className="text-ink-light text-sm">
                  Year 2 Investment
                </span>
                <span className="font-mono font-semibold text-ink">
                  ₹11,000
                </span>
              </div>
              <div className="px-4 py-3 flex justify-between items-center">
                <span className="text-saffron font-semibold text-sm">
                  Year 2 Interest
                </span>
                <span className="font-mono font-semibold text-saffron">
                  ₹1,100
                </span>
              </div>
            </div>
            <p className="text-xs text-ink-muted mt-2 italic">
              * Here you got ₹100 extra in Year 2 because the interest from Year
              1 also earned interest!
            </p>
          </div>

          {/* Related Terms */}
          {relatedTerms.length > 0 && (
            <div className="border-t border-outline/20 pt-5">
              <h4 className="font-semibold text-sm text-ink mb-3">
                Related Terms:
              </h4>
              <div className="space-y-2">
                {relatedTerms.map((rt) => (
                  <button
                    key={rt.id}
                    onClick={() => onSelectTerm(rt.id)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-outline/20 hover:border-saffron hover:bg-saffron-bg/30 transition-all flex justify-between items-center group"
                  >
                    <div>
                      <span className="font-semibold text-sm text-ink">
                        {rt.termEn}
                      </span>
                      <span className="text-ink-muted text-xs ml-2">
                        {rt.termHi}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-saffron group-hover:translate-x-1 transition-transform">
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => {
              const randomTerm =
                JARGON_DICTIONARY[
                  Math.floor(Math.random() * JARGON_DICTIONARY.length)
                ];
              onSelectTerm(randomTerm.id);
            }}
            className="w-full bg-saffron-bg border border-saffron/30 rounded-xl p-4 flex justify-between items-center hover:bg-saffron-bg/80 transition-colors group"
          >
            <div>
              <p className="text-saffron font-semibold text-sm">Curious?</p>
              <p className="text-ink-light text-sm">Learn another term</p>
            </div>
            <span className="material-symbols-outlined text-saffron group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
