import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await register(full_name, email, password);
      nav("/sections");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:560, margin:"24px auto"}}>
        <h2>Registro</h2>
        <p className="small">Solo correos @imperia.com.</p>
        {err && <p style={{color:"#ff8a8a"}}>{err}</p>}
        <form onSubmit={onSubmit}>
          <label className="label">Nombre completo</label>
          <input className="input" value={full_name} onChange={e=>setFullName(e.target.value)} />
          <label className="label">Correo</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@imperia.com" />
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <div style={{marginTop:12}}>
            <button className="btn btnPrimary" disabled={busy}>{busy?"Creando...":"Crear cuenta"}</button>
          </div>
        </form>
        <hr className="hr" />
        <p className="small">¿Ya tienes cuenta? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}
