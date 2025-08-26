'use client';

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect, useSimulateContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain, usePublicClient, useReadContract, useReadContracts } from 'wagmi';
import { parseUnits, formatUnits, Address, zeroAddress } from 'viem';
import { hardhat } from 'wagmi/chains';
import { auctionTemplateABI, erc20ABI, gameControllerABI, treasuryABI, contractAddresses } from '@/lib/contracts';

// --- TYPE DEFINITIONS ---
export interface ManifestDetails {
  yieldVenues: readonly Address[];
  allocationBps: readonly bigint[];
  harvestGasPriceLimit: bigint;
}

export interface DAppState {
  isMounted: boolean;
  isConnected: boolean;
  address?: Address;
  isWrongNetwork: boolean;
  connect: () => void;
  disconnect: () => void;
  switchNetwork?: () => void;
  usdcAmount: string;
  setUsdcAmount: (amount: string) => void;
  buttonState: 'approve' | 'buy' | 'loading_allowance' | 'approving' | 'buying' | 'enter_amount' | 'success';
  buttonText: string;
  isButtonDisabled: boolean;
  handleActionClick: () => void;
  currentAllowance: string;
  buyFimError?: string;
  isSeasonLoading: boolean;
  activeSeasonId: number | null;
  isActiveSeason?: boolean;
  gameSeasonAddress?: Address;
  auctionAddress?: Address;
  seasonPrizePool: string;
  manifestDetails?: ManifestDetails;
}

type GetSeasonResult = readonly [boolean, Address, Address];
type GetManifestResult = readonly [readonly Address[], readonly bigint[], bigint];

