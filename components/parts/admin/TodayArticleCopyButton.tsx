import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardCopy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TodayArticleCopyButtonProps {
  articles: {
    title: string;
    content: string;
  }[];
  onDaysChange?: (days: number) => void;
}

const TodayArticleCopyButton: React.FC<TodayArticleCopyButtonProps> = React.memo(({ 
  articles, 
  onDaysChange 
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedDays, setSelectedDays] = useState('1');

  // localStorageから保存された日数を取得
  useEffect(() => {
    const savedDays = localStorage.getItem('selectedDays');
    if (savedDays) {
      setSelectedDays(savedDays);
    }
  }, []);

  const handleCopy = React.useCallback(() => {
    if (articles.length === 0) {
      toast.error('コピーする記事がありません');
      return;
    }

    // タイトルと内容を結合してクリップボードにコピー
    const textToCopy = articles.map(article => `${article.title}\n${article.content}`).join('\n\n');
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        toast.success('すべての記事をクリップボードにコピーしました');
        setCopied(true);
        
        // 3秒後に元の状態に戻す
        setTimeout(() => {
          setCopied(false);
        }, 3000);
      })
      .catch((err) => {
        console.error('クリップボードへのコピーに失敗しました:', err);
        toast.error('コピーに失敗しました');
      });
  }, [articles]);

  const handleDaysChange = React.useCallback((value: string) => {
    setSelectedDays(value);
    // localStorageに選択値を保存
    localStorage.setItem('selectedDays', value);
    
    if (onDaysChange) {
      onDaysChange(parseInt(value));
    }
  }, [onDaysChange]);

  return (
    <div className="flex items-center gap-3 my-4">
      <Select
        value={selectedDays}
        onValueChange={handleDaysChange}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="期間選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">1日</SelectItem>
          <SelectItem value="2">2日</SelectItem>
          <SelectItem value="3">3日</SelectItem>
          <SelectItem value="4">4日</SelectItem>
          <SelectItem value="5">5日</SelectItem>
          <SelectItem value="6">6日</SelectItem>
          <SelectItem value="7">7日</SelectItem>
        </SelectContent>
      </Select>
      
      <Button 
        onClick={handleCopy} 
        variant="outline" 
        className="flex items-center gap-2"
      >
        {copied ? (
          <>
            <Check size={16} className="text-green-500" />
            <span>コピーしました</span>
          </>
        ) : (
          <>
            <ClipboardCopy size={16} />
            <span>全記事をコピー</span>
          </>
        )}
      </Button>
    </div>
  );
});

TodayArticleCopyButton.displayName = 'TodayArticleCopyButton';

export default TodayArticleCopyButton; 