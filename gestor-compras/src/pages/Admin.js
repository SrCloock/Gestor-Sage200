import React, { useState } from 'react';
import { useStore } from '../context';
import { useNavigate } from 'react-router-dom';
import '../styles/admin.css';

const Admin = () => {
  const { adminLogin, user } = useStore();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [newUser, setNewUser] = useState({
    UsuarioLogicNet: '',
    ContraseñaLogicNet: '',
    RazonSocial: '',
    Nombre: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const success = await adminLogin(credentials);
      if (success) {
        navigate('/admin');
      } else {
        setError('Credenciales incorrectas');
      }
    } catch (err) {
      setError('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      // Aquí iría la lógica para crear un nuevo usuario
      // await createUser(newUser);
      setNewUser({
        UsuarioLogicNet: '',
        ContraseñaLogicNet: '',
        RazonSocial: '',
        Nombre: ''
      });
      alert('Usuario creado exitosamente');
    } catch (err) {
      setError('Error al crear el usuario');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h2>Acceso Administrador</h2>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                name="username"
                value={credentials.username}
                onChange={(e) => setCredentials({
                  ...credentials,
                  username: e.target.value
                })}
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
                onChange={(e) => setCredentials({
                  ...credentials,
                  password: e.target.value
                })}
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
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Panel de Administración</h2>
        <button onClick={() => navigate('/')}>Volver al sitio</button>
      </div>
      
      <div className="admin-tabs">
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Usuarios
        </button>
        <button 
          className={activeTab === 'orders' ? 'active' : ''}
          onClick={() => setActiveTab('orders')}
        >
          Pedidos
        </button>
        <button 
          className={activeTab === 'products' ? 'active' : ''}
          onClick={() => setActiveTab('products')}
        >
          Productos
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="users-section">
            <h3>Crear Nuevo Usuario</h3>
            
            <form onSubmit={handleCreateUser} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="UsuarioLogicNet">Usuario</label>
                  <input
                    type="text"
                    id="UsuarioLogicNet"
                    name="UsuarioLogicNet"
                    value={newUser.UsuarioLogicNet}
                    onChange={(e) => setNewUser({
                      ...newUser,
                      UsuarioLogicNet: e.target.value
                    })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="ContraseñaLogicNet">Contraseña</label>
                  <input
                    type="password"
                    id="ContraseñaLogicNet"
                    name="ContraseñaLogicNet"
                    value={newUser.ContraseñaLogicNet}
                    onChange={(e) => setNewUser({
                      ...newUser,
                      ContraseñaLogicNet: e.target.value
                    })}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="RazonSocial">Razón Social</label>
                  <input
                    type="text"
                    id="RazonSocial"
                    name="RazonSocial"
                    value={newUser.RazonSocial}
                    onChange={(e) => setNewUser({
                      ...newUser,
                      RazonSocial: e.target.value
                    })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="Nombre">Nombre</label>
                  <input
                    type="text"
                    id="Nombre"
                    name="Nombre"
                    value={newUser.Nombre}
                    onChange={(e) => setNewUser({
                      ...newUser,
                      Nombre: e.target.value
                    })}
                    required
                  />
                </div>
              </div>
              
              <button type="submit" disabled={isLoading}>
                {isLoading ? 'Creando usuario...' : 'Crear Usuario'}
              </button>
            </form>
          </div>
        )}
        
        {activeTab === 'orders' && (
          <div className="orders-section">
            <h3>Gestión de Pedidos</h3>
            <p>Funcionalidad en desarrollo...</p>
          </div>
        )}
        
        {activeTab === 'products' && (
          <div className="products-section">
            <h3>Gestión de Productos</h3>
            <p>Funcionalidad en desarrollo...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;