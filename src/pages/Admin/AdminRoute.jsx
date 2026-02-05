import { Navigate } from "react-router-dom";
import { useProfile } from "../../hooksSB/useProfile";
import { useAppContext } from "../../contexto/Context";

export function AdminRoute({ children }) {
  const { profile, loadingProfile } = useAppContext();

  if (loadingProfile) return null; // o spinner

  if (!profile || profile.role !== "admin") {
    return <Navigate to="/usuario" replace />;
  }

  return children;
}
