import { getLaunchState } from '@/config/stage';
import { LandingClient } from './_components/LandingClient';

/* Server wrapper for the landing.
 *
 * Exists so the launch state is read from the REAL server-only flags
 * (APP_LIVE / TESTNET_APP_LIVE — the same pair middleware.ts gates on) instead
 * of a NEXT_PUBLIC_ mirror the deployer had to keep in sync by hand. The whole
 * interactive deck lives in LandingClient; this passes it one resolved prop. */

export default function Home() {
  return <LandingClient launch={getLaunchState()} />;
}
