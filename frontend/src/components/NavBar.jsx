import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

function LinkItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `impDrawerItem ${isActive ? "impDrawerItemActive" : ""}`}
    >
      {children}
    </NavLink>
  );
}

export default function NavBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const isStaff = !!user && ["admin", "supervisor"].includes(user.role);
  const isAdmin = !!user && user.role === "admin";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userBtnRef = useRef(null);
  const popRef = useRef(null);

  const initial = useMemo(() => {
    const n = (user?.full_name || user?.email || "").trim();
    return (n ? n[0] : "U").toUpperCase();
  }, [user]);

  // Cerrar popover al click fuera / ESC
  useEffect(() => {
    function onDown(e) {
      if (!userMenuOpen) return;
      const t = e.target;
      if (popRef.current?.contains(t)) return;
      if (userBtnRef.current?.contains(t)) return;
      setUserMenuOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setUserMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [userMenuOpen]);

  const doLogout = () => {
    setUserMenuOpen(false);
    setDrawerOpen(false);
    logout();
    nav("/login");
  };

  return (
    <>
      <header className="impTopNav">
        <div className="impTopNavInner">
          {/* IZQUIERDA: Hamburguesa */}
          <div className="impLeft">
            {user && (
              <button
                className="impBurger"
                aria-label="Abrir menú"
                onClick={() => setDrawerOpen(true)}
                type="button"
              >
                <span />
                <span />
                <span />
              </button>
            )}

            {/* Marca */}
            <div className="impBrand">
              <img className="impBrandLogo" src="/imperia-logo.jpg" alt="IMPERIA" />
              <div className="impBrandText">
                <div className="impBrandName">IMPERIA</div>
                <div className="impBrandSub">Sistema de registros</div>
              </div>
            </div>
          </div>

          {/* CENTRO: Nombre/Rol */}
          {user && (
            <div className="impCenter">
              <div className="impCenterPill">
                <span className="impOnlineDot" />
                <span className="impCenterName">{user.full_name || user.email}</span>
                <span className="impCenterRole">{user.role}</span>
              </div>
            </div>
          )}

          {/* DERECHA: User crest */}
          {user ? (
            <div className="impRight">
              <button
                ref={userBtnRef}
                className={`impUserCrest ${userMenuOpen ? "isOpen" : ""}`}
                aria-label="Cuenta"
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                <span className="impCrown" aria-hidden="true">♛</span>
                <span className="impUserLetter">{initial}</span>
              </button>

              {userMenuOpen && (
                <div ref={popRef} className="impUserPopover" role="menu">
                  <div className="impUserPopHead">
                    <div className="impUserPopName">{user.full_name || user.email}</div>
                    <div className="impUserPopRole">{user.role}</div>
                  </div>

                  <button className="logoutBtn" type="button" onClick={doLogout}>
                    <span className="logoutIcon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M10 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-1"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M4 12h10"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M8 8l-4 4 4 4"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="logoutText">Salir</span>
                    <span className="logoutGlow" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="impRight impRightAuth">
              <NavLink className={({ isActive }) => `navLink ${isActive ? "navLinkActive" : ""}`} to="/login">
                Login
              </NavLink>
              <NavLink className={({ isActive }) => `navLink ${isActive ? "navLinkActive" : ""}`} to="/register">
                Registro
              </NavLink>
            </div>
          )}
        </div>
      </header>

      {/* DRAWER */}
      {user && (
        <>
          <div
            className={`impDrawerOverlay ${drawerOpen ? "isOpen" : ""}`}
            onClick={() => setDrawerOpen(false)}
          />

          <aside className={`impDrawer ${drawerOpen ? "isOpen" : ""}`}>
            <div className="impDrawerTop">
              <div className="impDrawerTitle">Menú</div>
              <button
                className="impDrawerClose"
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="impDrawerSection">
              <div className="impDrawerLabel">Operación</div>
              <div className="impDrawerList">
                <LinkItem to="/sections" onClick={() => setDrawerOpen(false)}>Secciones</LinkItem>
                <LinkItem to="/my-runs" onClick={() => setDrawerOpen(false)}>Mis registros</LinkItem>
              </div>
            </div>

            {isStaff && (
              <div className="impDrawerSection">
                <div className="impDrawerLabel">Administración</div>
                <div className="impDrawerList">
                  <LinkItem to="/admin/runs" onClick={() => setDrawerOpen(false)}>Registros</LinkItem>
                  {isAdmin && <LinkItem to="/admin/structure" onClick={() => setDrawerOpen(false)}>Estructura</LinkItem>}
                  {isAdmin && <LinkItem to="/admin/users" onClick={() => setDrawerOpen(false)}>Usuarios</LinkItem>}
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </>
  );
}
