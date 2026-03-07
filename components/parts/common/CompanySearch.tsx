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

  // 全角英数字を半角に変換する関数
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
            // 企業名の英数字を半角に変換
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
    // 検索時は入力値を半角に変換して検索
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

    // Call onCompanySelect callback if provided
    if (onCompanySelect) {
      onCompanySelect(company);
    }

    // Only navigate if enableNavigation is true
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
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={isAdminPath ? "管理者用 銘柄検索" : "銘柄名・コードで検索"}
            className={`w-full pl-12 pr-4 py-2 sm:py-2.5 rounded-md text-[14px] focus:outline-none transition-colors ${
              isDark 
                ? "bg-slate-900 text-white placeholder-gray-500 border border-slate-800 focus:border-amber-500/50" 
                : "bg-shikiho-bg-body text-shikiho-text-primary placeholder:text-shikiho-text-tertiary border border-shikiho-bg-border focus:border-shikiho-link-secondary focus:ring-1 focus:ring-shikiho-link-secondary"
            }`}
          />
        </div>

        {(suggestions.length > 0 || (showHistory && searchHistory.length > 0)) && (
          <div className={`absolute w-full mt-1 rounded-md shadow-shikiho-md border overflow-hidden z-50 ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-shikiho-bg-body border-shikiho-bg-border"
          }`}>
            <ul>
              {showHistory ? (
                searchHistory.map((history, index) => (
                  <li
                    key={`${history.company.id}-${history.timestamp}`}
                    className={`border-b last:border-b-0 cursor-pointer ${
                      isDark ? "border-slate-800" : "border-shikiho-bg-border-light"
                    } ${
                      index === selectedIndex 
                        ? (isDark ? 'bg-slate-800' : 'bg-shikiho-bg-gray') 
                        : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-shikiho-bg-gray')
                    }`}
                    onClick={() => selectCompany(history.company)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center px-4 py-2">
                      <Clock className="text-gray-400 w-4 h-4 mr-3" />
                      <span className="text-gray-500 font-bold text-xs sm:text-sm mr-4 min-w-[3rem]">{history.company.id}</span>
                      {/^[A-Z]+$/.test(history.company.id) && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded mr-2 font-bold">US</span>
                      )}
                      <span className={`text-xs sm:text-sm ${isDark ? "text-slate-200" : "text-gray-900"}`}>{history.company.name}</span>
                    </div>
                  </li>
                ))
              ) : (
                suggestions.map((company, index) => (
                  <li
                    key={company.id}
                    className={`border-b last:border-b-0 cursor-pointer ${
                      isDark ? "border-slate-800" : "border-shikiho-bg-border-light"
                    } ${
                      index === selectedIndex 
                        ? (isDark ? 'bg-slate-800' : 'bg-shikiho-bg-gray') 
                        : (isDark ? 'hover:bg-slate-800/50' : 'hover:bg-shikiho-bg-gray')
                    }`}
                    onClick={() => selectCompany(company)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center px-4 py-2">
                      <span className="text-gray-500 font-bold text-xs sm:text-sm mr-4 min-w-[3rem]">{company.id}</span>
                      {/^[A-Z]+$/.test(company.id) && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded mr-2 font-bold">US</span>
                      )}
                      <span className={`text-xs sm:text-sm ${isDark ? "text-slate-200" : "text-gray-900"}`}>{company.name}</span>
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
