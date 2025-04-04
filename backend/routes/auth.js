const express = require('express');
const { validateSageUser, validateHardcodedAdmin } = require('../controllers/authController');
const router = express.Router();

router.post('/login', async (req, res, next) => {
  const { username, password, isAdmin } = req.body;

  try {
    let user;
    if (isAdmin) {
      user = validateHardcodedAdmin(username, password);
    } else {
      user = await validateSageUser(username, password);
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Simular token JWT (en producción, usa jsonwebtoken)
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    res.json({ 
      success: true, 
      token,
      user: { id: user.Codigo || user.id, name: user.Nombre || user.name }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;