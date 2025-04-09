import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Reemplazamos useHistory por useNavigate
import { createUser } from '../services/api';

const Admin = () => {
  const [userData, setUserData] = useState({
    razonSocial: '',
    nombre: '',
    usuario: '',
    password: '',
    codigoCliente: '',
  });

  const navigate = useNavigate(); // Reemplazamos useHistory por useNavigate

  const handleInputChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createUser(userData);
      alert('Usuario creado con éxito');
      navigate('/admin'); // Usamos navigate para redirigir
    } catch (error) {
      alert('Error al crear el usuario');
    }
  };

  return (
    <div>
      <h2>Crear Nuevo Usuario</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Razón Social:</label>
          <input
            type="text"
            name="razonSocial"
            value={userData.razonSocial}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label>Nombre:</label>
          <input
            type="text"
            name="nombre"
            value={userData.nombre}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label>Usuario:</label>
          <input
            type="text"
            name="usuario"
            value={userData.usuario}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label>Contraseña:</label>
          <input
            type="password"
            name="password"
            value={userData.password}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label>Código Cliente:</label>
          <input
            type="text"
            name="codigoCliente"
            value={userData.codigoCliente}
            onChange={handleInputChange}
          />
        </div>
        <button type="submit">Crear Usuario</button>
      </form>
    </div>
  );
};

export default Admin;
