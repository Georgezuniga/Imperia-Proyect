import React from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

function LinkBtn({ to, children, tone = "default" }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `navTab ${tone !== "default" ? `navTab-${tone}` : ""} ${isActive ? "navTabActive" : ""}`
      }
    >
      {children}
    </NavLink>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const isStaff = user && ["admin", "supervisor"].includes(user.role);
  const isAdmin = user && user.role === "admin";

  return (
    <header className="topNav">
      <div className="topNavInner">
        {/* BRAND */}
        <Link to={user ? "/" : "/login"} className="brand">
          <img className="brandLogo" src="/imperia-logo.jpg" alt="IMPERIA" />
          <div className="brandText">
            <div className="brandName">IMPERIA</div>
            <div className="brandSub">Sistema de registros</div>
          </div>
        </Link>

        {/* USER PILL (centro) */}
        <div className="navCenter">
          {user ? (
            <div className="userPill">
              <span className="userDot" />
              <span className="userName">{user.full_name}</span>
              <span className="userRole">{user.role}</span>
            </div>
          ) : (
            <div className="userPill userPillGuest">
              <span className="userDot userDotGuest" />
              <span className="userName">Acceso</span>
              <span className="userRole">invitado</span>
            </div>
          )}
        </div>

        {/* TABS */}
        <nav className="navTabs">
          {user ? (
            <>
              <div className="navGroup">
                <div className="navGroupLabel">Operación</div>
                <div className="navGroupTabs">
                  <LinkBtn to="/sections">Secciones</LinkBtn>
                  <LinkBtn to="/my-runs">Mis registros</LinkBtn>
                </div>
              </div>

              {isStaff && (
                <div className="navGroup">
                  <div className="navGroupLabel">Administración</div>
                  <div className="navGroupTabs">
                    <LinkBtn to="/admin/runs">Registros</LinkBtn>
                    {isAdmin && <LinkBtn to="/admin/structure">Estructura</LinkBtn>}
                    {isAdmin && <LinkBtn to="/admin/users">Usuarios</LinkBtn>}
                  </div>
                </div>
              )}

              <button
                className="navTab navTab-danger"
                onClick={() => {
                  logout();
                  nav("/login");
                }}
                type="button"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <div className="navGroup">
                <div className="navGroupLabel">Acceso</div>
                <div className="navGroupTabs">
                  <LinkBtn to="/login">Login</LinkBtn>
                  <LinkBtn to="/register">Registro</LinkBtn>
                </div>
              </div>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
