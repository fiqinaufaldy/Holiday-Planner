CREATE OR REPLACE FUNCTION public.create_admin_profile(
    p_user_id uuid,
    p_display_name text,
    p_pin text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    INSERT INTO public.profiles (id, display_name, role, pin_hash, is_active)
    VALUES (p_user_id, p_display_name, 'admin', extensions.crypt(p_pin, extensions.gen_salt('bf')), true)
    ON CONFLICT (id) DO UPDATE
    SET display_name=EXCLUDED.display_name,
        role='admin',
        pin_hash=EXCLUDED.pin_hash,
        is_active=true;
$$;

REVOKE ALL ON FUNCTION public.create_admin_profile(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_admin_profile(uuid, text, text) TO service_role;
