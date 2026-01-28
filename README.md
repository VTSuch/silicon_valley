# Silicon Valley - Headhunting & Talent Management Dashboard

Un dashboard web moderno y funcional para recruiting/headhunting construido con Next.js, TypeScript, Tailwind CSS y Supabase.

## Stack Tecnológico

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **Estilos**: Tailwind CSS (diseño minimalista y limpio)
- **Backend/Auth/DB**: Supabase
- **Drag & Drop**: @dnd-kit
- **Iconos**: Lucide React

## Características

- 🔐 Autenticación con Supabase Auth
- 📊 Dashboard con KPIs y métricas
- 👥 Gestión de candidatos
- 📋 Pipeline Kanban con drag & drop
- 🏢 Gestión de roles vacantes
- 📱 Responsive design

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
```

### 2. Configuración de Supabase

Ejecuta el siguiente SQL en tu proyecto Supabase (Panel SQL Editor):

```sql
-- El contenido del archivo supabase-schema.sql
```

### 3. Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
├── components/
│   ├── auth/              # Componentes de autenticación
│   ├── candidates/        # Gestión de candidatos
│   ├── dashboard/         # Dashboard principal
│   ├── layout/           # Layouts y sidebar
│   └── pipeline/         # Kanban pipeline
├── hooks/                # Hooks personalizados
├── lib/                  # Utilidades (Supabase client)
└── types/                # Tipos TypeScript
```

## Funcionalidades Principales

### 1. Login
- Pantalla de login minimalista
- Autenticación con email y password
- Logo "Silicon Valley" con tema recruiting

### 2. Dashboard
- KPIs: Total candidates, roles, offers accepted, etc.
- Tablas de candidatos recientes
- Lista de roles con conteo de candidatos

### 3. Candidates
- Tabla completa de candidatos
- Modal para añadir nuevos candidatos
- Dropdown de roles con opción de crear nuevos roles
- Estados predefinidos del pipeline

### 4. Pipeline (Kanban)
- Vista Kanban con drag & drop
- Columnas por cada estado del candidato
- Actualización en tiempo real del estado
- Diseño visual y funcional

## Estados del Candidato

Los candidatos pueden tener los siguientes estados:
- cv_rejected
- sent_to_agency
- sent_to_client
- first_interview
- second_interview
- third_interview
- fourth_interview
- final_interview
- client_rejected
- offer_accepted
- standby

## Deploy

La aplicación está lista para deploy en plataformas como Vercel, Netlify o cualquier servicio que soporte Next.js.

## Notas

- El diseño es minimalista y pensado para uso diario interno
- Prioridad desktop pero responsive para móviles
- Sin complejidad innecesaria, enfocado en funcionalidad
