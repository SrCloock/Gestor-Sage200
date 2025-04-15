import React from 'react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>¡Bienvenido, {user.Nombre}!</h1>
      <p><strong>Razón Social:</strong> {user.RazonSocial}</p>
      <p><strong>Código Cliente:</strong> {user.CodigoCliente}</p>
      <p><strong>Código Empresa:</strong> {user.CodigoEmpresa}</p>

      <div style={{ marginTop: '2rem' }}>
        <p>¿Qué deseas hacer hoy?</p>
        <ul>
          <li><a href="/historial">Ver historial de pedidos</a></li>
          <li><a href="/nuevo-pedido">Hacer un nuevo pedido</a></li>
        </ul>
      </div>
    </div>
  );
};

export default Home;
