-- Corregir recursión infinita en policies de profiles
-- Usar is_admin() (SECURITY DEFINER) en vez de sub-query directo

DROP POLICY "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles" ON public.profiles
  FOR UPDATE USING (public.is_admin());
