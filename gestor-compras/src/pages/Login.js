import React, { useState } from 'react';

const Login = () => {
  const [codigoCliente, setCodigoCliente] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoCliente, contraseña }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error en login');
        return;
      }

      console.log('Usuario autenticado:', data.user);
      alert('Bienvenido, ' + data.user.RazonSocial);
      // Puedes guardar el usuario en localStorage o contexto
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Iniciar sesión</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Código de Cliente"
          value={codigoCliente}
          onChange={(e) => setCodigoCliente(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={contraseña}
          onChange={(e) => setContraseña(e.target.value)}
          required
        />
        <button type="submit">Entrar</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
};

export default Login;
