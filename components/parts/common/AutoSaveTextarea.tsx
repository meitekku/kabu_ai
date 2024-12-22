import React, { useState, useEffect } from 'react';

interface AutoSaveTextareaProps {
  storageKey?: string;
  label?: string;
}

const AutoSaveTextarea: React.FC<AutoSaveTextareaProps> = ({ 
  storageKey = 'default', 
  label = '' 
}) => {
  const [text, setText] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // ローカルストレージのキーを生成
  const fullStorageKey = `autoSaveText_${storageKey}`;

  // コンポーネントマウント時にローカルストレージから保存データを読み込む
  useEffect(() => {
    const savedText = localStorage.getItem(fullStorageKey);
    if (savedText) {
      setText(savedText);
    }
  }, [fullStorageKey]);

  // テキスト変更時に自動保存する
  useEffect(() => {
    const saveToLocalStorage = () => {
      localStorage.setItem(fullStorageKey, text);
      setLastSaved(new Date());
    };

    // 入力から500ミリ秒後に保存する
    const timeoutId = setTimeout(saveToLocalStorage, 500);

    // クリーンアップ関数
    return () => clearTimeout(timeoutId);
  }, [text, fullStorageKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // 最終保存時刻の表示フォーマット
  const formatLastSaved = () => {
    if (!lastSaved) return '';
    return `最終保存: ${lastSaved.toLocaleTimeString()}`;
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        value={text}
        onChange={handleChange}
        className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="ここに入力してください..."
      />
      <div className="mt-2 text-sm text-gray-500">
        {formatLastSaved()}
      </div>
    </div>
  );
};

export default AutoSaveTextarea;