# Guía de Configuración y Despliegue

## 🔧 Configuración Inicial

### 1. Configurar Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Espera a que el proyecto esté listo (toma ~2 minutos)

### 2. Ejecutar el Schema de Base de Datos

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Copia todo el contenido de `supabase/schema.sql`
3. Pégalo en el editor SQL
4. Click en **Run** para ejecutar el script
5. Verifica que no haya errores

### 3. Obtener Credenciales

1. En Supabase, ve a **Settings** → **API**
2. Copia los siguientes valores:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (key larga que empieza con `eyJ...`)
   - **service_role key** (otra key larga, más abajo en la página)

### 4. Configurar Variables de Entorno

1. En la raíz del proyecto, crea un archivo llamado `.env.local`
2. Agrega las siguientes líneas (reemplaza con tus valores):

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...tu-service-role-key
```

### 5. Instalar Dependencias

```bash
npm install
```

### 6. Ejecutar en Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 7. Crear el Primer Usuario Administrador

**Opción A: Desde Supabase Dashboard**

1. Ve a **Authentication** → **Users**
2. Click en **Add user** → **Create new user**
3. Ingresa:
   - Email: `admin@ejemplo.com`
   - Password: (elige una contraseña segura)
   - Auto Confirm User: ✓ (activado)
4. Click en **Create user**
5. Copia el **UUID** del usuario creado
6. Ve a **SQL Editor** y ejecuta:

```sql
INSERT INTO profiles (id, full_name, role, email, is_active)
VALUES (
  'PEGA-AQUI-EL-UUID',
  'Administrador',
  'Administrador',
  'admin@ejemplo.com',
  true
);
```

**Opción B: Vía SQL Directo**

```sql
-- Primero crea el usuario en auth
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin@ejemplo.com',
  crypt('TuContraseñaSegura', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
)
RETURNING id;

-- Luego crea el perfil (usa el ID retornado arriba)
INSERT INTO profiles (id, full_name, role, email, is_active)
VALUES (
  'EL-ID-QUE-SE-RETORNO',
  'Administrador',
  'Administrador',
  'admin@ejemplo.com',
  true
);
```

### 8. Iniciar Sesión

1. Ve a [http://localhost:3000/login](http://localhost:3000/login)
2. Ingresa el email y contraseña del administrador
3. ¡Listo! Deberíasver el dashboard

---

## 🚀 Despliegue a Producción

### Opción 1: Vercel (Recomendado)

1. **Instala Vercel CLI** (opcional):
   ```bash
   npm i -g vercel
   ```

2. **Conecta tu repositorio**:
   - Ve a [https://vercel.com](https://vercel.com)
   - Click en **Add New** → **Project**
   - Importa tu repositorio de GitHub

3. **Configura las variables de entorno**:
   - En la configuración del proyecto en Vercel
   - Agrega las mismas variables de `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

4. **Deploy**:
   - Vercel detectará automáticamente Next.js
   - Click en **Deploy**
   - Espera a que el build termine

### Opción 2: Build Manual

```bash
# 1. Crear build de producción
npm run build

# 2. Iniciar servidor de producción
npm start
```

---

## 📊 Configuración Inicial del Sistema

Una vez que hayas iniciado sesión como administrador:

### 1. Configurar Estados Adicionales

Ve a **Administración** → **Estados**:
- Ya tienes 3 estados base (Pendiente Ingeniería, Pendiente Postventa, Finalizado)
- Puedes agregar más si es necesario

### 2. Configurar Aplicaciones

Ve a **Administración** → **Aplicaciones**:
- Ya tienes SFL, SCA, PrintLink
- Edita los colores si quieres
- Agrega más aplicaciones si es necesario

### 3. Agregar Categorías

**PENDIENTE**: Crear la página de categorías
- Mientras tanto, agrega en SQL:

```sql
INSERT INTO categories (name, description) VALUES
  ('Bug', 'Error en el sistema'),
  ('Feature', 'Nueva funcionalidad'),
  ('Mejora', 'Optimización');
```

### 4. Crear Tipos de Caso/Prueba

**PENDIENTE**: Crear las páginas de tipos
- Mientras tanto, agrega en SQL:

```sql
INSERT INTO case_types (name, description) VALUES
  ('Incidencia', 'Problema reportado'),
  ('Desarrollo', 'Nuevo desarrollo');

INSERT INTO test_types (name, description) VALUES
  ('Funcional', 'Prueba de funcionalidad'),
  ('Regresión', 'Prueba de regresión');
```

### 5. Crear Usuarios Adicionales

**PENDIENTE**: Interface de gestión de usuarios
- Mientras tanto, usa Supabase Dashboard como en el paso 7 arriba
- Asigna roles: `Administrador`, `Postventa`, o `Consulta`

---

## 🔒 Seguridad

### Variables de Entorno

- ✅ Nunca subas `.env.local` a Git
- ✅ `.env.local` ya está en `.gitignore`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` es secreto, solo para servidor

### Supabase Storage (Para archivos)

**Pendiente de configurar**:

1. En Supabase, ve a **Storage**
2. Crea un bucket llamado `attachments`
3. Configura políticas RLS:

```sql
-- Permitir subida solo a usuarios autenticados con permisos
CREATE POLICY "Users can upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('Administrador', 'Postventa')
    )
  );

-- Todos pueden ver adjuntos
CREATE POLICY "Anyone can view attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');
```

---

## 🐛 Solución de Problemas

### Error: "supabaseUrl is required"

- ✅ Verifica que `.env.local` existe
- ✅ Verifica que las variables están correctamente nombradas
- ✅ Reinicia el servidor de desarrollo (`npm run dev`)

### Error de autenticación

- ✅ Verifica que el usuario existe en Supabase Dashboard
- ✅ Verifica que existe un registro en la tabla `profiles`
- ✅ Verifica que `is_active = true` en profiles

### Build falla

- ✅ El proyecto está configurado para hacer build sin variables de entorno
- ✅ Si falla, verifica que no hay errores de TypeScript

### No aparecen datos

- ✅ Abre la consola del navegador (F12)
- ✅ Ve a Network para ver las requests de Supabase
- ✅ Verifica que las RLS policies permiten el acceso

---

## 📞 Soporte

Para más ayuda:
1. Revisa la documentación de [Next.js](https://nextjs.org/docs)
2. Revisa la documentación de [Supabase](https://supabase.com/docs)
3. Contacta al equipo de desarrollo

---

**¡Listo! Tu sistema de gestión está configurado y funcionando.** 🎉
