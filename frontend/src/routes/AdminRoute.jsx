import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function AdminRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!["admin","supervisor"].includes(user.role)) return <Navigate to="/sections" replace />;
  return <Outlet />;
}
