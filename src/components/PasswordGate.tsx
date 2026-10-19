import { useState } from 'react';
import { Lock, Check, X } from 'lucide-react';

const PASSWORD = 'Kasse';

interface Props {
  onSuccess: () => void;
  title: string;
}

export function PasswordGate({ onSuccess, title }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit() {
    if (input.trim().toLowerCase() === PASSWORD.toLowerCase()) {
      onSuccess();
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <div className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Passwort eingeben"
            autoFocus
            className={`w-full rounded-xl border px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 dark:bg-gray-900 dark:text-gray-100 ${
              error
                ? 'border-red-500 focus:ring-red-500/30'
                : 'border-gray-200 focus:border-blue-500 focus:ring-blue-500/30 dark:border-gray-700'
            }`}
          />
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-500">
              <X className="h-4 w-4" /> Falsches Passwort
            </p>
          )}
          <button
            onClick={handleSubmit}
            className="w-full rounded-xl bg-blue-600 py-3 text-base font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95"
          >
            <Check className="mr-1.5 inline h-5 w-5" /> Entsperren
          </button>
        </div>
      </div>
    </div>
  );
}
