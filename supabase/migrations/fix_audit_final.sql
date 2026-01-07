-- Solución Definitiva para el error de auditoría
-- Esta migración asegura que la tabla audit_log tenga las columnas esperadas y actualiza el trigger

-- 1. Asegurar que existan las columnas estándar en audit_log
-- Si la tabla usaba otros nombres, ahora tendrá estos también para compatibilidad
DO $$
BEGIN
    -- Intentar agregar new_record si no existe
    BEGIN
        ALTER TABLE audit_log ADD COLUMN new_record JSONB;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    -- Intentar agregar old_record si no existe
    BEGIN
        ALTER TABLE audit_log ADD COLUMN old_record JSONB;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- 2. Crear una función de auditoría segura que use explícitamente estas columnas
CREATE OR REPLACE FUNCTION audit_changes_safe()
RETURNS TRIGGER AS $$
DECLARE
    final_new_record jsonb;
    final_old_record jsonb;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        final_new_record = null;
        final_old_record = to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        final_new_record = to_jsonb(NEW);
        final_old_record = null;
    ELSE
        final_new_record = to_jsonb(NEW);
        final_old_record = to_jsonb(OLD);
    END IF;

    -- Insertar usando las columnas que ACABAMOS de asegurar que existen
    INSERT INTO audit_log (table_name, record_id, action, old_record, new_record, changed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, final_old_record, final_new_record, auth.uid());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reemplazar el trigger en la tabla solutions para usar esta nueva función segura
DROP TRIGGER IF EXISTS on_solutions_change ON solutions;
CREATE TRIGGER on_solutions_change
    AFTER INSERT OR UPDATE OR DELETE ON solutions
    FOR EACH ROW EXECUTE FUNCTION audit_changes_safe();
