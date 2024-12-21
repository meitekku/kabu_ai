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
    <nav className="w-full bg-white mb-2">
      <div className="container mx-auto">
        <ul className="flex justify-evenly">
          {urls.map((url, index) => (
            <li 
              key={index} 
              className="
                text-center 
                max-w-[200px]
                border-r 
                border-gray-200
                last:border-r-0
              "
            >
              <a 
                href={url.href}
                className="
                  inline-block
                  px-3
                  py-2
                  text-gray-700
                  font-medium
                  bg-gray-50
                  hover:text-blue-600
                  hover:bg-gray-100
                  rounded-md
                  transition-all
                  duration-200
                  w-full
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