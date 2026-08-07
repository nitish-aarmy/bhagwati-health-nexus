-- Allow hospital admins to manage user roles from the Administration module.
CREATE POLICY "user_roles_admin_insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_update" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_delete" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow patients to create exactly their own patient profile row.
CREATE POLICY "patients_insert_own" ON public.patients
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow patients to request their own appointments via portal.
CREATE POLICY "appointments_insert_own" ON public.appointments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = appointments.patient_id
      AND p.user_id = auth.uid()
  )
);
