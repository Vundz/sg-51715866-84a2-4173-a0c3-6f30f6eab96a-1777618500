-- Add profit analysis fields to bom_templates table
ALTER TABLE bom_templates 
ADD COLUMN IF NOT EXISTS target_selling_price DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS estimated_success_rate DECIMAL(5,2) DEFAULT 95.00;

-- Add comment to document the fields
COMMENT ON COLUMN bom_templates.target_selling_price IS 'Target selling price per seedling in ZMW';
COMMENT ON COLUMN bom_templates.estimated_success_rate IS 'Expected success rate as percentage (e.g., 95.00 for 95%)';