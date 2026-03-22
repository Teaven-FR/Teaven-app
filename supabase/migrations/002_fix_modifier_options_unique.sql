-- Fix: modifier_options doit permettre plusieurs groupes partageant le même modifier Square
-- Supprime la contrainte UNIQUE sur square_modifier_id
-- Ajoute une contrainte composite UNIQUE sur (group_id, square_modifier_id)

ALTER TABLE modifier_options
  DROP CONSTRAINT IF EXISTS modifier_options_square_modifier_id_key;

ALTER TABLE modifier_options
  ADD CONSTRAINT modifier_options_group_modifier_unique
    UNIQUE (group_id, square_modifier_id);
