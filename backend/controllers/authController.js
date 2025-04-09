const { pool } = require('../config/sage200db');

// Función para generar el próximo número de pedido automáticamente por empresa
const generarNumeroPedido = async (CodigoEmpresa) => {
  try {
    const request = pool.request();
    request.input('CodigoEmpresa', CodigoEmpresa);

    // Consultamos el último número de pedido generado para la empresa
    const result = await request.query(`
      SELECT TOP 1 NumeroPedido
      FROM CabeceraPedidoCliente
      WHERE CodigoEmpresa = @CodigoEmpresa
      ORDER BY NumeroPedido DESC
    `);

    if (result.recordset.length === 0) {
      return 1; // Si no hay pedidos previos, comenzamos con el 0001
    }

    const ultimoNumeroPedido = result.recordset[0].NumeroPedido;
    return parseInt(ultimoNumeroPedido) + 1; // Incrementamos el número de pedido
  } catch (error) {
    console.error('Error al generar el número de pedido:', error);
    throw new Error('Error al generar el número de pedido.');
  }
};

const login = async (req, res) => {
  const { UsuarioLogicNet, password, CodigoCliente } = req.body;

  // Validaciones básicas
  if (!UsuarioLogicNet || !password || !CodigoCliente) {
    return res.status(400).json({
      message: 'Usuario, contraseña y código de cliente son requeridos.'
    });
  }

  try {
    const request = pool.request();
    request.input('UsuarioLogicNet', UsuarioLogicNet);
    request.input('password', password);
    request.input('CodigoCliente', CodigoCliente);

    // Consulta SQL para validar al usuario
    const result = await request.query(`
      SELECT 
        CodigoCliente,
        CodigoEmpresa,
        RazonSocial,
        Nombre,
        UsuarioLogicNet
      FROM CLIENTES
      WHERE UsuarioLogicNet = @UsuarioLogicNet
        AND ContraseñaLogicNet = @password
        AND CodigoCliente = @CodigoCliente
        AND CODIGOCATEGORIACLIENTE_ = 'EMP'
    `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }

    const usuario = result.recordset[0];

    // Concatenar para mostrar tipo: "Empresa - Juan Jesus"
    const nombreUsuario = `${usuario.RazonSocial} - ${usuario.Nombre}`;

    // Generamos el número de pedido automáticamente
    const numeroPedido = await generarNumeroPedido(usuario.CodigoEmpresa);

    // Devolver datos de sesión y detalles adicionales
    res.status(200).json({
      message: 'Login exitoso',
      usuario: {
        CodigoCliente: usuario.CodigoCliente,
        CodigoEmpresa: usuario.CodigoEmpresa,
        UsuarioLogicNet: usuario.UsuarioLogicNet,
        NombreUsuario: nombreUsuario,
        RazonSocial: usuario.RazonSocial,
        NumeroPedido: numeroPedido.toString().padStart(4, '0'), // Formateamos el número de pedido como 0001, 0002, ...
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error al intentar iniciar sesión.' });
  }
};

module.exports = { login };
