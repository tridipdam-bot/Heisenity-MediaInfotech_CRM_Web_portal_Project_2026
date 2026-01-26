-- Add test product and barcodes for scanner testing

-- First, insert a test product
INSERT INTO products (sku, product_name, description, box_qty, total_units, reorder_threshold, is_active, created_at, updated_at)
VALUES 
  ('TEST-SCANNER-001', 'Test Scanner Product', 'Product for testing barcode scanner', 1, 100, 10, true, NOW(), NOW())
ON CONFLICT (sku) DO NOTHING;

-- Get the product ID (this will work in most SQL databases)
-- Insert test barcodes with common barcode values
INSERT INTO barcodes (barcode_value, serial_number, box_qty, status, product_id, created_at)
SELECT 
  '21141287', 'SN-21141287', 1, 'AVAILABLE', p.id, NOW()
FROM products p 
WHERE p.sku = 'TEST-SCANNER-001'
ON CONFLICT (barcode_value) DO NOTHING;

INSERT INTO barcodes (barcode_value, serial_number, box_qty, status, product_id, created_at)
SELECT 
  '1234567890123', 'SN-1234567890123', 5, 'AVAILABLE', p.id, NOW()
FROM products p 
WHERE p.sku = 'TEST-SCANNER-001'
ON CONFLICT (barcode_value) DO NOTHING;

INSERT INTO barcodes (barcode_value, serial_number, box_qty, status, product_id, created_at)
SELECT 
  '9876543210987', 'SN-9876543210987', 10, 'AVAILABLE', p.id, NOW()
FROM products p 
WHERE p.sku = 'TEST-SCANNER-001'
ON CONFLICT (barcode_value) DO NOTHING;

INSERT INTO barcodes (barcode_value, serial_number, box_qty, status, product_id, created_at)
SELECT 
  '5555555555555', 'SN-5555555555555', 2, 'AVAILABLE', p.id, NOW()
FROM products p 
WHERE p.sku = 'TEST-SCANNER-001'
ON CONFLICT (barcode_value) DO NOTHING;

-- Verify the data was inserted
SELECT 
  b.barcode_value,
  b.serial_number,
  b.box_qty,
  b.status,
  p.product_name,
  p.sku
FROM barcodes b
JOIN products p ON b.product_id = p.id
WHERE p.sku = 'TEST-SCANNER-001';