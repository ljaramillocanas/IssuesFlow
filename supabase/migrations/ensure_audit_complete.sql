-- 1. Asegurar la tabla base
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY
);

-- 2. Agregar columnas faltantes de forma segura (idempotente)
DO $$
BEGIN
    -- table_name
    BEGIN
        ALTER TABLE audit_log ADD COLUMN table_name TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- record_id
    BEGIN
        ALTER TABLE audit_log ADD COLUMN record_id TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- action
    BEGIN
        ALTER TABLE audit_log ADD COLUMN action TEXT;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- old_record
    BEGIN
        ALTER TABLE audit_log ADD COLUMN old_record JSONB;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- new_record
    BEGIN
        ALTER TABLE audit_log ADD COLUMN new_record JSONB;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- changed_by
    BEGIN
        ALTER TABLE audit_log ADD COLUMN changed_by UUID REFERENCES auth.users(id);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    -- created_at (El culpable del error anterior)
    BEGIN
        ALTER TABLE audit_log ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 3. Habilitar RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 4. Limpiar políticas antiguas (por si acaso están rotas)
DROP POLICY IF EXISTS "Enable read access for all users" ON audit_log;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON audit_log;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON audit_log;
DROP POLICY IF EXISTS "lectura_admin_postventa" ON audit_log;

-- 5. Crear políticas frescas
CREATE POLICY "Enable read access for authenticated users"
ON audit_log FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON audit_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Indices (IF NOT EXISTS ya es seguro)
CREATE INDEX IF NOT EXISTS audit_log_table_record_idx ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_changed_by_idx ON audit_log(changed_by);
