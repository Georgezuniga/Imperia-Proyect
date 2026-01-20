# IMPERIA — Sistema de registros (Checklists con evidencia)

Este proyecto es una reconversión de UniShare a un sistema de verificación por secciones (ej. COCINA) con checklist de responsabilidades.
Cada ítem puede guardar:
- resultado: pass/fail/na
- nota/observación
- foto (subida o tomada en el momento)

## Requisitos
- Node 18+
- PostgreSQL

## 1) Base de datos
Ejecuta:
`db/migrations/001_init_imperia.sql`

Luego crea un usuario admin (opciones):
- Regístrate normal (queda role=employee) y luego:
  `UPDATE users SET role='admin' WHERE email='TU@imperia.com';`

## 2) Backend
```bash
cd backend
cp .env.example .env
npm i
npm run dev
```

## 3) Frontend
```bash
cd frontend
cp .env.example .env
npm i
npm run dev
```

Frontend: http://localhost:5173  
Backend:  http://localhost:4000/api/health

## Notas
- Subida de fotos: backend guarda en `backend/uploads/checks` y expone en `/uploads/...`
- Vercel SPA fallback incluido (vercel.json)
