import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [form, setForm] = useState({
    UsuarioLogicNet: '',
    ContraseñaLogicNet: '',
    CodigoCliente: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await axios.post('/api/auth/login', form);
      localStorage.setItem('user', JSON.stringify(response.data));
      navigate('/');
    } catch (err) {
      setError('Credenciales incorrectas. Por favor, intente nuevamente.');
    }
  };

  return (
    <div style={{ 
      maxWidth: '400px', 
      margin: '2rem auto',
      padding: '1rem',
      border: '1px solid #ddd',
      borderRadius: '5px'
    }}>
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
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Código de Cliente:
          </label>
          <input
            type="text"
            value={form.CodigoCliente}
            onChange={(e) => setForm({...form, CodigoCliente: e.target.value})}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
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