import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [form, setForm] = useState({ UsuarioLogicNet: '', ContraseñaLogicNet: '', CodigoCliente: '' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/productos');
    } catch (err) {
      alert('Credenciales incorrectas');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="UsuarioLogicNet"
          value={form.UsuarioLogicNet}
          onChange={(e) => setForm({ ...form, UsuarioLogicNet: e.target.value })}
          placeholder="Usuario"
          required
        />
        <input
          name="ContraseñaLogicNet"
          type="password"
          value={form.ContraseñaLogicNet}
          onChange={(e) => setForm({ ...form, ContraseñaLogicNet: e.target.value })}
          placeholder="Contraseña"
          required
        />
        <input
          name="CodigoCliente"
          value={form.CodigoCliente}
          onChange={(e) => setForm({ ...form, CodigoCliente: e.target.value })}
          placeholder="Código Cliente"
          required
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default Login;