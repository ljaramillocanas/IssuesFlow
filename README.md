# Sistema de Gestión de Casos y Pruebas - SFL/SCA/PrintLink

Sistema web centralizado para gestionar casos y pruebas de aplicaciones SFL, SCA y PrintLink con trazabilidad completa.

## 🚀 Características

- ✅ Gestión completa de Casos y Pruebas
- ✅ Sistema de avances cronológicos con adjuntos
- ✅ Control de estados configurables
- ✅ Panel de administración completo
- ✅ Roles y permisos (Administrador, Postventa, Consulta)
- ✅ Exportación a Excel con filtros
- ✅ Bitácora de auditoría
- ✅ Dark Mode
- ✅ Diseño responsive premium

## 📋 Requisitos Previos

- Node.js 18+ y npm
- Cuenta en Supabase (https://supabase.com)

## ⚙️ Configuración

### 1. Configurar Supabase

1. Crea un nuevo proyecto en Supabase
2. Ve a `SQL Editor` en el dashboard de Supabase
3. Ejecuta el contenido del archivo `supabase/schema.sql` para crear todas las tablas y configuraciones

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-de-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

Puedes encontrar estas credenciales en:
- Supabase Dashboard → Settings → API

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 👤 Primer Usuario (Administrador)

Para crear el primer usuario administrador:

1. Ve a Supabase Dashboard → Authentication → Users
2. Crea un nuevo usuario con email y contraseña
3. Copia el UUID del usuario
4. Ve a SQL Editor y ejecuta:

```sql
INSERT INTO profiles (id, full_name, role, email, is_active)
VALUES (
  'UUID-DEL-USUARIO',
  'Administrador',
  'Administrador',
  'email@ejemplo.com',
  true
);
```

Ahora puedes iniciar sesión con ese usuario.

## 📱 Uso del Sistema

### Roles y Permisos

- **Administrador**: Acceso completo, gestión de configuraciones y usuarios
- **Postventa**: Crear/editar casos y pruebas, gestionar avances
- **Consulta**: Solo lectura, puede ver y exportar datos

### Flujo de Trabajo

1. **Login**: Inicia sesión con tus credenciales
2. **Dashboard**: Vista general con estadísticas
3. **Casos/Pruebas**: Gestiona tus casos y pruebas
4. **Detalle**: Agrega avances, adjuntos y notas
5. **Reportes**: Exporta datos a Excel
6. **Administración**: (Solo admin) Gestiona configuraciones

## 🗂️ Estructura del Proyecto

```
pendientes-sfl/
├── src/
│   ├── app/                 # Páginas Next.js
│   │   ├── cases/          # Gestión de casos
│   │   ├── tests/          # Gestión de pruebas
│   │   ├── admin/          # Panel de administración
│   │   ├── reports/        # Reportes y exportación
│   │   └── login/          # Autenticación
│   ├── components/         # Componentes reutilizables
│   ├── lib/                # Utilidades y configuración
│   └── types/              # Tipos TypeScript
├── supabase/
│   └── schema.sql          # Schema de base de datos
└── public/                 # Archivos estáticos
```

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Estilos**: CSS personalizado con variables
- **Exportación**: XLSX
- **Fechas**: date-fns

## 📝 Notas Importantes

- Los registros con estado "Finalizado" están bloqueados para edición (excepto para administradores)
- Las eliminaciones son lógicas (soft delete), no se borran datos
- Todos los cambios se registran en la bitácora de auditoría
- Las pruebas pueden vincularse opcionalmente a casos

## 🔒 Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security (RLS) en todas las tablas
- Permisos basados en roles
- Validación en cliente y servidor

## 📧 Soporte

Para soporte o consultas sobre el sistema, contacta al equipo de desarrollo.

---

Desarrollado para SFL Management © 2026
