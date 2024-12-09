'use client';

import React, { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { Search, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Company {
  id: string;
  name: string;
}

interface SearchHistory {
  timestamp: number;
  company: Company;
}

const HISTORY_KEY = 'company-search-history';
const MAX_HISTORY_ITEMS = 5;

const CompanySearch: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
            return { id: id.trim(), name: name.trim() };
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

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadSearchHistory = () => {
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
  };

  const saveToHistory = (company: Company) => {
    const timestamp = Date.now();
    const newHistory = [
      { timestamp, company },
      ...searchHistory
        .filter(item => item.company.id !== company.id)
    ].slice(0, MAX_HISTORY_ITEMS);

    setSearchHistory(newHistory);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const handleSearch = (value: string): void => {
    setSearchTerm(value);
    setSelectedIndex(-1);
    
    if (!value.trim()) {
      setSuggestions([]);
      setShowHistory(true);
      return;
    }

    setShowHistory(false);
    const filtered = companies
      .filter(company => 
        company.name.toLowerCase().includes(value.toLowerCase()) ||
        company.id.includes(value)
      )
      .slice(0, 10);

    setSuggestions(filtered);
  };

  const navigateToNews = (company: Company) => {
    saveToHistory(company);
    setSearchTerm('');
    setSuggestions([]);
    setShowHistory(false);
    router.push(`/${company.id}/news`);
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
    navigateToNews(company);
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      // 文字が入力されている場合は検索を実行
      handleSearch(searchTerm);
    } else {
      // 空の場合は履歴を表示
      setShowHistory(true);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4" ref={containerRef}>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="コード番号または会社名で検索"
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-lg text-gray-900 placeholder-gray-500 text-base focus:outline-none"
          />
        </div>

        {(suggestions.length > 0 || (showHistory && searchHistory.length > 0)) && (
          <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
            <ul>
              {showHistory ? (
                searchHistory.map((history, index) => (
                  <li
                    key={`${history.company.id}-${history.timestamp}`}
                    className={`border-b border-gray-100 last:border-b-0 cursor-pointer ${
                      index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => selectCompany(history.company)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center px-2 py-1">
                      <Clock className="text-gray-400 w-4 h-4 mr-2" />
                      <span className="text-gray-500 font-medium text-sm mr-3 min-w-[3rem]">{history.company.id}</span>
                      <span className="text-gray-900">{history.company.name}</span>
                    </div>
                  </li>
                ))
              ) : (
                suggestions.map((company, index) => (
                  <li
                    key={company.id}
                    className={`border-b border-gray-100 last:border-b-0 cursor-pointer ${
                      index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => selectCompany(company)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center px-2 py-1">
                      <span className="text-gray-500 font-medium text-sm mr-3 min-w-[3rem]">{company.id}</span>
                      <span className="text-gray-900">{company.name}</span>
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