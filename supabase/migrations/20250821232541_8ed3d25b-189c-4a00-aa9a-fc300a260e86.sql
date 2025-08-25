-- Add locked column to layers table for layer locking feature
ALTER TABLE public.layers 
ADD COLUMN locked BOOLEAN NOT NULL DEFAULT false;