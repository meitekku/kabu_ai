'use client';

import CompanySearch from "@/components/parts/common/CompanySearch";
import { CurrentPriceInfo } from "@/components/common/CurrentPriceInfo";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';

const HeaderContent = ({ isRoot }: { isRoot: boolean }) => {
  const commonClasses = "logo pl-4 text-center w-full text-xl";
  const icon = <Image src='/logo.png' alt='' width={92} height={40} />;
  const logoLink = (
    <Link href="/" className="hover:opacity-80 flex items-center justify-center">
      {icon}
    </Link>
  );
 
  return (
    <header className="border-b border-gray-200">
      <div className="grid grid-cols-[1fr_60%_1fr] items-center w-full">
        {isRoot ? (
          <h1 className={commonClasses}>{logoLink}</h1>
        ) : (
          <div className={commonClasses}>{logoLink}</div>
        )}
        <div className="p-2">
          <CompanySearch/>
        </div>
        <div className="iiarea pr-4"></div>
      </div>
      <div className="md:flex md:justify-center">
        <div className="overflow-x-auto">
          <div className="flex items-center space-x-4 whitespace-nowrap min-w-min">
            <div className="flex space-x-4">
              <CurrentPriceInfo code="0" />
              <CurrentPriceInfo code="3" />
              <CurrentPriceInfo code="1" />
              <CurrentPriceInfo code="2" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
 };

const Header = () => {
  const pathname = usePathname();
  const isRoot = pathname === "/";
  return <HeaderContent isRoot={isRoot} />;
};

export default Header;