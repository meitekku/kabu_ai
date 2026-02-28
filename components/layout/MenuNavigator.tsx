import React from 'react';

interface NavUrl {
  href: string;
  label: string;
}

interface NavigationProps {
  urls: NavUrl[];
}

const Navigation: React.FC<NavigationProps> = ({ urls }) => {
  if (!urls || urls.length === 0) {
    return null;
  }

  return (
    <nav className="w-full bg-white mb-2 overflow-x-auto">
      <div className="container mx-auto">
        <ul className="flex justify-evenly min-w-max sm:min-w-0">
          {urls.map((url, index) => (
            <li
              key={index}
              className="
                text-center
                max-w-[200px]
                border-r
                border-gray-200
                last:border-r-0
                flex-shrink-0
                sm:flex-shrink
              "
            >
              <a
                href={url.href}
                className="
                  inline-flex
                  items-center
                  justify-center
                  px-3
                  py-2
                  min-h-[44px]
                  text-sm
                  sm:text-base
                  text-gray-700
                  font-medium
                  bg-gray-50
                  hover:text-blue-600
                  hover:bg-gray-100
                  rounded-md
                  transition-all
                  duration-200
                  w-full
                  whitespace-nowrap
                "
              >
                {url.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;