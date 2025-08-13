import { useAuth } from '@components/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRouter: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null; // or a <Spinner />
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRouter;
