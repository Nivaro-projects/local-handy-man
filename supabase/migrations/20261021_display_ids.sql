-- ==============================================================================
-- LOCAL HANDYMAN (CLR SERVICES) - DATABASE MIGRATION
-- Migration: Add Sequential Five-Digit Display IDs for Customers & Technicians
-- Formats: CUS-00001, CUS-00002... and TECH-00001, TECH-00002...
-- ==============================================================================

-- 1. Create independent sequences
CREATE SEQUENCE IF NOT EXISTS public.customer_display_id_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.technician_display_id_seq START 1;

-- 2. Add display_id to public.customers
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE 
  DEFAULT ('CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0'));

-- Safe backfill for existing customers
UPDATE public.customers 
SET display_id = 'CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0')
WHERE display_id IS NULL;

-- Customer display ID protection trigger
CREATE OR REPLACE FUNCTION public.protect_customer_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.display_id IS NOT NULL AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
      NEW.display_id := OLD.display_id; -- Prevent modification
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.display_id IS NULL THEN
      NEW.display_id := 'CUS-' || LPAD(nextval('public.customer_display_id_seq')::TEXT, 5, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_customer_display_id ON public.customers;
CREATE TRIGGER trg_protect_customer_display_id
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_customer_display_id();

-- 3. Add display_id to public.technicians
ALTER TABLE public.technicians 
  ADD COLUMN IF NOT EXISTS display_id TEXT UNIQUE 
  DEFAULT ('TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0'));

-- Safe backfill for existing technicians
UPDATE public.technicians 
SET display_id = 'TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0')
WHERE display_id IS NULL;

-- Technician display ID protection trigger
CREATE OR REPLACE FUNCTION public.protect_technician_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.display_id IS NOT NULL AND NEW.display_id IS DISTINCT FROM OLD.display_id THEN
      NEW.display_id := OLD.display_id; -- Prevent modification
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.display_id IS NULL THEN
      NEW.display_id := 'TECH-' || LPAD(nextval('public.technician_display_id_seq')::TEXT, 5, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_technician_display_id ON public.technicians;
CREATE TRIGGER trg_protect_technician_display_id
  BEFORE INSERT OR UPDATE ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_technician_display_id();

-- 4. Add display columns to public.bookings for clean denormalized presentation
ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS customer_display_id TEXT;

ALTER TABLE public.bookings 
  ADD COLUMN IF NOT EXISTS assigned_technician_display_id TEXT;
