import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../components/orderService';
import { FaSearch, FaSort, FaSortUp, FaSortDown, FaTimes, FaSync, FaEye } from 'react-icons/fa';
import '../styles/AllOrders.css';

const AllOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    numeroPedido: '',
    cliente: '',
    importeMin: '',
    importeMax: '',
    estado: ''
  });
  const [sorting, setSorting] = useState({ field: 'FechaPedido', direction: 'DESC' });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchAllOrders();
    }
  }, [user, filters, sorting, pagination.page, pagination.limit]);

  const fetchAllOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ordenarPor: sorting.field,
        orden: sorting.direction,
        ...(filters.numeroPedido && { numeroPedido: filters.numeroPedido }),
        ...(filters.cliente && { cliente: filters.cliente }),
        ...(filters.importeMin && { importeMin: filters.importeMin }),
        ...(filters.importeMax && { importeMax: filters.importeMax }),
        ...(filters.estado && { estado: filters.estado })
      };

      const response = await api.get('/admin/all-orders', { params });
      
      if (response.data.success) {
        setOrders(response.data.orders || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      } else {
        setError(response.data.message || 'Error al cargar pedidos');
      }
    } catch (error) {
      console.error('Error fetching all orders:', error);
      setError('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (orderId) => {
    try {
      setModalLoading(true);
      const response = await api.get(`/admin/all-orders/${orderId}/admin-details`);
      
      if (response.data.success) {
        setSelectedOrder(response.data.order);
        setShowOrderModal(true);
      } else {
        setError('Error al cargar los detalles del pedido');
      }
    } catch (error) {
      console.error('Error fetching order details:', error);
      setError('Error al cargar los detalles del pedido');
    } finally {
      setModalLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  const getStatusText = (order) => {
    if (order.StatusAprobado === 0) return 'Pendiente';
    if (order.StatusAprobado === -1) {
      switch (order.Estado) {
        case 0: return 'Preparando';
        case 1: return 'Parcial';
        case 2: return 'Servido';
        default: return 'Preparando';
      }
    }
    return 'Desconocido';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  };

  const renderTableRows = () => {
    return orders.map(order => (
      <tr key={order.NumeroPedido} className="ao-order-row">
        <td className="ao-order-id">{order.NumeroPedido}</td>
        <td className="ao-order-date">{formatDate(order.FechaPedido)}</td>
        <td className="ao-order-client">{order.RazonSocial}</td>
        <td className="ao-order-cif">{order.CifDni}</td>
        <td className="ao-order-lines">{order.NumeroLineas}</td>
        <td className="ao-order-amount">
          {formatCurrency(order.ImporteLiquido)}
        </td>
        <td className="ao-order-status">
          <span className={`ao-status-badge ao-status-${getStatusText(order).toLowerCase()}`}>
            {getStatusText(order)}
          </span>
        </td>
        <td className="ao-order-actions">
          <button 
            onClick={() => handleViewDetails(order.NumeroPedido)}
            className="ao-view-btn"
            title="Ver detalles"
            disabled={modalLoading}
          >
            <FaEye />
            {modalLoading ? 'Cargando...' : 'Ver'}
          </button>
        </td>
      </tr>
    ));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      numeroPedido: '',
      cliente: '',
      importeMin: '',
      importeMax: '',
      estado: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    setSorting(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'ASC' ? 'DESC' : 'ASC'
    }));
  };

  const renderSortIcon = (field) => {
    if (sorting.field !== field) return <FaSort className="ao-sort-icon" />;
    return sorting.direction === 'ASC' 
      ? <FaSortUp className="ao-sort-icon" /> 
      : <FaSortDown className="ao-sort-icon" />;
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

  return (
    <div className="ao-container">
      <div className="ao-header">
        <div className="ao-title-section">
          <h1>Todos los Pedidos</h1>
          <p>Gestión completa de pedidos de todos los clientes</p>
        </div>
        <div className="ao-header-actions">
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
          <button onClick={() => setError('')} className="ao-error-close">
            <FaTimes />
          </button>
        </div>
      )}

      <div className="ao-filters-panel">
        <div className="ao-filters-grid">
          <div className="ao-filter-group">
            <label>Nº Pedido:</label>
            <input
              type="text"
              name="numeroPedido"
              value={filters.numeroPedido}
              onChange={handleFilterChange}
              placeholder="Buscar por número"
            />
          </div>

          <div className="ao-filter-group">
            <label>Cliente:</label>
            <input
              type="text"
              name="cliente"
              value={filters.cliente}
              onChange={handleFilterChange}
              placeholder="Buscar por cliente"
            />
          </div>

          <div className="ao-filter-group">
            <label>Importe Mín:</label>
            <input
              type="number"
              name="importeMin"
              value={filters.importeMin}
              onChange={handleFilterChange}
              placeholder="Importe mínimo"
              step="0.01"
            />
          </div>

          <div className="ao-filter-group">
            <label>Importe Máx:</label>
            <input
              type="number"
              name="importeMax"
              value={filters.importeMax}
              onChange={handleFilterChange}
              placeholder="Importe máximo"
              step="0.01"
            />
          </div>

          <div className="ao-filter-group">
            <label>Estado:</label>
            <select
              name="estado"
              value={filters.estado}
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              <option value="0">Pendiente</option>
              <option value="-1">Aprobado</option>
            </select>
          </div>
        </div>

        <div className="ao-filters-actions">
          <button onClick={fetchAllOrders} className="ao-apply-btn">
            Aplicar Filtros
          </button>
          <button onClick={clearFilters} className="ao-clear-btn">
            Limpiar
          </button>
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
              </div>
            ) : (
              <table className="ao-orders-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('NumeroPedido')} className="ao-sortable-header">
                      Nº Pedido {renderSortIcon('NumeroPedido')}
                    </th>
                    <th onClick={() => handleSort('FechaPedido')} className="ao-sortable-header">
                      Fecha {renderSortIcon('FechaPedido')}
                    </th>
                    <th onClick={() => handleSort('RazonSocial')} className="ao-sortable-header">
                      Cliente {renderSortIcon('RazonSocial')}
                    </th>
                    <th>CIF/DNI</th>
                    <th>Líneas</th>
                    <th onClick={() => handleSort('ImporteLiquido')} className="ao-sortable-header">
                      Importe {renderSortIcon('ImporteLiquido')}
                    </th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows()}
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
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="ao-pagination-btn"
                >
                  ‹ Anterior
                </button>
                
                <span className="ao-current-page">Página {pagination.page} de {pagination.totalPages}</span>
                
                <button 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="ao-pagination-btn"
                >
                  Siguiente ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showOrderModal && selectedOrder && (
        <div className="ao-modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="ao-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ao-modal-header">
              <h3>Detalles del Pedido #{selectedOrder.NumeroPedido}</h3>
              <button onClick={() => setShowOrderModal(false)} className="ao-modal-close">
                ×
              </button>
            </div>
            
            <div className="ao-modal-content">
              <div className="ao-order-info">
                <div className="ao-info-grid">
                  <div className="ao-info-item">
                    <strong>Cliente:</strong> {selectedOrder.RazonSocial}
                  </div>
                  <div className="ao-info-item">
                    <strong>Fecha:</strong> {formatDate(selectedOrder.FechaPedido)}
                  </div>
                  <div className="ao-info-item">
                    <strong>Estado:</strong> 
                    <span className={`ao-status-badge ao-status-${selectedOrder.EstadoDescripcion?.toLowerCase()}`}>
                      {selectedOrder.EstadoDescripcion}
                    </span>
                  </div>
                  <div className="ao-info-item">
                    <strong>Total:</strong> {formatCurrency(selectedOrder.ImporteLiquido)}
                  </div>
                  {selectedOrder.FechaNecesaria && (
                    <div className="ao-info-item">
                      <strong>Fecha Necesaria:</strong> {formatDate(selectedOrder.FechaNecesaria)}
                    </div>
                  )}
                  {selectedOrder.ObservacionesPedido && (
                    <div className="ao-info-item ao-full-width">
                      <strong>Observaciones:</strong> {selectedOrder.ObservacionesPedido}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ao-products-list">
                <h4>Productos ({selectedOrder.productos?.length || 0})</h4>
                {selectedOrder.productos && selectedOrder.productos.length > 0 ? (
                  <div className="ao-products-table-container">
                    <table className="ao-products-table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Descripción</th>
                          <th>Cantidad</th>
                          <th>Precio Unit.</th>
                          <th>Total</th>
                          <th>Proveedor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.productos.map((product, index) => (
                          <tr key={index}>
                            <td className="ao-product-code">{product.CodigoArticulo}</td>
                            <td className="ao-product-desc">{product.DescripcionArticulo}</td>
                            <td className="ao-product-qty">{product.UnidadesPedidas}</td>
                            <td className="ao-product-price">{formatCurrency(product.Precio)}</td>
                            <td className="ao-product-total">
                              {formatCurrency(product.Precio * product.UnidadesPedidas)}
                            </td>
                            <td className="ao-product-supplier">{product.NombreProveedor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="ao-no-products">No hay productos en este pedido</p>
                )}
              </div>
            </div>
            
            <div className="ao-modal-footer">
              <button onClick={() => setShowOrderModal(false)} className="ao-close-btn">
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