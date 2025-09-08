import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
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
    setLoading(true);
    
    if (!username || !password) {
      setError('Por favor complete todos los campos');
      setLoading(false);
      return;
    }

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
    setLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="lg-container">
      <div className="lg-background">
        <div className="lg-background-shapes">
          <div className="lg-shape lg-shape-1"></div>
          <div className="lg-shape lg-shape-2"></div>
          <div className="lg-shape lg-shape-3"></div>
        </div>
      </div>

      <div className="lg-content">
        <div className="lg-branding">
          <div className="lg-logo-container">
            <div className="lg-logo">
              <span className="lg-logo-text">GP</span>
            </div>
          </div>
          <h1 className="lg-app-name">Gestor de Pedidos</h1>
          <p className="lg-integration-text">Sistema integrado con Sage200</p>
        </div>
        
        <form className="lg-form" onSubmit={handleSubmit}>
          <div className="lg-form-header">
            <h2 className="lg-form-title">Iniciar Sesión</h2>
            <p className="lg-form-subtitle">Acceda a su cuenta para continuar</p>
          </div>
          
          {error && (
            <div className="lg-error">
              <div className="lg-error-icon">!</div>
              <p>{error}</p>
            </div>
          )}

          <div className="lg-input-group">
            <label htmlFor="username" className="lg-label">Usuario</label>
            <div className="lg-input-container">
              <FaUser className="lg-input-icon" />
              <input
                id="username"
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="lg-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="lg-input-group">
            <label htmlFor="password" className="lg-label">Contraseña</label>
            <div className="lg-input-container">
              <FaLock className="lg-input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="lg-input"
                disabled={loading}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="lg-password-toggle"
                disabled={loading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="lg-remember-forgot">
            <label className="lg-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="lg-checkbox"
                disabled={loading}
              />
              <span className="lg-checkbox-custom"></span>
              Recordar usuario
            </label>
            
            <button type="button" className="lg-forgot-password">
              ¿Olvidó su contraseña?
            </button>
          </div>

          <button 
            type="submit" 
            className="lg-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="lg-button-spinner"></div>
                Iniciando sesión...
              </>
            ) : (
              'Acceder al sistema'
            )}
          </button>

          <div className="lg-footer">
            <p className="lg-footer-text">
              ¿Necesita ayuda? <a href="#" className="lg-footer-link">Contacte con soporte</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;