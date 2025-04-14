import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '1rem',
      background: '#333',
      color: 'white'
    }}>
      <div>
        <Link to="/" style={{ color: 'white', marginRight: '1rem' }}>Inicio</Link>
        <Link to="/catalog" style={{ color: 'white', marginRight: '1rem' }}>Catálogo</Link>
        {user && (
          <Link to="/history" style={{ color: 'white' }}>Mis Pedidos</Link>
        )}
      </div>
      
      {user ? (
        <div>
          <span style={{ marginRight: '1rem' }}>{user.RazonSocial}</span>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      ) : (
        <Link to="/login" style={{ color: 'white' }}>Login</Link>
      )}
    </nav>
  );
};

export default Navbar;