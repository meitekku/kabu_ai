export const checkAuth = async () => {
    try {
      const res = await fetch('/api/check-auth', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();
      return data.isAuthenticated;
    } catch {
      return false;
    }
  };