import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppContext } from '../context/AppContext';

export const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAppContext();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await logout();
      if (cancelled) return;
      navigate('/login', { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [logout, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-600">Logging out...</p>
      </div>
    </div>
  );
};
