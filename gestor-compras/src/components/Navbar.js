import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav style={{
      background: '#333',
      color: 'white',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', marginRight: '1rem' }}>
          Inicio
        </Link>
        <Link to="/perfil" style={{ color: 'white', textDecoration: 'none' }}>
          Perfil
        </Link>
      </div>

      <div>
        <span style={{ marginRight: '1rem' }}>{user.Nombre}</span>
        <button onClick={handleLogout} style={{
          background: 'red',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          cursor: 'pointer',
          borderRadius: '4px'
        }}>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
