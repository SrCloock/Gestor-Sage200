import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './OrderDetail.css';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get(`/api/orders/${orderId}`, {
          params: {
            codigoCliente: user?.codigoCliente
          }
        });
        setOrder(response.data.order);
      } catch (err) {
        setError('Error al cargar los detalles del pedido');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.codigoCliente) {
      fetchOrderDetails();
    }
  }, [orderId, user]);

  if (loading) return <div className="loading">Cargando detalles del pedido...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!order) return <div>No se encontró el pedido</div>;

  return (
    <div className="order-detail">
      <button onClick={() => navigate(-1)} className="back-button">
        &larr; Volver al listado
      </button>
      
      <h2>Detalle del Pedido #{order.NumeroPedido}</h2>
      
      <div className="order-info">
        <p><strong>Fecha:</strong> {new Date(order.FechaPedido).toLocaleDateString()}</p>
        <p><strong>Cliente:</strong> {order.RazonSocial}</p>
        <p><strong>Total productos:</strong> {order.Productos.length}</p>
      </div>
      
      <h3>Productos</h3>
      <table className="products-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Proveedor</th>
          </tr>
        </thead>
        <tbody>
          {order.Productos.map((product, index) => (
            <tr key={index}>
              <td>{product.CodigoArticulo}</td>
              <td>{product.DescripcionArticulo}</td>
              <td>{product.UnidadesPedidas}</td>
              <td>{product.CodigoProveedor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderDetail;