const express = require('express');
const router = express.Router();
const { getPool } = require('../config/sage200db');

router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const result = await pool.request().query(`
      SELECT 
        AP.*, P.RazonSocial 
      FROM ArticuloProveedor AP
      LEFT JOIN Proveedores P 
      ON AP.CodigoEmpresa = P.CodigoEmpresa AND AP.CodigoProveedor = P.CodigoProveedor
      ORDER BY AP.CodigoEmpresa, AP.CodigoArticulo, AP.CodigoProveedor
    `);

    res.json(result.recordset);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
