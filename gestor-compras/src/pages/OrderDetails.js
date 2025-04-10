import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import OrderItem from '../components/OrderItem';

const OrderDetails = () => {
  const [order, setOrder] = useState(null);
  const { CodigoEmpresa, EjercicioPedido, SeriePedido, NumeroPedido } = useParams();

  useEffect(() => {
    const fetchOrder = async () => {
      const res = await axios.get(
        `/api/orders/${CodigoEmpresa}/${EjercicioPedido}/${SeriePedido}/${NumeroPedido}`
      );
      setOrder(res.data.data);
    };
    fetchOrder();
  }, []);

  if (!order) return <p>Cargando...</p>;

  return (
    <div className="order-details">
      <h2>Detalles del pedido</h2>
      <p>Cliente: {order.header.RazonSocial}</p>
      <p>Fecha: {order.header.FechaPedido}</p>
      <p>Estado: {order.header.Estado}</p>
      <h3>Productos:</h3>
      {order.lines.map(item => (
        <OrderItem key={item.Orden} item={item} />
      ))}
    </div>
  );
};

export default OrderDetails;