// --- THE "GOD" HOOK: MANAGES ALL DAPP LOGIC ---
function useDApp(): DAppState {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  
  const [usdcAmount, setUsdcAmount] = useState('');
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [isAllowanceLoading, setIsAllowanceLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<number | null>(null);

  const addresses = chain ? contractAddresses[chain.id as keyof typeof contractAddresses] : undefined;
  const isWrongNetwork = isConnected && !addresses;
  const amountToSpend = usdcAmount ? parseUnits(usdcAmount, 6) : 0n;

  const fetchAllowance = useCallback(async () => {
    if (!address || !addresses || !publicClient) return;
    setIsAllowanceLoading(true);
    try {
      const result = await publicClient.readContract({
        address: addresses.usdc, abi: erc20ABI, functionName: 'allowance', args: [address, addresses.treasury],
      });
      setAllowance(result);
    } catch (e) { console.error("Failed to fetch allowance", e); setAllowance(null); }
    finally { setIsAllowanceLoading(false); }
  }, [address, addresses, publicClient]);
  useEffect(() => { fetchAllowance(); }, [fetchAllowance]);

  const { data: totalSeasonsData, isLoading: isLoadingTotal } = useReadContract({
    address: addresses?.gameController, abi: gameControllerABI, functionName: 'getTotalSeasons', query: { enabled: !!addresses },
  });
  const totalSeasons = totalSeasonsData ? Number(totalSeasonsData) : 0;
  
  const seasonStatusContracts = useMemo(() => {
    if (!addresses || totalSeasons === 0) return [];
    return Array.from({ length: totalSeasons }, (_, i) => ({
      address: addresses.gameController, abi: gameControllerABI, functionName: 'getSeason', args: [BigInt(i)],
    }));
  }, [addresses, totalSeasons]);
  
  const { data: seasonStatuses, isLoading: isLoadingStatuses } = useReadContracts({
    contracts: seasonStatusContracts, query: { enabled: totalSeasons > 0 },
  });

  useEffect(() => {
    if (seasonStatuses) {
      const idx = seasonStatuses.findIndex(s => s.status === 'success' && (s.result as unknown as GetSeasonResult)?.[0] === true);
      setActiveSeasonId(idx !== -1 ? idx : null);
    }
  }, [seasonStatuses]);

  const activeSeasonData = useMemo(() => {
    if (activeSeasonId === null || !seasonStatuses) return undefined;
    return seasonStatuses[activeSeasonId]?.result as unknown as GetSeasonResult | undefined;
  }, [activeSeasonId, seasonStatuses]);

  const { data: prizePoolData, isLoading: isLoadingPrizePool } = useReadContract({
    address: addresses?.treasury,
    abi: treasuryABI,
    functionName: 'seasonPrizePool',
    args: activeSeasonId !== null ? [BigInt(activeSeasonId)] : undefined,
    query: { enabled: activeSeasonId !== null && !!addresses, refetchInterval: 5000, }
  });

  const { data: manifestDetailsData, isLoading: isLoadingManifest } = useReadContract({
    address: addresses?.gameController,
    abi: gameControllerABI,
    functionName: 'getSeasonFinancialManifest',
    args: activeSeasonId !== null ? [BigInt(activeSeasonId)] : undefined,
    query: { enabled: activeSeasonId !== null && !!addresses, }
  });

  const needsApproval = !showSuccess && allowance !== null && allowance < amountToSpend;
  
  const { data: approveRequest } = useSimulateContract({
    address: addresses?.usdc ?? zeroAddress, abi: erc20ABI, functionName: 'approve', args: [addresses?.treasury ?? zeroAddress, amountToSpend], query: { enabled: needsApproval && !!addresses },
  });
  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  
  const { isLoading: isWaitingForApproval, isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  useEffect(() => { if (isApprovalSuccess) fetchAllowance(); }, [isApprovalSuccess, fetchAllowance]);

  const { data: buyFimRequest, error: rawBuyFimError } = useSimulateContract({
    address: addresses?.auction ?? zeroAddress, abi: auctionTemplateABI, functionName: 'buyFIM', args: [amountToSpend], query: { enabled: !needsApproval && amountToSpend > 0n && !!addresses },
  });
  const { writeContract: buyFIM, data: buyFimHash, isPending: isBuying } = useWriteContract();
  
  const { isLoading: isWaitingForBuy, isSuccess: isBuySuccess } = useWaitForTransactionReceipt({ hash: buyFimHash });
  const handleBuySuccess = useCallback(() => { setShowSuccess(true); fetchAllowance(); const timer = setTimeout(() => { setShowSuccess(false); setUsdcAmount(''); }, 5000); return () => clearTimeout(timer); }, [fetchAllowance]);
  useEffect(() => { if (isBuySuccess) handleBuySuccess(); }, [isBuySuccess, handleBuySuccess]);

  const buttonState = useMemo(() => {
    if (showSuccess) return 'success';
    if (isAllowanceLoading) return 'loading_allowance';
    if (isApproving || isWaitingForApproval) return 'approving';
    if (isBuying || isWaitingForBuy) return 'buying';
    if (amountToSpend === 0n) return 'enter_amount';
    if (needsApproval) return 'approve';
    return 'buy';
  }, [showSuccess, isAllowanceLoading, isApproving, isWaitingForApproval, isBuying, isWaitingForBuy, amountToSpend, needsApproval]);
  
  const handleActionClick = () => { if (buttonState === 'approve' && approveRequest) approve(approveRequest.request); else if (buttonState === 'buy' && buyFimRequest) buyFIM(buyFimRequest.request); };
  
  const isSeasonLoading = isLoadingTotal || isLoadingStatuses || isLoadingPrizePool || isLoadingManifest;

  return {
    isMounted, isConnected, address,
    connect: () => connect({ connector: connectors[0] }),
    disconnect, isWrongNetwork,
    switchNetwork: switchChain ? () => switchChain({ chainId: hardhat.id }) : undefined,
    usdcAmount, setUsdcAmount,
    buttonState,
    buttonText: { success: 'Success!', loading_allowance: 'Verifying...', approving: 'Approving...', buying: 'Processing...', enter_amount: 'Enter an amount', approve: `Approve ${usdcAmount} USDC`, buy: 'Buy FIM' }[buttonState],
    isButtonDisabled: ['success', 'loading_allowance', 'approving', 'buying', 'enter_amount'].includes(buttonState) || (buttonState === 'approve' && !approveRequest) || (buttonState === 'buy' && !buyFimRequest),
    handleActionClick,
    currentAllowance: allowance !== null ? formatUnits(allowance, 6) : '...',
    buyFimError: rawBuyFimError?.message,
    isSeasonLoading,
    activeSeasonId,
    isActiveSeason: activeSeasonData?.[0],
    gameSeasonAddress: activeSeasonData?.[1],
    auctionAddress: activeSeasonData?.[2],
    seasonPrizePool: prizePoolData ? formatUnits(prizePoolData, 6) : '0.00',
    manifestDetails: manifestDetailsData
      ? {
          yieldVenues: (manifestDetailsData as GetManifestResult)[0],
          allocationBps: (manifestDetailsData as GetManifestResult)[1],
          harvestGasPriceLimit: (manifestDetailsData as GetManifestResult)[2],
        }
      : undefined,
  };
}

// --- THE CONTEXT AND PROVIDER ---
const DAppContext = createContext<DAppState | undefined>(undefined);
export function DAppProvider({ children }: { children: ReactNode }) {
  const dAppState = useDApp();
  return <DAppContext.Provider value={dAppState}>{children}</DAppContext.Provider>;
}
export function useDAppContext() {
  const context = useContext(DAppContext);
  if (context === undefined) throw new Error('useDAppContext must be used within a DAppProvider');
  return context;
}