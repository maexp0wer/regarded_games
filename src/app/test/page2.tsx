// app/page.tsx

import { processWordDocument } from '@/lib/wordProcessor';
import HomeClient from './HomeClient';

export default async function Home() {
  const { navLinks, tables, sections } = await processWordDocument('content/Litepaper.docx');

  // --- SOURCE OF TRUTH FOR HEADERS (from your template) ---
  const competitiveAdvantageHeaders = ['Feature', 'Ritardo Games', 'Meme Coin Trading', 'Online Poker / Prediction Markets'];
  const tokenDistHeaders = [
    { label: 'Category', showMobileLabel: false }, { label: 'Allocation' }, { label: 'Total Tokens' }, { label: 'Purpose and Vesting Schedule', showMobileLabel: false }
  ];
  const securityRiskHeaders = [
    { label: 'Key Risk', showMobileLabel: false }, { label: 'Mitigation Strategy', showMobileLabel: false }
  ];

  // --- DATA SANITIZATION (THE FIX) ---
  // We ensure that no row from the Word doc can be longer than its corresponding header array.
  const competitiveAdvantageRows = (tables[0]?.rows || []).map(row => row.slice(0, competitiveAdvantageHeaders.length));
  const tokenDistRows = (tables[1]?.rows || []).map(row => row.slice(0, tokenDistHeaders.length));
  const securityRiskRows = (tables[2]?.rows || []).map(row => row.slice(0, securityRiskHeaders.length));

  return (
    <HomeClient
      navLinks={navLinks}
      pageSections={sections}
      // Pass the cleaned, safe data to the client
      competitiveAdvantageRows={competitiveAdvantageRows}
      tokenDistRows={tokenDistRows}
      securityRiskRows={securityRiskRows}
    />
  );
}