import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import AdminRoute from "./routes/AdminRoute.jsx";
import PublicOnlyRoute from "./routes/PublicOnlyRoute.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import SectionsPage from "./pages/SectionsPage.jsx";
import RunDetailPage from "./pages/RunDetailPage.jsx";
import MyRunsPage from "./pages/MyRunsPage.jsx";
import AdminRunsPage from "./pages/AdminRunsPage.jsx";
import AdminStructurePage from "./pages/AdminStructurePage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  return (
    <>
      <NavBar />

      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot" element={<ForgotPasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/sections" replace />} />
          <Route path="/sections" element={<SectionsPage />} />
          <Route path="/runs/:id" element={<RunDetailPage />} />
          <Route path="/my-runs" element={<MyRunsPage />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin/runs" element={<AdminRunsPage />} />
            <Route path="/admin/structure" element={<AdminStructurePage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
