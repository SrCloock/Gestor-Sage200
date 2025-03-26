const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar solo las rutas que existen
try {
  const productsRouter = require('./routes/products');
  app.use('/api/products', productsRouter);
  
  // Verificar si existen otros routers antes de usarlos
  try {
    const ordersRouter = require('./routes/orders');
    app.use('/api/orders', ordersRouter);
  } catch (e) {
    console.warn('ordersRouter no disponible:', e.message);
  }

  try {
    const imagesRouter = require('./routes/images');
    app.use('/api/images', imagesRouter);
  } catch (e) {
    console.warn('imagesRouter no disponible:', e.message);
  }

  try {
    const adminRouter = require('./routes/admin');
    app.use('/api/admin', adminRouter);
  } catch (e) {
    console.warn('adminRouter no disponible:', e.message);
  }

} catch (e) {
  console.error('Error cargando routers:', e);
  process.exit(1);
}

// Ruta de prueba básica
app.get('/', (req, res) => {
  res.send('API del Gestor de Compras funcionando');
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error del servidor');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});