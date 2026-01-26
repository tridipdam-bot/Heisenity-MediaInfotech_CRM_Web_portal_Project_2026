import { Router } from 'express';
import { generateLabels, createProduct, getProducts, getProduct, updateProduct, deleteProduct, getBarcodeHistory, getBarcodePrefixes, addBarcodePrefix, lookupBarcode, createInventoryTransaction, getInventoryTransactions } from './product.controller';

const router = Router();

// Barcode prefix management routes (specific routes first)
router.get('/barcode-prefixes/list', getBarcodePrefixes);
router.post('/barcode-prefixes/add', addBarcodePrefix);

// Barcode lookup route for scanner
router.get('/barcode/:barcodeValue', lookupBarcode);

// Inventory transaction routes (specific routes first)
router.post('/transactions', createInventoryTransaction);
router.get('/transactions', getInventoryTransactions);

// Barcode history route (specific routes first)
router.get('/:productId/barcode-history', getBarcodeHistory);

// Label generation route (specific routes first)
router.post('/:productId/generate-labels', generateLabels);

// Product CRUD routes (generic routes last)
router.post('/', createProduct);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;