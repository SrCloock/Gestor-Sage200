// backend/routes/admin.js

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const bcrypt = require('bcrypt'); // Para encriptar contraseñas
const jwt = require('jsonwebtoken'); // Para el manejo de tokens JWT

// Configuración de la conexión SQL
const config = require('../config/sage200db'); // Asegúrate de que este archivo esté correctamente configurado

// Ruta de login del administrador (hardcodeada con credenciales en el código)
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validación de credenciales
  if (username === 'admin' && password === '1234') {
    // Crear un token JWT para el administrador
    const token = jwt.sign({ username: 'admin' }, 'secretKey', { expiresIn: '1h' });
    return res.json({ success: true, token });
  } else {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
});

// Ruta para crear un nuevo usuario
router.post('/create-user', async (req, res) => {
  const { username, password, nombre, razonSocial } = req.body;

  // Verificar que el administrador está autenticado (se requiere un token válido)
  const token = req.headers.authorization?.split(' ')[1]; // Obtener el token del encabezado
  if (!token) {
    return res.status(403).json({ error: 'Acceso denegado, se requiere autenticación' });
  }

  try {
    // Verificar el token
    const decoded = jwt.verify(token, 'secretKey');
    if (!decoded || decoded.username !== 'admin') {
      return res.status(403).json({ error: 'Token inválido o sesión expirada' });
    }

    // Conectar a la base de datos SQL
    await sql.connect(config);

    // Verificar si el usuario ya existe
    const result = await sql.query`SELECT * FROM Usuarios WHERE UsuarioLogicNet = ${username}`;
    if (result.recordset.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Encriptar la contraseña antes de almacenarla
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar el nuevo usuario en la base de datos
    await sql.query`
      INSERT INTO Usuarios (UsuarioLogicNet, ContraseñaLogicNet, RazonSocial, Nombre)
      VALUES (${username}, ${hashedPassword}, ${razonSocial}, ${nombre})
    `;

    // Obtener el último código de cliente y generar uno nuevo
    const codigoClienteResult = await sql.query`SELECT MAX(CodigoCliente) AS maxCodigo FROM Usuarios`;
    const nuevoCodigoCliente = parseInt(codigoClienteResult.recordset[0].maxCodigo) + 1;

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      codigoCliente: nuevoCodigoCliente,
    });

  } catch (error) {
    console.error('Error en la creación de usuario:', error);
    res.status(500).json({ error: 'Error al crear el usuario' });
  }
});

module.exports = router;
