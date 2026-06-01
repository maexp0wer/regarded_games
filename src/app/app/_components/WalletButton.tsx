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
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.25 font-mono text-[11px] font-semibold transition-all"
                    style={{
                      color: 'var(--color-red)',
                      background: 'var(--color-red-15)',
                      border: '1px solid var(--color-red-35)',
                    }}
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
                    className="chip chip-nav hidden sm:flex items-center gap-2"
                  >
                    {chain.hasIcon && (
                      <div className="w-4 h-4 rounded-full overflow-hidden shrink-0" style={{ background: chain.iconBackground }}>
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
                    <span>{chain.name}</span>
                  </button>

                  {/* Wallet address chip */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="chip chip-nav flex items-center gap-2"
                    style={{ color: 'var(--color-text)' }}
                  >
                    <span className="w-2 h-2 rounded-full bg-green shrink-0 wallet-glow" />
                    <span>{account.displayName}</span>
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
