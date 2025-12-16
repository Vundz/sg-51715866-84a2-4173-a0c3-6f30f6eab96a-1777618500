-- Drop all BOM-related tables in reverse order of dependencies
DROP TABLE IF EXISTS bom_template_items CASCADE;
DROP TABLE IF EXISTS bom_seed_costs CASCADE;
DROP TABLE IF EXISTS bom_templates CASCADE;
DROP TABLE IF EXISTS bom_settings CASCADE;