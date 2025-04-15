import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [form, setForm] = useState({
    UsuarioLogicNet: '',
    ContraseñaLogicNet: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Cargar credenciales guardadas si existen
  useEffect(() => {
    const savedCredentials = localStorage.getItem('savedCredentials');
    if (savedCredentials) {
      const { UsuarioLogicNet, ContraseñaLogicNet } = JSON.parse(savedCredentials);
      setForm(prev => ({
        ...prev,
        UsuarioLogicNet,
        ContraseñaLogicNet,
        rememberMe: true
      }));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await axios.post('/api/auth/login', {
        UsuarioLogicNet: form.UsuarioLogicNet,
        ContraseñaLogicNet: form.ContraseñaLogicNet
      });

      // Guardar credenciales si el checkbox está marcado
      if (form.rememberMe) {
        localStorage.setItem('savedCredentials', JSON.stringify({
          UsuarioLogicNet: form.UsuarioLogicNet,
          ContraseñaLogicNet: form.ContraseñaLogicNet
        }));
      } else {
        localStorage.removeItem('savedCredentials');
      }

      // Guardar datos de usuario en sessionStorage para que se borre al cerrar el navegador
      sessionStorage.setItem('user', JSON.stringify(response.data));
      navigate('/');
    } catch (err) {
      setError('Credenciales incorrectas. Por favor, intente nuevamente.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem' }}>
      <h2 style={{ textAlign: 'center' }}>Iniciar Sesión</h2>
      
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Usuario:
          </label>
          <input
            type="text"
            value={form.UsuarioLogicNet}
            onChange={(e) => setForm({...form, UsuarioLogicNet: e.target.value})}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Contraseña:
          </label>
          <input
            type="password"
            value={form.ContraseñaLogicNet}
            onChange={(e) => setForm({...form, ContraseñaLogicNet: e.target.value})}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(e) => setForm({...form, rememberMe: e.target.checked})}
            />
            Recordar mis datos
          </label>
        </div>
        
        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
};

export default Login;