import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getOrderDetails } from '../services/api';

const OrderDetails = () => {
  const [orderDetails, setOrderDetails] = useState(null);
  const { orderId } = useParams();

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const data = await getOrderDetails(orderId);
      setOrderDetails(data);
    };
    fetchOrderDetails();
  }, [orderId]);

  if (!orderDetails) {
    return <div>Cargando...</div>;
  }

  return (
    <div>
      <h2>Detalles del Pedido</h2>
      <p>Código Pedido: {orderDetails.codigoPedido}</p>
      <p>Proveedor: {orderDetails.proveedor}</p>
      {/* Aquí puedes listar más detalles del pedido */}
    </div>
  );
};

export default OrderDetails;
