-- Recreate the audit trigger function to match standard schema
-- This handles the error "column new_data of relation audit_log does not exist"

CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    new_record jsonb;
    old_record jsonb;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        new_record = null;
        old_record = to_jsonb(OLD);
    ELSIF (TG_OP = 'INSERT') THEN
        new_record = to_jsonb(NEW);
        old_record = null;
    ELSE
        new_record = to_jsonb(NEW);
        old_record = to_jsonb(OLD);
    END IF;

    -- Intentar insertar usando los nombres de columna correctos
    -- Asumimos que la tabla se creó con 'record_id', 'old_record', 'new_record' 
    -- o 'old_data', 'new_data'. 
    -- Al recrear la función, nos aseguramos de usar los nombres que SI existen.
    
    -- OPCION A: Si la tabla tiene 'new_data' y 'old_data' (JSONB)
    -- INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    -- VALUES (TG_TABLE_NAME, NEW.id, TG_OP, old_record, new_record, auth.uid());
    
    -- OPCION B: Si la tabla tiene 'new_record' y 'old_record' (JSONB) - MÁS COMÚN
    INSERT INTO audit_log (table_name, record_id, action, old_record, new_record, changed_by)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id), TG_OP, old_record, new_record, auth.uid());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
