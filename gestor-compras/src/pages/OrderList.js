import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import '../styles/OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Función para obtener texto del estado
  const getStatusText = useMemo(() => (order) => {
    if (order.StatusAprobado === 0) return 'Revisando';
    if (order.StatusAprobado === -1) {
      switch (order.Estado) {
        case 0: return 'Preparando';
        case 1: return 'Parcial';
        case 2: return 'Servido';
        default: return 'Preparando';
      }
    }
    return 'Desconocido';
  }, []);

  // Función para verificar si es editable
  const canEditOrder = useMemo(() => (order) => {
    return order.StatusAprobado === 0; // Solo editable en "Revisando"
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/orders', {
          params: { codigoCliente: user?.codigoCliente }
        });
        
        if (response.data.success) {
          setOrders(response.data.orders);
        } else {
          setError(response.data.message || 'Error al cargar pedidos');
        }
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

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.NumeroPedido.toString().includes(term) ||
        order.RazonSocial.toLowerCase().includes(term)
      );
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.FechaPedido);
      const dateB = new Date(b.FechaPedido);
      
      switch(sortBy) {
        case 'recent': return dateB - dateA;
        case 'oldest': return dateA - dateB;
        case 'id-asc': return a.NumeroPedido - b.NumeroPedido;
        case 'id-desc': return b.NumeroPedido - a.NumeroPedido;
        default: return dateB - dateA;
      }
    });
    
    return result;
  }, [searchTerm, sortBy, orders]);

  const handleViewDetails = (orderId) => {
    navigate(`/mis-pedidos/${orderId}`);
  };

  const handleEditOrder = (orderId) => {
    const order = orders.find(o => o.NumeroPedido === orderId);
    if (order && canEditOrder(order)) {
      navigate(`/editar-pedido/${orderId}`);
    }
  };

  if (loading) return (
    <div className="ol-loading-container">
      <div className="ol-spinner"></div>
      <p>Cargando pedidos...</p>
    </div>
  );

  if (error) return (
    <div className="ol-error-container">
      <div className="ol-error-icon">⚠️</div>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="ol-container">
      <div className="ol-header">
        <h2 className="ol-title">Historial de Pedidos</h2>
        <p className="ol-subtitle">Gestiona y revisa tus pedidos realizados</p>
      </div>
      
      <div className="ol-controls-panel">
        <div className="ol-search-container">
          <input
            type="text"
            placeholder="Buscar por #Pedido o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ol-search-input"
          />
          <span className="ol-search-icon">🔍</span>
        </div>
        
        <div className="ol-filter-container">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ol-filter-select"
          >
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="id-asc">#Pedido (ascendente)</option>
            <option value="id-desc">#Pedido (descendente)</option>
          </select>
        </div>
      </div>
      
      {filteredOrders.length === 0 ? (
        <div className="ol-empty-state">
          <div className="ol-empty-icon">📭</div>
          <h3>No se encontraron pedidos</h3>
          <p>No hay pedidos que coincidan con los filtros aplicados</p>
        </div>
      ) : (
        <div className="ol-table-container">
          <table className="ol-orders-table">
            <thead>
              <tr>
                <th>#Pedido</th>
                <th>Fecha Pedido</th>
                <th>Cliente</th>
                <th>Artículos</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const statusText = getStatusText(order);
                const editable = canEditOrder(order);
                
                return (
                  <tr key={order.NumeroPedido} className="ol-table-row">
                    <td className="ol-order-id">#{order.NumeroPedido}</td>
                    <td className="ol-order-date">
                      {new Date(order.FechaPedido).toLocaleDateString('es-ES')}
                    </td>
                    <td className="ol-order-client">{order.RazonSocial}</td>
                    <td className="ol-items-count">{order.NumeroLineas}</td>
                    <td>
                      <span className={`ol-status-badge ol-status-${statusText.toLowerCase()}`}>
                        {statusText}
                      </span>
                    </td>
                    <td>
                      <div className="ol-actions">
                        <button 
                          onClick={() => handleViewDetails(order.NumeroPedido)}
                          className="ol-btn ol-btn-primary"
                        >
                          Ver Detalle
                        </button>
                        {editable && (
                          <button 
                            onClick={() => handleEditOrder(order.NumeroPedido)}
                            className="ol-btn ol-btn-secondary"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrderList;