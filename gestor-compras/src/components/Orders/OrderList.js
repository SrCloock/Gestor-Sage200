import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/orders', {
          params: {
            codigoCliente: user?.codigoCliente
          }
        });
        setOrders(response.data.orders);
      } catch (err) {
        setError('Error al cargar los pedidos');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.codigoCliente) {
      fetchOrders();
    }
  }, [user]);

  const handleViewDetails = (orderId) => {
    navigate(`/mis-pedidos/${orderId}`);
  };

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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.NumeroPedido}>
                <td>{order.NumeroPedido}</td>
                <td>{new Date(order.FechaPedido).toLocaleDateString()}</td>
                <td>
                  <ul className="product-list">
                    {order.Productos.slice(0, 3).map((product, index) => (
                      <li key={index}>
                        {product.CodigoArticulo} - {product.DescripcionArticulo} 
                        (x{product.UnidadesPedidas})
                      </li>
                    ))}
                    {order.Productos.length > 3 && (
                      <li>... y {order.Productos.length - 3} más</li>
                    )}
                  </ul>
                </td>
                <td>{order.NumeroLineas}</td>
                <td>
                  <button 
                    onClick={() => handleViewDetails(order.NumeroPedido)}
                    className="view-button"
                  >
                    Ver Detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrderList;