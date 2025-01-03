'use client';

import CompanySearch from "@/components/parts/common/CompanySearch";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from 'next/image';

const HeaderContent = ({ isRoot }: { isRoot: boolean }) => {
  const commonClasses = "logo pl-4 text-center w-full text-xl";
  const icon = <Image className="mr-2" src='/logo.webp' alt='' width={36} height={36} />;
  const logoLink = (
    <Link href="/" className="hover:opacity-80 flex items-center justify-center">
      {icon}株AI
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
        <div className="p-4">
          <CompanySearch/>
        </div>
        <div className="iiarea pr-4"></div>
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