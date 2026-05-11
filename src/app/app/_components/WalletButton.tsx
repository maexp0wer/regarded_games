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

            {/* INVISIBLE DISCOURSE SSO AUTO-LOGIN                       */}
            {connected && process.env.NEXT_PUBLIC_DISCOURSE_URL && (
              <iframe
                src={`${process.env.NEXT_PUBLIC_DISCOURSE_URL}/session/sso`}
                title="Discourse Background Auth"
                style={{
                  width: 0,
                  height: 0,
                  border: 'none',
                  position: 'absolute',
                  visibility: 'hidden',
                }}
                aria-hidden="true"
              />
            )}
            
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="px-6 py-2 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary2 text-bg shadow-md"
                  >
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-danger text-text font-bold py-2 px-4 rounded-xl shadow-lg transition-all"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-3">
                  {/* Chain Button */}
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="hidden md:flex items-center gap-2 bg-card2 hover:bg-card3 text-text py-2 px-4 rounded-xl transition-all"
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
                    <span className="text-sm font-semibold">{chain.name}</span>
                  </button>

                  {/* Account Button */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    // text-textMain inherits --color-text: #2e2e2a
                    className="flex items-center gap-2 bg-card text-text font-bold py-2 px-4 rounded-xl transition-all hover:bg-card2 shadow-sm"
                  >
                    <span className="text-sm">
                      {account.displayName}
                    </span>
                    {/* ETH balance display logic removed from here */}
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