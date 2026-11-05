DROP FUNCTION IF EXISTS public.create_admin_profile(uuid, text, text);

CREATE OR REPLACE FUNCTION public.create_admin_profile(
    p_user_id uuid,
    p_display_name text,
    p_pin_hash text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
    INSERT INTO public.profiles (
        id, display_name, role, pin_hash, is_active
    )
    VALUES (
        p_user_id, p_display_name, 'admin', p_pin_hash, true
    )
    ON CONFLICT (id)
    DO UPDATE SET
        display_name = EXCLUDED.display_name,
        role = 'admin',
        pin_hash = EXCLUDED.pin_hash,
        is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.create_admin_profile(uuid, text, text)
TO service_role;
