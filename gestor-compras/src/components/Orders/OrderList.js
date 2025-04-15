import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get(
          'http://localhost:5000/api/orders',
          { withCredentials: true }
        );
        setOrders(response.data);
      } catch (err) {
        setError('Error al cargar los pedidos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <div className="loading">Cargando pedidos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="order-list">
      <h2>Mis Pedidos</h2>
      
      {orders.length === 0 ? (
        <p>No tienes pedidos registrados</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Productos</th>
              <th>Total Items</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.NumeroPedido}>
                <td>{order.NumeroPedido}</td>
                <td>{new Date(order.FechaPedido).toLocaleDateString()}</td>
                <td>{order.Productos}</td>
                <td>{order.NumeroLineas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrderList;