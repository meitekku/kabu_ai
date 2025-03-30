/**
 * ランダムな英数字の文字列を生成する
 * @param length 生成する文字列の長さ
 * @param characters 使用する文字セット（デフォルトは英数字）
 * @returns ランダムな文字列
 */
export function generateRandomString(
  length: number = 5,
  characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}

/**
 * 5桁のランダムな英数字の文字列を生成する
 * @returns 5桁のランダムな英数字の文字列
 * 
 */
export function generateFiveDigitCode(): string {
  return generateRandomString(5);
}

/**
 * 指定された範囲内のランダムな整数を生成する
 * @param min 最小値（含む）
 * @param max 最大値（含む）
 * @returns ランダムな整数
 */
export function generateRandomInteger(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * ランダムな要素を配列から選択する
 * @param array 選択元の配列
 * @returns ランダムに選択された要素
 */
export function getRandomArrayElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 配列をランダムに並べ替える（シャッフル）
 * @param array シャッフルする配列
 * @returns シャッフルされた新しい配列
 */
export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * 指定された確率でtrueを返す
 * @param probability 確率（0〜1の範囲）
 * @returns 確率に基づいたブール値
 */
export function randomChance(probability: number): boolean {
  return Math.random() < probability;
} 