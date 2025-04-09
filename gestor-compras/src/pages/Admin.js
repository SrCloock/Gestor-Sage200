import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/admin.css';
import axios from 'axios'; // Para hacer las peticiones al backend

const Admin = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [images, setImages] = useState([]);
  const [userData, setUserData] = useState(null); // Datos del usuario logueado
  const [newUser, setNewUser] = useState({ username: '', password: '', razonSocial: '', codigoEmpresa: '' }); // Datos del nuevo usuario

  // Obtener las credenciales guardadas si existen
  useEffect(() => {
    const storedCredentials = JSON.parse(localStorage.getItem('adminCredentials'));
    if (storedCredentials) {
      setCredentials(storedCredentials);
      setRememberMe(true);
    }
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: 'image/*',
    onDrop: (acceptedFiles) => {
      const newImages = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setImages([...images, ...newImages]);
      toast.success(`${acceptedFiles.length} imágenes añadidas`);
    }
  });

  // Función de login (con credenciales hardcodeadas)
  const handleLogin = async (e) => {
    e.preventDefault();

    const hardcodedCredentials = {
      username: 'admin',
      password: 'admin123'
    };

    if (credentials.username === hardcodedCredentials.username && credentials.password === hardcodedCredentials.password) {
      setLoggedIn(true);
      setUserData({ razonSocial: 'Empresa Admin', codigoEmpresa: '12345', nombre: 'Administrador' });
      toast.success('Bienvenido, Admin');
      if (rememberMe) {
        localStorage.setItem('adminCredentials', JSON.stringify(credentials));
      }
    } else {
      toast.error('Credenciales incorrectas');
    }
  };

  // Función para crear un nuevo usuario
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:5000/api/users/create', newUser); // Endpoint del backend para crear un nuevo usuario
      if (response.data.success) {
        toast.success('Nuevo usuario creado con éxito');
        setNewUser({ username: '', password: '', razonSocial: '', codigoEmpresa: '' }); // Limpiar formulario
      } else {
        toast.error('Hubo un error al crear el nuevo usuario');
      }
    } catch (error) {
      toast.error('Error en la creación del usuario');
    }
  };

  // Si el admin está logueado, se muestra el dashboard
  if (loggedIn) {
    return (
      <div className="admin-dashboard">
        <h2>Panel de Administración</h2>
        <div>
          <h3>Datos del Usuario</h3>
          <p><strong>Razón Social:</strong> {userData?.razonSocial}</p>
          <p><strong>Código Empresa:</strong> {userData?.codigoEmpresa}</p>
          <p><strong>Nombre del Usuario:</strong> {userData?.nombre}</p>
        </div>
        <div {...getRootProps({ className: 'dropzone' })}>
          <input {...getInputProps()} />
          <p>Arrastra imágenes aquí o haz clic para seleccionar</p>
        </div>
        <div className="image-grid">
          {images.map((img, index) => (
            <div key={index} className="image-preview">
              <img src={img.preview} alt={`Preview ${index}`} />
            </div>
          ))}
        </div>

        {/* Formulario para crear nuevos usuarios */}
        <div className="create-user-form">
          <h3>Crear Nuevo Usuario</h3>
          <form onSubmit={handleCreateUser}>
            <input
              type="text"
              placeholder="Nombre de Usuario"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
            <input
              type="text"
              placeholder="Razón Social"
              value={newUser.razonSocial}
              onChange={(e) => setNewUser({ ...newUser, razonSocial: e.target.value })}
            />
            <input
              type="text"
              placeholder="Código Empresa"
              value={newUser.codigoEmpresa}
              onChange={(e) => setNewUser({ ...newUser, codigoEmpresa: e.target.value })}
            />
            <button type="submit">Crear Usuario</button>
          </form>
        </div>
      </div>
    );
  }

  // Si no está logueado, se muestra el formulario de login
  return (
    <div className="admin-login">
      <h2>Acceso Administrador</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Usuario"
          value={credentials.username}
          onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={credentials.password}
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
        />
        <label>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Recordar credenciales
        </label>
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default Admin;
