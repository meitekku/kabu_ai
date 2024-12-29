import React from 'react';
import { X } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  text?: string;
}

export interface SNSShareButtonSetProps {
  url: string;
  text: string;
}

// X (Twitter) Share Button Component
const TwitterShareButton: React.FC<ShareButtonProps> = ({ url, text = '' }) => {
  const handleShare = () => {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-black hover:bg-gray-800 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on X (Twitter)"
    >
      <X className="w-5 h-5 text-white" />
    </button>
  );
};

// Facebook Share Button Component
const FacebookShareButton: React.FC<ShareButtonProps> = ({ url }) => {
  const handleShare = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on Facebook"
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5 text-white fill-current"
      >
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
      </svg>
    </button>
  );
};

// LINE Share Button Component
const LineShareButton: React.FC<ShareButtonProps> = ({ url }) => {
  const handleShare = () => {
    const shareUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors duration-200"
      aria-label="Share on LINE"
    >
      <svg 
        viewBox="0 0 24 24" 
        className="w-5 h-5 text-white fill-current"
      >
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.066-.023.132-.033.2-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.28-.63.63-.63.349 0 .63.285.63.63v4.771h-.006zM9.973 8.108c0-.345-.282-.63-.631-.63-.345 0-.627.285-.627.63v4.771c0 .346.282.629.63.629.346 0 .628-.283.628-.629V8.108zm-4.418 5.4h-.59l.004-.002.004-.002h.582c.346 0 .629-.285.629-.63 0-.345-.285-.63-.631-.63H3.624a.669.669 0 0 0-.199.031c-.256.086-.43.325-.43.595v4.772c0 .346.282.629.63.629.348 0 .63-.283.63-.629V16.1h1.297c.348 0 .629-.283.629-.63 0-.345-.282-.63-.63-.63H4.255v-1.332h1.3zm14.916-11.113c-5.031-5.031-13.199-5.031-18.232 0-5.031 5.031-5.031 13.199 0 18.232 5.031 5.031 13.199 5.031 18.232 0 5.031-5.033 5.031-13.201 0-18.232z"/>
      </svg>
    </button>
  );
};

const SNSShareButtonSet = ({ url, text }: SNSShareButtonSetProps) => {
  return (
    <div className="flex space-x-3">
      <TwitterShareButton url={url} text={text} />
      <LineShareButton url={url} />
      <FacebookShareButton url={url} />
    </div>
  );
};

export default SNSShareButtonSet;