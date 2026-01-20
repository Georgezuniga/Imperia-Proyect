import React, { useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setMsg(""); setBusy(true);
    try {
      const data = await api.auth.forgot({ email });
      setMsg(data.message || "Revisa el enlace en consola del backend (modo simulado).");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="card" style={{maxWidth:560, margin:"24px auto"}}>
        <h2>Recuperar contraseña</h2>
        {msg && <p>{msg}</p>}
        {err && <p style={{color:"#ff8a8a"}}>{err}</p>}
        <form onSubmit={onSubmit}>
          <label className="label">Correo</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@imperia.com" />
          <div style={{marginTop:12}}>
            <button className="btn btnPrimary" disabled={busy}>{busy?"Enviando...":"Enviar"}</button>
          </div>
        </form>
        <hr className="hr" />
        <p className="small"><Link to="/login">Volver al login</Link></p>
      </div>
    </div>
  );
}
