import { Navigate } from "react-router-dom";
import { useProfile } from "../../hooksSB/useProfile";
import { useAppContext } from "../../contexto/Context";

export function AdminRoute({ children }) {
  const { profile, loadingProfile } = useAppContext();

  if (loadingProfile) return null;

  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return <Navigate to="/usuario" replace />;
  }

  return children;
}
