import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
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
        setFilteredOrders(response.data.orders);
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

  useEffect(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.NumeroPedido.toString().toLowerCase().includes(term)
      );
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.FechaPedido);
      const dateB = new Date(b.FechaPedido);
      
      switch(sortBy) {
        case 'recent':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'id-asc':
          return a.NumeroPedido - b.NumeroPedido;
        case 'id-desc':
          return b.NumeroPedido - a.NumeroPedido;
        default:
          return dateB - dateA;
      }
    });
    
    setFilteredOrders(result);
  }, [searchTerm, sortBy, orders]);

  const handleViewDetails = (orderId) => {
    navigate(`/mis-pedidos/${orderId}`);
  };

  if (loading) return <div className="loading">Cargando pedidos...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="order-list">
      <h2>Mis Pedidos</h2>
      
      <div className="order-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por número de pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="sort-options">
          <label>Ordenar por:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
            <option value="id-asc">Número de pedido (ascendente)</option>
            <option value="id-desc">Número de pedido (descendente)</option>
          </select>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <p>No se encontraron pedidos con los filtros aplicados</p>
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
            {filteredOrders.map(order => (
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