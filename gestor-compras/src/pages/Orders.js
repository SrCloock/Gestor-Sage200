import React, { useState, useEffect } from 'react';
import { getOrders } from '../services/api';
import { Link } from 'react-router-dom';

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const data = await getOrders();
      setOrders(data);
    };
    fetchOrders();
  }, []);

  return (
    <div>
      <h2>Mis Pedidos</h2>
      <ul>
        {orders.map((order) => (
          <li key={order.numeroPedido}>
            <Link to={`/order/${order.numeroPedido}`}>Pedido {order.numeroPedido}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Orders;
