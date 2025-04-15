import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PedidosList = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/pedidos/mis-pedidos', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        setPedidos(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPedidos();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  if (loading) return <div>Cargando pedidos...</div>;

  return (
    <div>
      <h2>Mis Pedidos</h2>
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha</th>
            <th>Líneas</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map(pedido => (
            <tr key={`${pedido.SeriePedido}-${pedido.NumeroPedido}`}>
              <td>{pedido.NumeroPedido}</td>
              <td>{new Date(pedido.FechaPedido).toLocaleDateString()}</td>
              <td>{pedido.NumeroLineas}</td>
              <td>
                <button onClick={() => navigate(`/pedidos/${pedido.NumeroPedido}`)}>
                  Ver Detalle
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PedidosList;