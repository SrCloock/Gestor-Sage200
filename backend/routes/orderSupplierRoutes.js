const express = require('express');
const router = express.Router();
const { 
  createSupplierOrder, 
  getSupplierOrders, 
  getSupplierOrdersDetails 
} = require('../controllers/supplierOrderController');

// Configurar CORS para todas las rutas de supplierOrders
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  next();
});

// Rutas para pedidos a proveedores
router.post('/', createSupplierOrder);
router.get('/', getSupplierOrders);
router.get('/:numeroPedido', getSupplierOrdersDetails);

module.exports = router;