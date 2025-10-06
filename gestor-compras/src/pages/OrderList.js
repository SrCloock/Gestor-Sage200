import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSync } from "react-icons/fa";

import '../styles/OrderList.css';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

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

  const canEditOrder = useMemo(() => (order) => {
    return order.StatusAprobado === 0;
  }, []);

  const canReceiveOrder = useMemo(() => (order) => {
    return order.StatusAprobado === -1 && order.Estado !== 2;
  }, []);

  useEffect(() => {
    if (location.state?.success) {
      alert(location.state.message);
      window.history.replaceState({}, document.title);
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        console.log('Obteniendo pedidos para cliente:', user?.codigoCliente);
        
        const response = await api.get('/api/orders', {
          params: { codigoCliente: user?.codigoCliente }
        });
        
        console.log('Respuesta de pedidos:', response.data);
        
        if (response.data.success) {
          setOrders(response.data.orders || []);
        } else {
          setError(response.data.message || 'Error al cargar pedidos');
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else if (err.code === 'NETWORK_ERROR') {
          setError('Error de conexión con el servidor. Verifique que el servidor esté ejecutándose.');
        } else {
          setError('Error al cargar los pedidos: ' + (err.message || 'Error desconocido'));
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.codigoCliente) {
      fetchOrders();
    } else {
      setError('No se pudo identificar el cliente');
      setLoading(false);
    }
  }, [user, location.state]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.NumeroPedido.toString().includes(term)
      );
    }
    
    if (statusFilter) {
      result = result.filter(order => {
        const statusText = getStatusText(order).toLowerCase();
        return statusText.includes(statusFilter.toLowerCase());
      });
    }
    
    result.sort((a, b) => {
      const dateA = new Date(a.FechaPedido);
      const dateB = new Date(b.FechaPedido);
      
      switch(sortBy) {
        case 'recent': return dateB - dateA;
        case 'oldest': return dateA - dateB;
        case 'amount-asc': return (a.ImporteLiquido || 0) - (b.ImporteLiquido || 0);
        case 'amount-desc': return (b.ImporteLiquido || 0) - (a.ImporteLiquido || 0);
        case 'id-asc': return a.NumeroPedido - b.NumeroPedido;
        case 'id-desc': return b.NumeroPedido - a.NumeroPedido;
        default: return dateB - dateA;
      }
    });
    
    return result;
  }, [searchTerm, statusFilter, sortBy, orders, getStatusText]);

  const handleViewDetails = (orderId) => {
    navigate(`/mis-pedidos/${orderId}`);
  };

  const handleEditOrder = (orderId) => {
    const order = orders.find(o => o.NumeroPedido === orderId);
    if (order && canEditOrder(order)) {
      navigate(`/editar-pedido/${orderId}`);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
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
      <button onClick={handleRefresh} className="ol-retry-button">
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="ol-container">
      
      {/* Encabezado */}
      <div className="ol-header">
        <div className="ol-title-section">
          <h2 className="ol-title">Historial de Pedidos</h2>
          <p className="ol-subtitle">Gestiona y revisa tus pedidos realizados</p>
        </div>
        <button onClick={handleRefresh} className="ol-refresh-button">
          <FaSync className="ol-refresh-icon" />
          Actualizar
        </button>
      </div>

      {/* Panel de filtros y búsqueda */}
      <div className="ol-controls-panel">
        <div className="ol-search-container">
          <input
            type="text"
            placeholder="Buscar por #Pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ol-search-input"
          />
          <span className="ol-search-icon">🔍</span>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="ol-clear-search"
            >
              ×
            </button>
          )}
        </div>
        
        <div className="ol-filter-container">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ol-filter-select"
          >
            <option value="">Todos los estados</option>
            <option value="revisando">Revisando</option>
            <option value="preparando">Preparando</option>
            <option value="parcial">Parcial</option>
            <option value="servido">Servido</option>
          </select>
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
            <option value="amount-asc">Importe (ascendente)</option>
            <option value="amount-desc">Importe (descendente)</option>
          </select>
        </div>
      </div>
      
      {/* Tabla o estado vacío */}
      {filteredOrders.length === 0 ? (
        <div className="ol-empty-state">
          <div className="ol-empty-icon">📭</div>
          <h3>No se encontraron pedidos</h3>
          <p>No hay pedidos que coincidan con los filtros aplicados</p>
          <button 
            onClick={() => { setSearchTerm(''); setStatusFilter(''); }} 
            className="ol-clear-filters"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="ol-table-container">
          <table className="ol-orders-table">
            <thead>
              <tr>
                <th>#Pedido</th>
                <th>Fecha Pedido</th>
                <th>Artículos</th>
                <th>Importe</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const statusText = getStatusText(order);
                const editable = canEditOrder(order);
                const receivable = canReceiveOrder(order);
                
                return (
                  <tr key={order.NumeroPedido} className="ol-table-row">
                    <td className="ol-order-id">#{order.NumeroPedido}</td>
                    <td className="ol-order-date">
                      {new Date(order.FechaPedido).toLocaleDateString('es-ES')}
                    </td>
                    <td className="ol-items-count">{order.NumeroLineas}</td>
                    <td className="ol-order-amount">
                      {order.ImporteLiquido ? `${order.ImporteLiquido.toFixed(2)} €` : '0.00 €'}
                    </td>
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
