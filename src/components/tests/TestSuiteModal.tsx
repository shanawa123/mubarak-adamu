import React, { useState } from 'react';
import { FlaskConical, CheckCircle2, XCircle, RefreshCw, X, Play } from 'lucide-react';

interface TestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [testData, setTestData] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleRunTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      const data = await res.json();
      setTestData(data);
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="max-w-2xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Platform Automated Test Suite</h2>
              <p className="text-xs text-neutral-400">Verifying authorization, concurrency locks, and fare calculations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-neutral-300">
            {testData ? (
              <span className="space-x-3">
                <span className="text-emerald-400 font-bold tabular-nums">✓ {testData.passedCount} Passed</span>
                {testData.failedCount > 0 && (
                  <span className="text-rose-400 font-bold tabular-nums">✗ {testData.failedCount} Failed</span>
                )}
                <span className="text-neutral-500">· {testData.totalDurationMs} ms execution</span>
              </span>
            ) : (
              <span>Execute backend test assertions directly against the active server.</span>
            )}
          </div>

          <button
            onClick={handleRunTests}
            disabled={running}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-colors shrink-0"
          >
            {running ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running Suite...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run All Tests</span>
              </>
            )}
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
          {!testData && !running && (
            <div className="p-8 rounded-xl bg-neutral-950 text-center text-neutral-500 space-y-1">
              <FlaskConical className="w-6 h-6 text-neutral-600 mx-auto" />
              <p>Click "Run All Tests" to execute the quality and security verification suite.</p>
            </div>
          )}

          {testData?.results?.map((t: any, idx: number) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                t.passed
                  ? 'bg-neutral-950 border-neutral-800/80 hover:border-emerald-500/40'
                  : 'bg-rose-950/40 border-rose-800'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">
                    [{t.category}]
                  </span>
                  <span className="font-semibold text-white">{t.name}</span>
                </div>
                <p className="text-neutral-400 text-[11px]">{t.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-neutral-500 font-mono text-[10px] tabular-nums">{t.durationMs}ms</span>
                {t.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
