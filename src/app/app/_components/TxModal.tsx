import { useTenant } from '@/context/TenantContext';

function getExplorerUrl(hash: string, realChainId: number): string {
  if (realChainId === 84532)
    return `https://sepolia.basescan.org/tx/${hash}`;
  return `https://basescan.org/tx/${hash}`;
}

type TxStep = {
  label: string;
  description: string;
  activeStatuses: string[];
  completeStatuses: string[];
};

type TxModalProps = {
  status: string;
  steps: TxStep[];
  title: string;
  successTitle: string;
  successMessage?: string;
  errorReason?: string | null;
  txHashes?: (string | null | undefined)[];
  onClose: () => void;
};

export function TxModal({ status, steps, title, successTitle, successMessage, errorReason, txHashes, onClose }: TxModalProps) {
  const { realChainId } = useTenant();

  if (status === 'idle') return null;

  const isSuccess  = status === 'success';
  const isError    = ['failed', 'no_gas'].includes(status);
  const isCanceled = status === 'canceled';
  const isTerminal = isSuccess || isError || isCanceled;

  const heading = isSuccess  ? successTitle
    : isError    ? 'Transaction Failed'
    : isCanceled ? 'Transaction Canceled'
    : title;

  const subtext = isSuccess
    ? (successMessage ?? 'Your transaction has been confirmed on-chain.')
    : status === 'failed'
    ? (errorReason ?? 'Something went wrong. Check your wallet and retry.')
    : status === 'no_gas'
    ? 'Insufficient gas funds in your wallet.'
    : isCanceled
    ? 'You rejected the transaction in your wallet.'
    : 'Follow the steps in your connected wallet.';

  return (
    <div className="modal-overlay-blur">
      <div className="bg-card3 border border-border2 rounded-xl p-6 flex flex-col gap-6 w-full max-w-sm shadow-2xl">
        <div>
          <h3 className="font-display font-bold text-lg text-text">{heading}</h3>
          <p className="font-mono text-xs text-text2 mt-1">{subtext}</p>
        </div>

        <div className="flex flex-col gap-2">
          {steps.map((step, i) => {
            const isComplete = step.completeStatuses.includes(status);
            const isActive   = step.activeStatuses.includes(status);
            const hash       = txHashes?.[i];
            const explorerUrl = hash ? getExplorerUrl(hash, realChainId) : null;
            const shortHash   = hash ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : null;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-card2' : ''}`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-all"
                  style={
                    isComplete
                      ? { background: 'var(--color-green)', color: '#0a1e0b' }
                      : isActive
                      ? { background: 'var(--color-primary)', color: 'white' }
                      : { background: 'var(--color-card)', border: '1px solid var(--color-border2)', color: 'var(--color-text2)' }
                  }
                >
                  {isComplete ? '✓' : i + 1}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-mono text-xs font-semibold text-text">{step.label}</p>
                  <p className="font-mono text-[11px] text-text2">{step.description}</p>
                  {shortHash && (
                    explorerUrl
                      ? <a href={explorerUrl} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-[10px] text-text2 hover:text-text underline underline-offset-2 break-all">
                          <span className="opacity-50">TX:</span> {shortHash}
                        </a>
                      : <span className="font-mono text-[10px] text-text2 break-all"><span className="opacity-50">TX:</span> {shortHash}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isTerminal && (
          <button onClick={onClose} className="btn-game-primary w-full">
            {isSuccess ? 'Done' : isCanceled ? 'Close' : 'Close & Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
