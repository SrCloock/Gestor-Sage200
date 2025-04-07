const { sage200Pool } = require('../config/sage200db');
const { pool: mysqlPool } = require('../config/localDb');

exports.createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    
    // 1. Registrar en MySQL (historial)
    const [mysqlResult] = await mysqlPool.query(
      'INSERT INTO orders (user_id, total, date) VALUES (?, ?, NOW())',
      [req.user?.id || 1, items.reduce((sum, item) => sum + item.Precio, 0)]
    );

    // 2. Registrar en Sage200 (opcional)
    // Aquí iría la lógica para crear el pedido en Sage200

    res.json({
      success: true,
      orderId: mysqlResult.insertId
    });
  } catch (err) {
    console.error('Error al crear pedido:', err);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const [orders] = await mysqlPool.query(
      'SELECT * FROM orders WHERE user_id = ?',
      [req.user?.id || 1]
    );
    res.json(orders);
  } catch (err) {
    console.error('Error al obtener pedidos:', err);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

// Función para insertar un pedido
const insertOrder = async (req, res) => {
  const pedido = req.body;

  try {
    const request = pool.request();

    request.input('CodigoEmpresa', pedido.CodigoEmpresa);
    request.input('EjercicioPedido', pedido.EjercicioPedido);
    request.input('SeriePedido', pedido.SeriePedido);
    request.input('NumeroPedido', pedido.NumeroPedido);
    request.input('FechaPedido', pedido.FechaPedido);
    request.input('FechaNecesaria', pedido.FechaNecesaria);
    request.input('CodigoCliente', pedido.CodigoCliente);
    request.input('CifDni', pedido.CifDni);
    request.input('CodigoCadena_', pedido.CodigoCadena_);
    request.input('SiglaNacion', pedido.SiglaNacion);
    request.input('CifEuropeo', pedido.CifEuropeo);
    request.input('RazonSocial', pedido.RazonSocial);
    request.input('RazonSocial2', pedido.RazonSocial2);
    request.input('Nombre', pedido.Nombre);
    request.input('Domicilio', pedido.Domicilio);
    request.input('Domicilio2', pedido.Domicilio2);
    request.input('CodigoPostal', pedido.CodigoPostal);
    request.input('CodigoMunicipio', pedido.CodigoMunicipio);
    request.input('Municipio', pedido.Municipio);
    request.input('ColaMunicipio', pedido.ColaMunicipio);
    request.input('CodigoProvincia', pedido.CodigoProvincia);
    request.input('Provincia', pedido.Provincia);
    request.input('CodigoNacion', pedido.CodigoNacion);
    request.input('Nacion', pedido.Nacion);
    request.input('FormadePago', pedido.FormadePago);
    request.input('DomicilioEnvio', pedido.DomicilioEnvio);
    request.input('DomicilioFactura', pedido.DomicilioFactura);
    request.input('DomicilioRecibo', pedido.DomicilioRecibo);
    request.input('CodigoCanal', pedido.CodigoCanal);
    request.input('CodigoProyecto', pedido.CodigoProyecto);
    request.input('CodigoSeccion', pedido.CodigoSeccion);
    request.input('CodigoContable', pedido.CodigoContable);
    request.input('Estado', pedido.Estado);

    await request.query(`
      INSERT INTO Pedidos (
        CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido, FechaPedido, FechaNecesaria,
        CodigoCliente, CifDni, CodigoCadena_, SiglaNacion, CifEuropeo, RazonSocial, RazonSocial2,
        Nombre, Domicilio, Domicilio2, CodigoPostal, CodigoMunicipio, Municipio, ColaMunicipio,
        CodigoProvincia, Provincia, CodigoNacion, Nacion, FormadePago, DomicilioEnvio, 
        DomicilioFactura, DomicilioRecibo, CodigoCanal, CodigoProyecto, CodigoSeccion, 
        CodigoContable, Estado
      )
      VALUES (
        @CodigoEmpresa, @EjercicioPedido, @SeriePedido, @NumeroPedido, @FechaPedido, @FechaNecesaria,
        @CodigoCliente, @CifDni, @CodigoCadena_, @SiglaNacion, @CifEuropeo, @RazonSocial, @RazonSocial2,
        @Nombre, @Domicilio, @Domicilio2, @CodigoPostal, @CodigoMunicipio, @Municipio, @ColaMunicipio,
        @CodigoProvincia, @Provincia, @CodigoNacion, @Nacion, @FormadePago, @DomicilioEnvio, 
        @DomicilioFactura, @DomicilioRecibo, @CodigoCanal, @CodigoProyecto, @CodigoSeccion, 
        @CodigoContable, @Estado
      )
    `);

    res.status(201).json({ message: 'Pedido insertado correctamente' });
  } catch (err) {
    console.error('❌ Error al insertar pedido:', err);
    res.status(500).json({ error: 'Error al insertar pedido' });
  }
};

module.exports = {
  insertOrder,
};