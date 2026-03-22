-- Fix: modifier_groups doit permettre plusieurs produits partageant la même modifier list Square
-- Supprime la contrainte UNIQUE sur square_modifier_list_id
-- Ajoute une contrainte composite UNIQUE sur (product_id, square_modifier_list_id)

ALTER TABLE modifier_groups
  DROP CONSTRAINT IF EXISTS modifier_groups_square_modifier_list_id_key;

ALTER TABLE modifier_groups
  ADD CONSTRAINT modifier_groups_product_modifier_unique
    UNIQUE (product_id, square_modifier_list_id);
