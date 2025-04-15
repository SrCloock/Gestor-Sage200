const authenticate = (req, res, next) => {
    const sessionToken = req.headers['authorization'];
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }
  
    // Verificar la sesión en tu sistema (aquí sería tu lógica alternativa a JWT)
    if (sessionToken !== `Basic ${process.env.ADMIN_TOKEN}`) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  
    next();
  };
  
  module.exports = authenticate;