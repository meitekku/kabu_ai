'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ServerToDate } from '@/utils/format/ServerToDate';
import Image from 'next/image';
import NewsList from '@/components/ui/NewsList';
import RelatedStocksNews from '@/components/news/RelatedStocksNews';

interface Article {
  id: number;
  code: string;
  title: string;
  content: string;
  created_at: string;
  company_name: string;
}

interface ShareButtonProps {
  url: string;
  text?: string;
}

// ShareButton components (unchanged from original)
const TwitterShareButton = ({ url, text = '' }: ShareButtonProps) => {
  const handleShare = () => {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on X (Twitter)"
    >
      <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 1200 1227" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z" fill="white"/>
      </svg>
    </button>
  );
};

const FacebookShareButton = ({ url }: ShareButtonProps) => {
  const handleShare = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on Facebook"
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-6 h-6 text-white fill-current"
      >
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
      </svg>
    </button>
  );
};

const LineShareButton = ({ url }: ShareButtonProps) => {
  const handleShare = () => {
    const shareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-[#00B900] hover:bg-[#00a000] flex items-center justify-center transition-colors duration-200"
      aria-label="Share on LINE"
    >
      <svg
        className="w-7 h-7 text-white fill-current"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M94 26H26C19.3726 26 14 31.3726 14 38V94C14 100.627 19.3726 106 26 106H94C100.627 106 106 100.627 106 94V38C106 31.3726 100.627 26 94 26Z"
          fill="#00B900"
        />
        <path
          d="M103.5 54.72C103.5 35.17 83.9 19.27 59.8 19.27C35.7 19.27 16.11 35.17 16.11 54.72C16.11 72.25 31.66 86.93 52.65 89.72C54.08 90.03 56.01 90.66 56.5 91.88C56.6 92.47 56.62 93.4 56.64 93.88L56 99.55C55.81 100.65 55.12 103.87 59.78 101.9C64.44 99.93 85 87.09 94.13 76.54C100.46 69.54 103.5 62.54 103.5 54.72Z"
          fill="white"
        />
        <path
          d="M50.93 45.28H47.86C47.39 45.28 47.01 45.66 47.01 46.13V65.13C47.01 65.6 47.39 65.98 47.86 65.98H50.93C51.4 65.98 51.78 65.6 51.78 65.13V46.13C51.78 45.66 51.4 45.28 50.93 45.28Z"
          fill="#00B900"
        />
        <path
          d="M72 45.28H69C68.53 45.28 68.15 45.66 68.15 46.13V57.44L59.38 45.65L59.32 45.57L59.27 45.52L59.24 45.49L59.21 45.46L59.18 45.43L59.15 45.4H59.1L59.05 45.37H59L58.95 45.34H55.65C55.18 45.34 54.8 45.72 54.8 46.19V65.19C54.8 65.66 55.18 66.04 55.65 66.04H58.71C59.19 66.04 59.57 65.66 59.57 65.19V53.86L68.3 65.65C68.37 65.74 68.45 65.81 68.52 65.86L68.57 65.89L68.6 65.92L68.63 65.95L68.69 65.98H68.75C68.83 66.01 68.91 66.03 69 66.03H72C72.47 66.03 72.85 65.65 72.85 65.18V46.18C72.85 45.71 72.47 45.33 72 45.33V45.28Z"
          fill="#00B900"
        />
        <path
          d="M43.54 61.25H35.21V46.13C35.21 45.66 34.83 45.28 34.36 45.28H31.3C30.83 45.28 30.45 45.66 30.45 46.13V65.13H30.46C30.46 65.29 30.52 65.44 30.62 65.56L30.63 65.57C30.75 65.69 30.92 65.77 31.1 65.77H43.54C44.01 65.77 44.39 65.39 44.39 64.92V62.1C44.39 61.63 44.01 61.25 43.54 61.25Z"
          fill="#00B900"
        />
        <path
          d="M89 50C89.47 50 89.85 49.62 89.85 49.15V46.13C89.85 45.66 89.47 45.28 89 45.28H76.7C76.52 45.28 76.35 45.36 76.23 45.48L76.22 45.49C76.1 45.61 76.04 45.76 76.04 45.92L76.03 46.13V65.13L76.04 65.34C76.04 65.5 76.1 65.65 76.22 65.77L76.23 65.78C76.35 65.9 76.52 65.98 76.7 65.98H89C89.47 65.98 89.85 65.6 89.85 65.13V62.1C89.85 61.63 89.47 61.25 89 61.25H80.62V58H89C89.47 58 89.85 57.62 89.85 57.15V54.11C89.85 53.64 89.47 53.26 89 53.26H80.62V50H89Z"
          fill="#00B900"
        />
      </svg>
    </button>
  );
};

interface ArticleDetailClientProps {
  code: string;
  id: string;
}

const ArticleDetailClient = ({ code, id }: ArticleDetailClientProps) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await fetch(`/api/stocks/${code}/news/${id}`, {
          method: 'POST'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch article');
        }
        const data = await response.json();
        setArticle(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (id && code) {
      fetchArticle();
    }
  }, [id, code]);

  const containsNonImageHTML = (str: string) => {
    const nonImageHtmlRegex = /<(?!img\s)[a-z][\s\S]*>/i;
    return nonImageHtmlRegex.test(str);
  };

  const formatContent = (content: string) => {
    const trimmedContent = content.trim();
    
    if (containsNonImageHTML(trimmedContent)) {
      return (
        <div 
          className="prose max-w-none leading-relaxed text-gray-800"
          dangerouslySetInnerHTML={{ __html: trimmedContent }}
        />
      );
    }

    const processImgTags = (text: string) => {
      const placeholders: { [key: string]: string } = {};
      let counter = 0;
      
      const textWithPlaceholders = text.replace(/<img[^>]*>/gi, (match) => {
        const placeholder = `__IMG_PLACEHOLDER_${counter}__`;
        placeholders[placeholder] = match;
        counter++;
        return placeholder;
      });
      
      return textWithPlaceholders.split('\n\n').map((paragraph, index) => (
        <p key={index} className="mb-4 last:mb-0">
          {paragraph.split('\n').map((line, lineIndex) => {
            let processedLine = line.trim();
            
            Object.entries(placeholders).forEach(([placeholder, imgTag]) => {
              if (processedLine.includes(placeholder)) {
                const srcMatch = imgTag.match(/src=['"]([^'"]*?)['"]/);
                const imgSrc = srcMatch ? srcMatch[1] : '';
                
                const wrappedImgTag = `
                  <div class="relative text-center w-full my-4">
                    <div class="cursor-pointer inline-block relative" onclick="document.dispatchEvent(new CustomEvent('openImageModal', { detail: '${imgSrc}' }))">
                      ${imgTag}
                      <button 
                        class="absolute bottom-2 right-2 bg-white bg-opacity-70 p-1 rounded-full shadow-md hover:bg-opacity-100 transition-all pointer-events-none" 
                        aria-label="拡大表示"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <br />
                `;
                
                processedLine = processedLine.replace(placeholder, wrappedImgTag);
              }
            });
            
            return (
              <span key={lineIndex} dangerouslySetInnerHTML={{ __html: processedLine }} />
            );
          }).reduce((acc: React.ReactNode[], item, i) => {
            return acc.length === 0 
              ? [item] 
              : [...acc, <br key={`br-${i}`} />, item];
          }, [])}
        </p>
      ));
    };

    return processImgTags(trimmedContent);
  };

  useEffect(() => {
    const handleOpenImage = (event: CustomEvent) => {
      const imgSrc = event.detail;
      setCurrentImage(imgSrc);
      setImageModalOpen(true);
      setTimeout(() => setIsModalVisible(true), 10);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('openImageModal', handleOpenImage as EventListener);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('openImageModal', handleOpenImage as EventListener);
      }
    };
  }, [loading, article]);

  const closeModal = () => {
    setIsModalVisible(false);
    setTimeout(() => setImageModalOpen(false), 300);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading article...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  if (!article) {
    return <div className="text-gray-500 p-4">Article not found.</div>;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const articleCode = article.code?.trim();
  const companyNewsHref = articleCode
    ? `/stocks/${articleCode}/news`
    : code.toLowerCase() === 'all'
      ? '/news/latest'
      : `/stocks/${code}/news`;

  return (
    <div className="mx-auto px-1 sm:px-0">
      <div className="mb-4">
        <Link
          href={companyNewsHref}
          className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
        >
          ← ニュース一覧に戻る
        </Link>
      </div>
      <div className="mb-8">
        <div className="pb-4 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl font-bold">{article.title}</h1>
          <div className="flex justify-between items-center mt-2">
            <div className="text-sm text-gray-600">
              <Link href={companyNewsHref} className="text-blue-600 hover:text-blue-700 transition-colors">
                {article.company_name}
              </Link> <br/>
              {ServerToDate(article.created_at)}
            </div>
            <div className="flex space-x-2 sm:space-x-3 flex-shrink-0">
              <TwitterShareButton url={currentUrl} text={article.title} />
              <LineShareButton url={currentUrl} />
              <FacebookShareButton url={currentUrl} />
            </div>
          </div>
        </div>
        <div className="prose prose-sm sm:prose lg:prose-lg max-w-none mt-4 sm:mt-6">
          {formatContent(article.content)}
        </div>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <NewsList num="3" excludeId={id} h3Title={`${article.company_name}の最新の記事`} code={article.code} />
      </div>

      <div className="mt-8">
        <RelatedStocksNews code={article.code} excludeId={id} limit={5} />
      </div>

      {imageModalOpen && (
        <div 
          className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all duration-300 ease-in-out ${
            isModalVisible ? 'bg-opacity-75' : 'bg-opacity-0'
          }`}
          onClick={closeModal}
        >
          <div 
            className={`relative max-w-4xl max-h-[90vh] overflow-auto transition-all duration-300 ease-in-out transform ${
              isModalVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 bg-white rounded-full p-2 text-gray-800 hover:bg-gray-200 transition-colors"
              aria-label="閉じる"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Image
              src={currentImage}
              alt="拡大画像"
              width={1200}
              height={800}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleDetailClient;
