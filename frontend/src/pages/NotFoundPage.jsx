import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="container">
      <div className="card" style={{maxWidth:640, margin:"24px auto"}}>
        <h2>404</h2>
        <p className="small">La página no existe.</p>
        <Link className="btn btnPrimary" to="/sections">Ir a secciones</Link>
      </div>
    </div>
  );
}
