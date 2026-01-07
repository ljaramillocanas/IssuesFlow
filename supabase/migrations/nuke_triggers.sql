-- Nuke all triggers on solutions to ensure no legacy trigger is running
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'solutions'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || t_name || ' ON solutions CASCADE';
    END LOOP;
END $$;

-- Re-apply ONLY our safe trigger
CREATE TRIGGER on_solutions_change
    AFTER INSERT OR UPDATE OR DELETE ON solutions
    FOR EACH ROW EXECUTE FUNCTION audit_changes_safe();
