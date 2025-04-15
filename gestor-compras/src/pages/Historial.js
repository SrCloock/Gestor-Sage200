import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Historial = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const response = await fetch(`/api/pedidos/historial?CodigoCliente=${user.CodigoCliente}`);
        const data = await response.json();
        setPedidos(data);
      } catch (error) {
        console.error('Error al cargar el historial:', error);
      }
    };

    fetchHistorial();
  }, [user.CodigoCliente]);

  const verDetalles = (pedido) => {
    navigate(`/pedido/${pedido.CodigoEmpresa}/${pedido.EjercicioPedido}/${pedido.SeriePedido}/${pedido.NumeroPedido}`);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Historial de Pedidos</h2>
      {pedidos.length === 0 ? (
        <p>No hay pedidos registrados.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Número de Pedido</th>
              <th>Serie</th>
              <th>Empresa</th>
              <th>Productos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido, index) => (
              <tr key={index}>
                <td>{new Date(pedido.FechaPedido).toLocaleDateString()}</td>
                <td>{pedido.NumeroPedido}</td>
                <td>{pedido.SeriePedido}</td>
                <td>{pedido.CodigoEmpresa}</td>
                <td>{pedido.NumeroLineas}</td>
                <td>
                  <button onClick={() => verDetalles(pedido)}>Ver Detalles</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Historial;
