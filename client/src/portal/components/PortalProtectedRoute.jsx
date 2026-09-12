import { Navigate } from 'react-router-dom';

export default function PortalProtectedRoute({ children }) {
  const token = localStorage.getItem('portalToken');
  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }
  return children;
}