import { useState } from 'react';
import { X, Recycle, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import type { CashSession, Product, Location } from '@/types';

interface Props {
  session: CashSession;
  products: Product[];
  onSave: (amount: number, count: number, reason: string) => void;
  onClose: () => void;
}

export function PfandRetoureDialog({ session, products, onSave, onClose }: Props) {
  const loc = session.location as Location;
  const pfandProducts = products.filter((p) => p.pfand[loc] > 0);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const total = pfandProducts.reduce((sum, p) => sum + (counts[p.id] ?? 0) * p.pfand[loc], 0);
  const totalCount = pfandProducts.reduce((sum, p) => sum + (counts[p.id] ?? 0), 0);

  function handleSave() {
    if (total <= 0) return;
    const reason = `Pfand-Retoure (${totalCount} Artikel)`;
    onSave(total, totalCount, reason);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
            <Recycle className="h-5 w-5 text-green-600 dark:text-green-400" /> Pfand-Retoure
          </h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {pfandProducts.length === 0 ? (
            <p className="text-sm text-gray-400">Keine Pfand-Artikel vorhanden.</p>
          ) : (
            <div className="space-y-2">
              {pfandProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pfand: {formatCurrency(p.pfand[loc])}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCounts((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition active:scale-90 dark:bg-gray-700 dark:text-gray-200"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{counts[p.id] ?? 0}</span>
                    <button
                      onClick={() => setCounts((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition active:scale-90 dark:bg-gray-700 dark:text-gray-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">{totalCount} Artikel</span>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={total <= 0}
            className="w-full rounded-xl bg-green-600 py-3 text-base font-semibold text-white shadow-md transition hover:bg-green-700 active:scale-95 disabled:opacity-50"
          >
            <Check className="mr-1.5 inline h-4 w-4" /> Pfand-Retoure verbuchen
          </button>
        </div>
      </div>
    </div>
  );
}
