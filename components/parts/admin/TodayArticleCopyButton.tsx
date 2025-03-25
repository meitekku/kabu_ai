import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardCopy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface TodayArticleCopyButtonProps {
  articles: {
    title: string;
    content: string;
  }[];
}

const TodayArticleCopyButton: React.FC<TodayArticleCopyButtonProps> = ({ articles }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
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
  };

  return (
    <div className="flex justify-center my-4">
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
};

export default TodayArticleCopyButton; 