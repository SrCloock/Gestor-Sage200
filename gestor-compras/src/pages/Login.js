import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      if (rememberMe) {
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberedUsername');
      }
      navigate('/');
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="lg-container">
      <div className="lg-branding">
        <div className="lg-logo-container">
          <div className="lg-logo">AF</div>
        </div>
        <h1 className="lg-app-name">Gestor de Pedidos</h1>
        <p className="lg-integration-text">Sistema integrado con Sage200</p>
      </div>
      
      <form className="lg-form" onSubmit={handleSubmit}>
        <h2 className="lg-form-title">Acceso al sistema</h2>
        
        {error && (
          <div className="lg-error">
            <div className="lg-error-icon">!</div>
            <p>{error}</p>
          </div>
        )}

        <div className="lg-input-group">
          <label htmlFor="username" className="lg-label">Usuario</label>
          <input
            id="username"
            type="text"
            placeholder="Ingrese su usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="lg-input"
          />
          <span className="lg-input-icon">👤</span>
        </div>

        <div className="lg-input-group">
          <label htmlFor="password" className="lg-label">Contraseña</label>
          <input
            id="password"
            type="password"
            placeholder="Ingrese su contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="lg-input"
          />
          <span className="lg-input-icon">🔒</span>
        </div>

        <div className="lg-remember-me">
          <label className="lg-checkbox-label">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="lg-checkbox"
            />
            <span className="lg-checkbox-custom"></span>
            Recordar usuario
          </label>
        </div>

        <button 
          type="submit" 
          className="lg-button"
          disabled={loading}
        >
          {loading ? 'Iniciando sesión...' : 'Acceder al panel'}
        </button>
      </form>
    </div>
  );
};

export default Login;