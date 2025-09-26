// pages/AllOrders.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { 
  FaEye, 
  FaFilter, 
  FaSort, 
  FaSortUp, 
  FaSortDown, 
  FaFileExport, 
  FaSync, 
  FaTimes,
  FaSearch,
  FaCalendarAlt,
  FaUser,
  FaBox,
  FaEuroSign,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle
} from 'react-icons/fa';
import '../styles/AllOrders.css';

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { user } = useContext(AuthContext);
  
  const [filters, setFilters] = useState({
    cliente: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
    importeMin: '',
    importeMax: ''
  });
  
  const [sorting, setSorting] = useState({
    field: 'FechaPedido',
    direction: 'DESC'
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchAllOrders();
    }
  }, [user, pagination.page, pagination.limit, sorting, filters]);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ordenarPor: sorting.field,
        orden: sorting.direction,
        ...(filters.cliente && { cliente: filters.cliente }),
        ...(filters.estado !== '' && { estado: filters.estado }),
        ...(filters.fechaDesde && { fechaDesde: filters.fechaDesde }),
        ...(filters.fechaHasta && { fechaHasta: filters.fechaHasta }),
        ...(filters.importeMin && { importeMin: filters.importeMin }),
        ...(filters.importeMax && { importeMax: filters.importeMax })
      });

      const response = await fetch(`/api/admin/all-orders?${params}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
      } else {
        setError(data.message || 'Error al cargar los pedidos');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/all-orders/${orderId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSelectedOrder(data.order);
        setShowOrderDetails(true);
      } else {
        setError(data.message || 'Error al cargar los detalles del pedido');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Error al cargar los detalles del pedido');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({
      cliente: '',
      estado: '',
      fechaDesde: '',
      fechaHasta: '',
      importeMin: '',
      importeMax: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const changeSorting = (field) => {
    if (sorting.field === field) {
      setSorting(prev => ({
        field,
        direction: prev.direction === 'ASC' ? 'DESC' : 'ASC'
      }));
    } else {
      setSorting({
        field,
        direction: 'DESC'
      });
    }
  };

  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const changeItemsPerPage = (limit) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: parseInt(limit),
      page: 1
    }));
  };

  const exportToExcel = () => {
    setSuccessMessage('Funcionalidad de exportación en desarrollo...');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getStatusInfo = (statusAprobado, estado) => {
    if (statusAprobado === 0) {
      return { text: 'Pendiente', class: 'ao-status-pending', icon: <FaClock /> };
    } else if (statusAprobado === -1) {
      if (estado === 0) return { text: 'Preparando', class: 'ao-status-processing', icon: <FaClock /> };
      if (estado === 1) return { text: 'Parcial', class: 'ao-status-partial', icon: <FaExclamationTriangle /> };
      if (estado === 2) return { text: 'Servido', class: 'ao-status-completed', icon: <FaCheckCircle /> };
    }
    return { text: 'Desconocido', class: 'ao-status-unknown', icon: <FaExclamationTriangle /> };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const renderSortIcon = (field) => {
    if (sorting.field !== field) return <FaSort className="ao-sort-icon" />;
    return sorting.direction === 'ASC' 
      ? <FaSortUp className="ao-sort-icon" /> 
      : <FaSortDown className="ao-sort-icon" />;
  };

  const getStatusStats = () => {
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.StatusAprobado === 0).length,
      processing: orders.filter(o => o.StatusAprobado === -1 && o.Estado === 0).length,
      partial: orders.filter(o => o.StatusAprobado === -1 && o.Estado === 1).length,
      completed: orders.filter(o => o.StatusAprobado === -1 && o.Estado === 2).length
    };
    return stats;
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="ao-container">
        <div className="ao-access-denied">
          <FaTimes className="ao-denied-icon" />
          <h2>Acceso restringido</h2>
          <p>Se requieren permisos de administrador para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  const statusStats = getStatusStats();

  return (
    <div className="ao-container">
      <div className="ao-header">
        <div className="ao-title-section">
          <h1>Historial Completo de Pedidos</h1>
          <p>Gestión y visualización de todos los pedidos realizados a través de la web</p>
        </div>
        <div className="ao-header-actions">
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="ao-filter-btn"
          >
            <FaFilter className="ao-filter-icon" />
            Filtros
          </button>
          <button onClick={exportToExcel} className="ao-export-btn">
            <FaFileExport className="ao-export-icon" />
            Exportar
          </button>
          <button onClick={fetchAllOrders} className="ao-refresh-btn">
            <FaSync className="ao-refresh-icon" />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="ao-error-message">
          <div className="ao-error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => setError('')} className="ao-error-close">×</button>
        </div>
      )}

      {successMessage && (
        <div className="ao-success-message">
          <FaCheckCircle className="ao-success-icon" />
          <p>{successMessage}</p>
        </div>
      )}

      {showFilters && (
        <div className="ao-filters-panel">
          <h3>Filtrar Pedidos</h3>
          <div className="ao-filters-grid">
            <div className="ao-filter-group">
              <label>
                <FaUser className="ao-filter-input-icon" />
                Cliente:
              </label>
              <input
                type="text"
                name="cliente"
                value={filters.cliente}
                onChange={handleFilterChange}
                placeholder="Buscar por nombre de cliente"
                className="ao-filter-input"
              />
            </div>
            
            <div className="ao-filter-group">
              <label>Estado:</label>
              <select
                name="estado"
                value={filters.estado}
                onChange={handleFilterChange}
                className="ao-filter-select"
              >
                <option value="">Todos los estados</option>
                <option value="0">Pendiente</option>
                <option value="-1">Aprobados</option>
              </select>
            </div>
            
            <div className="ao-filter-group">
              <label>
                <FaCalendarAlt className="ao-filter-input-icon" />
                Fecha desde:
              </label>
              <input
                type="date"
                name="fechaDesde"
                value={filters.fechaDesde}
                onChange={handleFilterChange}
                className="ao-filter-input"
              />
            </div>
            
            <div className="ao-filter-group">
              <label>
                <FaCalendarAlt className="ao-filter-input-icon" />
                Fecha hasta:
              </label>
              <input
                type="date"
                name="fechaHasta"
                value={filters.fechaHasta}
                onChange={handleFilterChange}
                className="ao-filter-input"
              />
            </div>

            <div className="ao-filter-group">
              <label>
                <FaEuroSign className="ao-filter-input-icon" />
                Importe mínimo:
              </label>
              <input
                type="number"
                name="importeMin"
                value={filters.importeMin}
                onChange={handleFilterChange}
                placeholder="0"
                min="0"
                className="ao-filter-input"
              />
            </div>

            <div className="ao-filter-group">
              <label>
                <FaEuroSign className="ao-filter-input-icon" />
                Importe máximo:
              </label>
              <input
                type="number"
                name="importeMax"
                value={filters.importeMax}
                onChange={handleFilterChange}
                placeholder="Sin límite"
                min="0"
                className="ao-filter-input"
              />
            </div>
          </div>
          
          <div className="ao-filters-actions">
            <button onClick={applyFilters} className="ao-apply-btn">
              Aplicar Filtros
            </button>
            <button onClick={clearFilters} className="ao-clear-btn">
              Limpiar Filtros
            </button>
            <button onClick={() => setShowFilters(false)} className="ao-close-filters-btn">
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="ao-stats-cards">
        <div className="ao-stat-card">
          <div className="ao-stat-icon ao-stat-total">📦</div>
          <div className="ao-stat-content">
            <span className="ao-stat-value">{statusStats.total}</span>
            <span className="ao-stat-label">Total pedidos</span>
          </div>
        </div>
        <div className="ao-stat-card">
          <div className="ao-stat-icon ao-stat-pending">⏳</div>
          <div className="ao-stat-content">
            <span className="ao-stat-value">{statusStats.pending}</span>
            <span className="ao-stat-label">Pendientes</span>
          </div>
        </div>
        <div className="ao-stat-card">
          <div className="ao-stat-icon ao-stat-processing">🔧</div>
          <div className="ao-stat-content">
            <span className="ao-stat-value">{statusStats.processing}</span>
            <span className="ao-stat-label">En preparación</span>
          </div>
        </div>
        <div className="ao-stat-card">
          <div className="ao-stat-icon ao-stat-completed">✅</div>
          <div className="ao-stat-content">
            <span className="ao-stat-value">{statusStats.completed}</span>
            <span className="ao-stat-label">Completados</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="ao-loading">
          <div className="ao-spinner"></div>
          <p>Cargando pedidos...</p>
        </div>
      ) : (
        <>
          <div className="ao-table-container">
            {orders.length === 0 ? (
              <div className="ao-empty-state">
                <div className="ao-empty-icon">📭</div>
                <h3>No hay pedidos</h3>
                <p>No se encontraron pedidos con los filtros aplicados.</p>
                <button onClick={clearFilters} className="ao-clear-filters-btn">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <table className="ao-orders-table">
                <thead>
                  <tr>
                    <th>
                      <div className="ao-table-header" onClick={() => changeSorting('NumeroPedido')}>
                        Nº Pedido {renderSortIcon('NumeroPedido')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-table-header" onClick={() => changeSorting('FechaPedido')}>
                        Fecha {renderSortIcon('FechaPedido')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-table-header" onClick={() => changeSorting('RazonSocial')}>
                        Cliente {renderSortIcon('RazonSocial')}
                      </div>
                    </th>
                    <th>CIF/DNI</th>
                    <th>
                      <div className="ao-table-header" onClick={() => changeSorting('NumeroLineas')}>
                        Líneas {renderSortIcon('NumeroLineas')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-table-header" onClick={() => changeSorting('BaseImponible')}>
                        Importe {renderSortIcon('BaseImponible')}
                      </div>
                    </th>
                    <th>
                      <div className="ao-table-header" onClick={() => changeSorting('FechaNecesaria')}>
                        Fecha necesaria {renderSortIcon('FechaNecesaria')}
                      </div>
                    </th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const statusInfo = getStatusInfo(order.StatusAprobado, order.Estado);
                    return (
                      <tr key={order.NumeroPedido} className="ao-order-row">
                        <td className="ao-order-id">#{order.NumeroPedido}</td>
                        <td className="ao-order-date">{formatDate(order.FechaPedido)}</td>
                        <td className="ao-order-client" title={order.RazonSocial}>
                          {order.RazonSocial}
                        </td>
                        <td className="ao-order-cif">{order.CifDni}</td>
                        <td className="ao-order-lines">{order.NumeroLineas}</td>
                        <td className="ao-order-amount">{formatCurrency(order.BaseImponible)}</td>
                        <td className="ao-order-delivery">
                          <span className={new Date(order.FechaNecesaria) < new Date() ? 'ao-urgent' : ''}>
                            {formatDate(order.FechaNecesaria)}
                          </span>
                        </td>
                        <td className="ao-order-status">
                          <span className={`ao-status-badge ${statusInfo.class}`}>
                            {statusInfo.icon}
                            {statusInfo.text}
                          </span>
                        </td>
                        <td className="ao-order-actions">
                          <button 
                            onClick={() => fetchOrderDetails(order.NumeroPedido)}
                            className="ao-view-btn"
                            title="Ver detalles completos"
                          >
                            <FaEye />
                            Detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {orders.length > 0 && (
            <div className="ao-pagination">
              <div className="ao-pagination-info">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} pedidos
              </div>
              
              <div className="ao-pagination-controls">
                <button 
                  onClick={() => changePage(1)} 
                  disabled={pagination.page === 1}
                  className="ao-pagination-btn"
                >
                  «
                </button>
                <button 
                  onClick={() => changePage(pagination.page - 1)} 
                  disabled={pagination.page === 1}
                  className="ao-pagination-btn"
                >
                  ‹
                </button>
                
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(
                    pagination.totalPages - 4,
                    pagination.page - 2
                  )) + i;
                  
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => changePage(pageNum)}
                      className={`ao-pagination-btn ${pagination.page === pageNum ? 'ao-page-active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={() => changePage(pagination.page + 1)} 
                  disabled={pagination.page === pagination.totalPages}
                  className="ao-pagination-btn"
                >
                  ›
                </button>
                <button 
                  onClick={() => changePage(pagination.totalPages)} 
                  disabled={pagination.page === pagination.totalPages}
                  className="ao-pagination-btn"
                >
                  »
                </button>
              </div>
              
              <div className="ao-items-per-page">
                <label>Mostrar:</label>
                <select
                  value={pagination.limit}
                  onChange={(e) => changeItemsPerPage(e.target.value)}
                  className="ao-page-select"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          )}
        </>
      )}
      
      {showOrderDetails && selectedOrder && (
        <div className="ao-modal-overlay">
          <div className="ao-modal">
            <div className="ao-modal-header">
              <h2>Detalles del Pedido #{selectedOrder.NumeroPedido}</h2>
              <button 
                onClick={() => {
                  setShowOrderDetails(false);
                  setSelectedOrder(null);
                }}
                className="ao-close-btn"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="ao-modal-content">
              <div className="ao-modal-grid">
                <div className="ao-info-card">
                  <div className="ao-card-header">
                    <h3>Información del Pedido</h3>
                    <div className="ao-card-icon">📋</div>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-label">Número:</span>
                    <span className="ao-info-value">#{selectedOrder.NumeroPedido}</span>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-label">Fecha:</span>
                    <span className="ao-info-value">{formatDate(selectedOrder.FechaPedido)}</span>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-label">Estado:</span>
                    <span className="ao-info-value">
                      {getStatusInfo(selectedOrder.StatusAprobado, selectedOrder.Estado).text}
                    </span>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-label">Importe total:</span>
                    <span className="ao-info-value">{formatCurrency(selectedOrder.ImporteLiquido)}</span>
                  </div>
                </div>
                
                <div className="ao-info-card">
                  <div className="ao-card-header">
                    <h3>Información del Cliente</h3>
                    <div className="ao-card-icon">👤</div>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-label">Nombre:</span>
                    <span className="ao-info-value">{selectedOrder.RazonSocial}</span>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-label">CIF/DNI:</span>
                    <span className="ao-info-value">{selectedOrder.CifDni}</span>
                  </div>
                  <div className="ao-info-row">
                    <span className="ao-info-label">Dirección:</span>
                    <span className="ao-info-value">
                      {selectedOrder.Domicilio}, {selectedOrder.CodigoPostal} {selectedOrder.Municipio}, {selectedOrder.Provincia}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="ao-products-section">
                <h3>Productos del Pedido ({selectedOrder.productos?.length || 0})</h3>
                <div className="ao-products-table-container">
                  <table className="ao-products-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Total</th>
                        <th>Proveedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.productos?.map((producto, index) => (
                        <tr key={index} className="ao-product-row">
                          <td className="ao-product-desc">{producto.DescripcionArticulo}</td>
                          <td className="ao-product-code">{producto.CodigoArticulo}</td>
                          <td className="ao-product-quantity">{producto.UnidadesPedidas}</td>
                          <td className="ao-product-price">{formatCurrency(producto.Precio)}</td>
                          <td className="ao-product-total">{formatCurrency(producto.UnidadesPedidas * producto.Precio)}</td>
                          <td className="ao-product-supplier">{producto.NombreProveedor || 'No especificado'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="ao-modal-actions">
              <button 
                onClick={() => {
                  setShowOrderDetails(false);
                  setSelectedOrder(null);
                }}
                className="ao-close-modal-btn"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllOrders;