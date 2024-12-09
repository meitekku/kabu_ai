import CompanySearch from "@/components/parts/common/CompanySearch";
import { headers } from "next/headers";
import Link from "next/link";

const Header = async () => {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") || "";
  const isRoot = pathname === "/";
  
  const commonClasses = "logo justify-self-start pl-4 text-center w-full text-2xl";
  const logoLink = <Link href="/" className="hover:opacity-80">株AI</Link>;

  return (
    <header className="border-b border-gray-200">
      <div className="grid grid-cols-[1fr_60%_1fr] items-center w-full">
        {isRoot ? (
          <h1 className={commonClasses}>{logoLink}</h1>
        ) : (
          <div className={commonClasses}>{logoLink}</div>
        )}
        <CompanySearch/>
        <div className="iiarea justify-self-end pr-4"></div>
      </div>
    </header>
  )
}

export default Header