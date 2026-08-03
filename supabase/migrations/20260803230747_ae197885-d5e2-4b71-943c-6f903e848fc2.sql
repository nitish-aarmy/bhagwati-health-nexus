CREATE TYPE public.enquiry_status AS ENUM ('new','contacted','converted','closed');

CREATE TABLE public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text,
  department text,
  preferred_date date,
  message text,
  source text NOT NULL DEFAULT 'website',
  status public.enquiry_status NOT NULL DEFAULT 'new',
  staff_notes text,
  handled_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.enquiries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enquiries TO authenticated;
GRANT ALL ON public.enquiries TO service_role;

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY enquiries_public_insert ON public.enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY enquiries_staff_select ON public.enquiries
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE POLICY enquiries_staff_update ON public.enquiries
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY enquiries_staff_delete ON public.enquiries
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER enquiries_updated_at BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY patients_self_register ON public.patients
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY patients_update_own ON public.patients
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());