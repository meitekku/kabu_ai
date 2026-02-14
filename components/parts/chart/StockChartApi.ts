// 会社情報を取得する関数
export const fetchCompanyInfo = async (code: string) => {
  try {
    const response = await fetch(`/api/stocks/${code}/company_info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch company info');
    }
    
    const result = await response.json();
    if (result.success && result.data && result.data.length > 0) {
      return result.data[0];
    }
    return null;
  } catch (error) {
    console.error('Error fetching company info:', error);
    return null;
  }
}; 