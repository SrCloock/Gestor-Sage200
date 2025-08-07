import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Login.css';
import { FaUser, FaLock } from 'react-icons/fa';
import logo from '../../assets/al-andalus-logo.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="login-container">
      <div className="login-branding">
        <img src={logo} alt="AlAndalus Feeling" className="login-logo" />
        
        <p>Sistema integrado con Sage200</p>
      </div>
      
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Acceso </h2>
        {error && <div className="login-error">{error}</div>}

        <div className="input-group">
          <FaUser className="input-icon" />
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <FaLock className="input-icon" />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="remember-me">
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Recordar usuario</span>
          </label>
        </div>

        <button type="submit" className="login-button">
          Acceder al panel
        </button>
      </form>
    </div>
  );
};

export default Login;