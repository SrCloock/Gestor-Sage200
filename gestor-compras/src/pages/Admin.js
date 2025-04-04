import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/admin.css';


const Admin = () => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [images, setImages] = useState([]);

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

  const handleLogin = (e) => {
    e.preventDefault();
    if (credentials.username === 'admin' && credentials.password === '1234') {
      setLoggedIn(true);
      toast.success('Bienvenido, Admin');
      if (rememberMe) {
        localStorage.setItem('adminCredentials', JSON.stringify(credentials));
      }
    } else {
      toast.error('Credenciales incorrectas');
    }
  };

  if (!loggedIn) {
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
  }

  return (
    <div className="admin-dashboard">
      <h2>Panel de Administración</h2>
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
    </div>
  );
};

export default Admin;