const express = require('express');
const { getProducts, getProductById } = require('../controllers/productController');
const { insertOrder, getOrdersByClient } = require('../controllers/orderController');
const { getUserByCodigoCliente, generateNumeroPedido } = require('../controllers/userController'); // Asegurado de que esté importado correctamente
const router = express.Router();

// Ruta para obtener productos con filtros
router.get('/', async (req, res) => {
  try {
    const { filterBy, order } = req.query; // Obtener los filtros de la query
    let products;

    // Filtrar o ordenar productos
    if (filterBy === 'proveedor') {
      products = await getProductsByProveedor(order); // Asegúrate de que esta función exista
    } else if (filterBy === 'nombre') {
      products = await getProductsByName(order); // Asegúrate de que esta función exista
    } else if (order === 'asc') {
      products = await getProductsOrdered('asc'); // Asegúrate de que esta función exista
    } else if (order === 'desc') {
      products = await getProductsOrdered('desc'); // Asegúrate de que esta función exista
    } else {
      products = await getProducts(); // Si no hay filtro, obtener todos los productos
    }

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
});

// Ruta para obtener un producto por su ID
router.get('/:id', getProductById);

// Ruta para insertar un nuevo pedido
router.post('/', async (req, res) => {
  try {
    const { CodigoCliente, items, observaciones } = req.body;

    // Verifica que la función getUserByCodigoCliente esté definida
    const user = await getUserByCodigoCliente(CodigoCliente); // Buscar usuario por código de cliente
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generar ejercicio, serie y número de pedido automáticamente
    const EjercicioPedido = new Date().getFullYear();
    const SeriePedido = 'WEB'; // O alguna lógica para las series
    const NumeroPedido = await generateNumeroPedido(user.CodigoEmpresa); // Asegúrate de que esta función exista

    // Asociar el código de empresa y razón social
    const CodigoEmpresa = user.CodigoEmpresa;
    const RazonSocial = user.RazonSocial;

    // Insertar cabecera de pedido
    const order = await insertOrder({
      CodigoCliente,
      items, // Pasamos los items directamente, ya que los productos son parte de la línea de pedido
      observaciones,
      EjercicioPedido,
      SeriePedido,
      NumeroPedido,
      CodigoEmpresa,
      RazonSocial,
    });

    res.status(201).json({ message: 'Order created successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error });
  }
});

module.exports = router;
