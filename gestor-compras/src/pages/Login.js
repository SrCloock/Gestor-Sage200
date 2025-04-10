import React, { useState } from 'react';
import { useStore } from '../context';
import { useNavigate } from 'react-router-dom';
import '../styles/login.css';

const Login = () => {
  const { login } = useStore();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    UsuarioLogicNet: '',
    password: '',
    CodigoCliente: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const success = await login(credentials);
      if (success) {
        navigate('/');
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Iniciar Sesión</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="CodigoCliente">Código de Cliente</label>
            <input
              type="text"
              id="CodigoCliente"
              name="CodigoCliente"
              value={credentials.CodigoCliente}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="UsuarioLogicNet">Usuario</label>
            <input
              type="text"
              id="UsuarioLogicNet"
              name="UsuarioLogicNet"
              value={credentials.UsuarioLogicNet}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;