import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const { id } = JSON.parse(atob(token.split('.')[1]));

    const fetchOrders = async () => {
      try {
        const res = await axios.get(`/api/orders/client/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="orders-container">
      <h2>Mis pedidos</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="orders-grid">
          {orders.map(order => (
            <Link
              key={order.NumeroPedido}
              to={`/pedido/${order.CodigoEmpresa}/${order.EjercicioPedido}/${order.SeriePedido}/${order.NumeroPedido}`}
              className="order-card"
            >
              <p>Pedido #{order.NumeroPedido}</p>
              <p>Fecha: {new Date(order.FechaPedido).toLocaleDateString()}</p>
              <p>Total: {order.Total.toFixed(2)}€</p>
              <p>Estado: {order.Estado}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;