'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { formatUnits, parseEventLogs, isAddress } from 'viem';

import { TxModal } from './TxModal';
import { WalletButton } from './WalletButton';
import { FakeUSDCFaucetABI } from '@/lib/contracts';
import { useTenant, useTenantDeployment, useTenantChainId } from '@/context/TenantContext';

type Status = 'idle' | 'executing' | 'mining' | 'success' | 'failed' | 'canceled' | 'no_gas';

export function FaucetMask({ initialReferrer }: { initialReferrer?: string } = {}) {
  const { address, isConnected } = useAccount();
  const chainId = useTenantChainId();
  const { ponderUrl } = useTenant();
  const publicClient = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const coreAddresses = useTenantDeployment();

  const [status, setStatus] = useState<Status>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [claimedAmount, setClaimedAmount] = useState<bigint | null>(null);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [referrer, setReferrer] = useState(initialReferrer ?? '');
  const faucetAddr = coreAddresses.Faucet as `0x${string}` | undefined;

  const isReferrerValid = referrer === '' || isAddress(referrer, { strict: false });
  const isSelfReferral = !!address && referrer.toLowerCase() === address.toLowerCase();
  const referrerBlocksClaim = referrer !== '' && (!isReferrerValid || isSelfReferral);

  const { data: hasClaimed, refetch: refetchHasClaimed } = useReadContract({
    address: faucetAddr,
    abi: FakeUSDCFaucetABI,
    functionName: 'hasClaimed',
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: !!address && !!faucetAddr, refetchInterval: 5000 },
  });

  const { data: historicalAmount } = useQuery({
    queryKey: ['faucet-claimed-amount', address, ponderUrl],
    queryFn: async () => {
      const res = await fetch(ponderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query FaucetClaim($id: String!) { faucetClaims(id: $id) { amount } }`,
          variables: { id: address!.toLowerCase() },
        }),
      });
      const json = await res.json();
      const raw = json.data?.faucetClaims?.amount;
      return raw != null ? BigInt(raw) : null;
    },
    enabled: !!hasClaimed && !!address,
    staleTime: Infinity,
    refetchInterval: (query) => query.state.data == null ? 3000 : false,
  });

  const handleClaim = async () => {
    if (!publicClient || !address || !faucetAddr) return;

    setErrorReason(null);
    setTxHash(null);

    try {
      setStatus('executing');

      const hash = await writeContractAsync({
        address: faucetAddr,
        abi: FakeUSDCFaucetABI,
        functionName: 'claim',
        args: [],
        chainId,
      });

      setTxHash(hash);
      setStatus('mining');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const logs = parseEventLogs({
        abi: FakeUSDCFaucetABI,
        logs: receipt.logs,
        eventName: 'Claimed',
      });

      if (logs.length > 0) {
        setClaimedAmount((logs[0] as any).args.amount as bigint);
      }

      setStatus('success');
      refetchHasClaimed();

      if (referrer && isAddress(referrer, { strict: false }) && referrer.toLowerCase() !== address.toLowerCase()) {
        fetch('/api/faucet/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referee: address, referrer, chainId }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const body = await res.text().catch(() => '');
              console.error(`Referral POST failed: ${res.status} ${body}`);
            }
          })
          .catch((e) => console.error('Referral POST network error:', e));
      }

    } catch (err: any) {
      console.error('Faucet claim error:', err);
      const isRejection = err.shortMessage?.includes('rejected') || err.message?.includes('User rejected');
      const isInsufficientGas = err.message?.includes('insufficient funds') || err.name === 'InsufficientFundsError';

      if (isRejection) {
        setStatus('canceled');
        setTimeout(() => setStatus('idle'), 2000);
      } else if (isInsufficientGas) {
        setStatus('no_gas');
      } else {
        setErrorReason(err.shortMessage || err.message || null);
        setStatus('failed');
      }
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setTxHash(null);
    setErrorReason(null);
  };

  const isBusy = status === 'executing' || status === 'mining';
  const isExhausted = !!hasClaimed || status === 'success';

  const displayAmount = claimedAmount ?? historicalAmount ?? null;

  const successMessage = displayAmount
    ? `${Number(formatUnits(displayAmount, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })} FakeUSDC received`
    : undefined;

  return (
    <>
      <div className="w-full max-w-md mx-auto terminal-pane metric-bar-chassis">

        {/* HEADER */}
        <div className="terminal-pane-header border-b border-border2 pb-3">
          <span className="terminal-pane-title">FakeUSDC Faucet</span>
        </div>

        {/* ROW 2: ALLOCATION MANIFEST */}
        <div className="flex flex-col items-center justify-center py-6">
          <span className="font-mono text-[10px] uppercase text-text2 tracking-widest mb-2">
            Claim a randomized amount
          </span>

          <div
            className={`font-mono text-3xl font-black leading-none transition-colors duration-500 ${
              displayAmount ? 'text-green' : 'text-gold'
            }`}
            style={{ textShadow: displayAmount ? '0 0 16px #00ff8820' : '0 0 16px var(--color-gold-15)' }}
          >
            {displayAmount
              ? Number(formatUnits(displayAmount, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })
              : isExhausted
              ? <span className="animate-pulse">...</span>
              : '100 – 10,000'
            }
            <span className="text-xs font-normal ml-1">fUSDC</span>
          </div>
          {displayAmount && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-green mt-1">
              Received
            </span>
          )}

          <p className="font-mono text-[10px] text-text2 mt-4 max-w-62.5 text-center leading-relaxed">
            Funds can only be used for playing the game on base sepolia and hold zero real-world value.
          </p>
        </div>

        {/* ROW 3: ACTION TERMINAL */}
        <div className="border-t border-border2 pt-4 mt-1">
          {!isConnected ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-mono text-[10px] text-text2 uppercase tracking-widest">
                Connect wallet to claim
              </p>
              <WalletButton />
            </div>
          ) : isExhausted ? (
            <button
              disabled
              className="w-full py-3 bg-card2 border border-dashed border-border2 rounded flex items-center justify-center text-text2 opacity-70 font-mono text-xs tracking-widest uppercase cursor-not-allowed"
            >
              Claimed
            </button>
          ) : isBusy ? (
            <button
              disabled
              className="w-full py-3 bg-card2 border border-border2 rounded flex items-center justify-center gap-2 text-gold font-mono text-xs tracking-widest uppercase cursor-wait opacity-80"
            >
              <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
              Transmitting...
            </button>
          ) : (
            <>
              <input
                type="text"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value.trim())}
                placeholder="Referrer address (optional)"
                disabled={isBusy}
                spellCheck={false}
                autoComplete="off"
                className={`w-full px-3 py-2 mb-2 font-mono text-xs bg-card2 border rounded
                  focus:outline-none focus:ring-1 focus:ring-gold text-text placeholder-text2
                  ${referrer && (!isReferrerValid || isSelfReferral) ? 'border-pink' : 'border-border2'}`}
              />
              {referrer && !isReferrerValid && (
                <p className="font-mono text-[9px] text-pink mb-2 uppercase tracking-widest">Invalid address</p>
              )}
              {isSelfReferral && (
                <p className="font-mono text-[9px] text-pink mb-2 uppercase tracking-widest">Cannot refer yourself</p>
              )}
              <button
                onClick={handleClaim}
                disabled={referrerBlocksClaim}
                className="btn-game-primary w-full py-3 flex items-center justify-center font-mono text-xs uppercase tracking-widest transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Claim FakeUSDC
              </button>
            </>
          )}
        </div>

      </div>

      <TxModal
        status={status}
        title="Claiming FakeUSDC"
        successTitle="Liquidity Injected"
        successMessage={successMessage}
        errorReason={errorReason}
        txHashes={[txHash]}
        steps={[
          {
            label: 'Claim FakeUSDC',
            description: 'Authorize a one-time randomized liquidity injection',
            activeStatuses: ['executing', 'mining'],
            completeStatuses: ['success'],
          },
        ]}
        onClose={handleClose}
      />
    </>
  );
}
