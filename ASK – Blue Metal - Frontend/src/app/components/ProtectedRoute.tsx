import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppContext } from '../context/AppContext';

export const ProtectedRoute = () => {
  const { isAuthenticated, isAuthLoading } = useAppContext();
  const location = useLocation();

  // Initial bootstrap is in progress (silent refresh + /auth/me).
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
};
