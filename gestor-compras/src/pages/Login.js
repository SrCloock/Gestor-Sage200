import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Reemplazamos useHistory por useNavigate
import { loginUser } from '../services/api';

const Login = () => {
  const [credentials, setCredentials] = useState({
    usuarioLogicNet: '',
    password: '',
    codigoCliente: '',
  });

  const navigate = useNavigate(); // Reemplazamos useHistory por useNavigate

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await loginUser(credentials);
      sessionStorage.setItem('user', JSON.stringify(user));
      navigate('/home'); // Usamos navigate para redirigir
    } catch (error) {
      alert('Credenciales incorrectas');
    }
  };

  return (
    <div>
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Usuario:</label>
          <input
            type="text"
            name="usuarioLogicNet"
            value={credentials.usuarioLogicNet}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Contraseña:</label>
          <input
            type="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Código Cliente:</label>
          <input
            type="text"
            name="codigoCliente"
            value={credentials.codigoCliente}
            onChange={handleChange}
          />
        </div>
        <button type="submit">Iniciar Sesión</button>
      </form>
    </div>
  );
};

export default Login;
