'use client';

import React, { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { Search, Clock } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface Company {
  id: string;
  name: string;
}

interface SearchHistory {
  timestamp: number;
  company: Company;
}

interface CompanySearchProps {
  enableNavigation?: boolean;
  onCompanySelect?: (company: Company) => void;
  isDark?: boolean;
}

const HISTORY_KEY = 'company-search-history';
const MAX_HISTORY_ITEMS = 5;

const CompanySearch: React.FC<CompanySearchProps> = ({
  enableNavigation = true,
  onCompanySelect,
  isDark
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminPath = pathname?.includes('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedFromSuggestion, setSelectedFromSuggestion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toHalfWidth = (str: string): string => {
    return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
  };

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const response = await fetch('/company.csv');
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1);
        const parsedCompanies = rows
          .filter(row => row.trim())
          .map(row => {
            const [id, name] = row.split(',');
            return { id: id.trim(), name: toHalfWidth(name.trim()) };
          });

        setCompanies(parsedCompanies);
      } catch (error) {
        console.error('Failed to load companies:', error);
      }
    };

    loadCompanies();
    loadSearchHistory();

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setShowHistory(false);
        setSelectedIndex(-1);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, []);

  const loadSearchHistory = () => {
    if (typeof localStorage !== 'undefined') {
      try {
        const history = localStorage.getItem(HISTORY_KEY);
        if (history) {
          const parsedHistory = JSON.parse(history);
          const sortedHistory = parsedHistory.sort((a: SearchHistory, b: SearchHistory) => b.timestamp - a.timestamp);
          setSearchHistory(sortedHistory);
        }
      } catch (error) {
        console.error('Failed to load search history:', error);
      }
    }
  };

  const saveToHistory = (company: Company) => {
    const timestamp = Date.now();
    const newHistory = [
      { timestamp, company },
      ...searchHistory
        .filter(item => item.company.id !== company.id)
    ].slice(0, MAX_HISTORY_ITEMS);

    setSearchHistory(newHistory);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }
  };

  const handleSearch = (value: string): void => {
    setSearchTerm(value);
    setSelectedIndex(-1);
    setSelectedFromSuggestion(false);

    if (!value.trim()) {
      setSuggestions([]);
      setShowHistory(true);
      return;
    }

    setShowHistory(false);
    const halfWidthValue = toHalfWidth(value);
    const filtered = companies
      .filter(company =>
        company.name.toLowerCase().includes(halfWidthValue.toLowerCase()) ||
        company.id.includes(halfWidthValue)
      )
      .slice(0, 10);

    setSuggestions(filtered);
  };

  const navigateToNews = (company: Company) => {
    saveToHistory(company);
    setSuggestions([]);
    setShowHistory(false);
    setSelectedFromSuggestion(true);

    if (onCompanySelect) {
      onCompanySelect(company);
    }

    if (enableNavigation) {
      router.push(`/stocks/${company.id}/news`);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const currentList = showHistory ? searchHistory.map(h => h.company) : suggestions;
    if (!currentList.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prevIndex =>
          prevIndex < currentList.length - 1 ? prevIndex + 1 : prevIndex
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prevIndex =>
          prevIndex > 0 ? prevIndex - 1 : -1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedCompany = currentList[selectedIndex];
          navigateToNews(selectedCompany);
        } else if (!showHistory && suggestions.length === 1) {
          navigateToNews(suggestions[0]);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setShowHistory(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectCompany = (company: Company) => {
    setSearchTerm(company.name);
    navigateToNews(company);
  };

  const handleInputFocus = () => {
    if (selectedFromSuggestion) {
      setSearchTerm('');
      setSelectedFromSuggestion(false);
      setShowHistory(true);
      return;
    }

    if (searchTerm.trim()) {
      handleSearch(searchTerm);
    } else {
      setShowHistory(true);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto" ref={containerRef}>
      <div className="relative">
        <div className="relative">
          <Search className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={isAdminPath ? "管理者用 銘柄検索" : "銘柄名・コードで検索"}
            className={`w-full pl-10 pr-4 py-2 sm:py-2.5 rounded-lg text-[14px] focus:outline-none transition-all ${
              isDark
                ? "bg-slate-900 text-white placeholder-slate-500 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                : "bg-gray-100 text-gray-900 placeholder:text-gray-400 border border-transparent focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-gray-300"
            }`}
          />
        </div>

        {(suggestions.length > 0 || (showHistory && searchHistory.length > 0)) && (
          <div className={`absolute w-full mt-1.5 rounded-xl shadow-lg border overflow-hidden z-50 ${
            isDark ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
          }`}>
            <ul>
              {showHistory ? (
                searchHistory.map((history, index) => (
                  <li
                    key={`${history.company.id}-${history.timestamp}`}
                    className={`border-b last:border-b-0 cursor-pointer ${
                      isDark ? "border-slate-800" : "border-gray-50"
                    } ${
                      index === selectedIndex
                        ? (isDark ? 'bg-slate-800' : 'bg-gray-50')
                        : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50')
                    }`}
                    onClick={() => selectCompany(history.company)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center px-4 py-2.5">
                      <Clock className="text-gray-300 w-3.5 h-3.5 mr-3" />
                      <span className="text-gray-400 font-medium text-xs sm:text-sm mr-4 min-w-[3rem] font-mono tabular-nums">{history.company.id}</span>
                      {/^[A-Z]+$/.test(history.company.id) && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mr-2 font-semibold">US</span>
                      )}
                      <span className={`text-xs sm:text-sm ${isDark ? "text-slate-200" : "text-gray-700"}`}>{history.company.name}</span>
                    </div>
                  </li>
                ))
              ) : (
                suggestions.map((company, index) => (
                  <li
                    key={company.id}
                    className={`border-b last:border-b-0 cursor-pointer ${
                      isDark ? "border-slate-800" : "border-gray-50"
                    } ${
                      index === selectedIndex
                        ? (isDark ? 'bg-slate-800' : 'bg-gray-50')
                        : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50')
                    }`}
                    onClick={() => selectCompany(company)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center px-4 py-2.5">
                      <span className="text-gray-400 font-medium text-xs sm:text-sm mr-4 min-w-[3rem] font-mono tabular-nums">{company.id}</span>
                      {/^[A-Z]+$/.test(company.id) && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mr-2 font-semibold">US</span>
                      )}
                      <span className={`text-xs sm:text-sm ${isDark ? "text-slate-200" : "text-gray-700"}`}>{company.name}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySearch;
