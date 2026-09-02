-- New patient registrations use the compact BH510001 sequence.
ALTER SEQUENCE public.uhid_seq RESTART WITH 510001;

ALTER TABLE public.patients
  ALTER COLUMN uhid SET DEFAULT ('BH' || lpad(nextval('public.uhid_seq')::text, 6, '0'));