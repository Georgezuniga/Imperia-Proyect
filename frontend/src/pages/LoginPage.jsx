import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      nav("/sections");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:520, margin:"24px auto"}}>
        <h2>Iniciar sesión</h2>
        <p className="small">Ingresa con tu correo @imperia.com.</p>
        {err && <p style={{color:"#ff8a8a"}}>{err}</p>}
        <form onSubmit={onSubmit}>
          <label className="label">Correo</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@imperia.com" />
          <label className="label">Contraseña</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <div className="row" style={{marginTop:12}}>
            <button className="btn btnPrimary" disabled={busy}>{busy?"Entrando...":"Entrar"}</button>
            <Link className="btn" to="/forgot">Olvidé mi contraseña</Link>
          </div>
        </form>
        <hr className="hr" />
        <p className="small">¿No tienes cuenta? <Link to="/register">Regístrate</Link></p>
      </div>
    </div>
  );
}
