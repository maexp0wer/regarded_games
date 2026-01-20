import Link from 'next/link';
import { Logo } from '@/components/icons/svg';
import { WalletButton } from './_components/WalletButton';
import { SeasonsList } from './_components/SeasonsList'; 



export default function Navbar() {
  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  return (
    <div>
    <nav className="flex justify-between items-center p-4 ">
      
      
      
      <div className='text-primary flex justify-center items-center '>
        <Link href={mainSiteUrl || '/'}><Logo className="w-40 text-white" /></Link>
      </div>
      <WalletButton />
      </nav>

      <div>
      <SeasonsList />
      </div>
    </div>
  );
}