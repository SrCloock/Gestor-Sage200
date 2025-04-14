import React, { useState, useEffect } from 'react';
import axios from 'axios';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) return;
        
        const response = await axios.get(`/api/orders/${user.CodigoCliente}`);
        setOrders(response.data);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <div>Cargando historial de pedidos...</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Historial de Pedidos</h2>
      
      {orders.length === 0 ? (
        <p>No hay pedidos registrados</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Número</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Fecha</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total</th>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.NumeroPedido} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.5rem' }}>{order.NumeroPedido}</td>
                <td style={{ padding: '0.5rem' }}>
                  {new Date(order.FechaPedido).toLocaleDateString()}
                </td>
                <td style={{ textAlign: 'right', padding: '0.5rem' }}>
                  {order.Total.toFixed(2)}€
                </td>
                <td style={{ padding: '0.5rem' }}>{order.Estado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrderHistory;