import { notFound } from 'next/navigation';
import { isAddress } from 'viem';
import { FaucetMask } from '../../_components/FaucetMask';

export default async function FaucetWithReferrerPage({
  params,
}: {
  params: Promise<{ referrer: string }>;
}) {
  const { referrer } = await params;
  if (!isAddress(referrer, { strict: false })) notFound();

  return (
    <main className="py-8 flex flex-col items-center justify-center">
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
        <FaucetMask initialReferrer={referrer.toLowerCase()} />
      </div>
    </main>
  );
}
