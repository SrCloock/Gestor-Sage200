import React, { useState } from 'react';
import axios from 'axios';
import '../styles/admin.css';

const Admin = () => {
  const [form, setForm] = useState({
    UsuarioLogicNet: '',
    ContraseñaLogicNet: '',
    RazonSocial: '',
    Nombre: '',
    CodigoEmpresa: '1'
  });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/create-user', form);
      setMessage('Usuario creado correctamente');
      setForm({
        UsuarioLogicNet: '',
        ContraseñaLogicNet: '',
        RazonSocial: '',
        Nombre: '',
        CodigoEmpresa: '1'
      });
    } catch (err) {
      setMessage('Error al crear usuario');
    }
  };

  return (
    <div className="admin-container">
      <h2>Panel de administración</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="UsuarioLogicNet"
          value={form.UsuarioLogicNet}
          onChange={(e) => setForm({...form, UsuarioLogicNet: e.target.value})}
          placeholder="Usuario"
          required
        />
        <input
          name="ContraseñaLogicNet"
          type="password"
          value={form.ContraseñaLogicNet}
          onChange={(e) => setForm({...form, ContraseñaLogicNet: e.target.value})}
          placeholder="Contraseña"
          required
        />
        <input
          name="RazonSocial"
          value={form.RazonSocial}
          onChange={(e) => setForm({...form, RazonSocial: e.target.value})}
          placeholder="Razón Social"
          required
        />
        <input
          name="Nombre"
          value={form.Nombre}
          onChange={(e) => setForm({...form, Nombre: e.target.value})}
          placeholder="Nombre"
          required
        />
        <button type="submit">Crear usuario</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default Admin;