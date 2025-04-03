import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductTable from '../components/ProductTable'; // Componente nuevo para CRUD
import ImageUploader from '../components/ImageUploader'; // Componente nuevo para drag-and-drop
import '../styles/admin.css';

const Admin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // Credenciales hardcodeadas
  const ADMIN_CREDENTIALS = { username: 'admin', password: '1234' };

  useEffect(() => {
    // Verificar credenciales guardadas en localStorage
    const savedCredentials = localStorage.getItem('adminCredentials');
    if (savedCredentials) {
      const { username: savedUser, password: savedPass } = JSON.parse(savedCredentials);
      if (savedUser === ADMIN_CREDENTIALS.username && savedPass === ADMIN_CREDENTIALS.password) {
        setIsLoggedIn(true);
      }
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setIsLoggedIn(true);
      if (rememberMe) {
        localStorage.setItem('adminCredentials', JSON.stringify({ username, password }));
      }
    } else {
      alert('Credenciales incorrectas');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-login">
        <h2>Acceso Administrador</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            Recordar credenciales
          </label>
          <button type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h2>Panel de Administración</h2>
      <button onClick={() => navigate('/')}>Volver al inicio</button>
      
      {/* Componentes para gestión */}
      <ImageUploader />
      <ProductTable />
    </div>
  );
};

export default Admin;