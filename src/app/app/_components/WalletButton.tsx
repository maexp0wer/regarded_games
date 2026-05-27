'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export const WalletButton = () => {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="btn-game-primary py-2! px-4! text-sm!"
                  >
                    Connect
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs font-semibold text-red bg-card border border-red/30 transition-all hover:border-red/60"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {/* Chain chip */}
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 bg-card border border-border transition-all hover:border-border-bright"
                  >
                    {chain.hasIcon && (
                      <div className="w-4 h-4 rounded-full overflow-hidden" style={{ background: chain.iconBackground }}>
                        {chain.iconUrl && (
                          <Image
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            width={16}
                            height={16}
                            unoptimized
                          />
                        )}
                      </div>
                    )}
                    <span className="font-mono text-[11px] font-semibold text-text2">{chain.name}</span>
                  </button>

                  {/* Wallet address chip */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="flex items-center gap-2 rounded-full px-4 py-2 bg-card border border-border transition-all hover:border-border-bright"
                  >
                    <span
                      className="w-2 h-2 rounded-full bg-green shrink-0 wallet-glow"
                    />
                    <span className="font-mono text-[12px] font-semibold text-text">
                      {account.displayName}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
};
