import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function PublicOnlyRoute() {
  const { token } = useAuth();
  if (token) return <Navigate to="/sections" replace />;
  return <Outlet />;
}
