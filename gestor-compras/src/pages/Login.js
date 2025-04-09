import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Reemplazamos useHistory por useNavigate

const Login = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [codigoEmpresa, setCodigoEmpresa] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  
  const navigate = useNavigate(); // Reemplazamos useHistory por useNavigate

  // Cargar código de empresa almacenado al iniciar
  useEffect(() => {
    const empresaGuardada = localStorage.getItem('codigoEmpresa');
    if (empresaGuardada) setCodigoEmpresa(empresaGuardada);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          UsuarioLogicNet: usuario,
          password,
          CodigoCliente: codigoEmpresa,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMensaje('Login exitoso');
        setError('');

        // Guardamos el código de empresa y razón social para futuras sesiones
        localStorage.setItem('codigoEmpresa', codigoEmpresa);
        if (data.razonSocial) {
          setRazonSocial(data.razonSocial);
          localStorage.setItem('razonSocial', data.razonSocial);
        }

        // Redirigir a la página principal o dashboard
        navigate('/dashboard'); // Redirigimos a la ruta correcta
      } else {
        setError(data.message || 'Credenciales incorrectas');
        setMensaje('');
      }
    } catch (error) {
      setError('Hubo un problema al conectarse con el servidor');
      setMensaje('');
    }
  };

  return (
    <div>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Usuario</label>
          <input
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Código de Cliente</label>
          <input
            type="text"
            value={codigoEmpresa}
            onChange={(e) => setCodigoEmpresa(e.target.value)}
            required
          />
        </div>

        <button type="submit">Entrar</button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {mensaje && <p style={{ color: 'green' }}>{mensaje}</p>}
    </div>
  );
};

export default Login;
