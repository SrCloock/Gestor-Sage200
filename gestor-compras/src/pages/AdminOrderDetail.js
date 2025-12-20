import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FaArrowLeft, FaSync, FaBox, FaEuroSign, FaCalendarAlt, FaUser, FaFileInvoice } from 'react-icons/fa';
import '../styles/OrderDetail.css';

const AdminOrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWithAuth = async (url, options = {}) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      
      if (!storedUser) {
        throw new Error('No hay usuario en sesión');
      }

      const defaultOptions = {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'usuario': storedUser.username || '',
          'codigoempresa': storedUser.codigoCliente || ''
        },
      };

      const config = { 
        ...defaultOptions, 
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...options.headers
        }
      };
      
      if (config.body && typeof config.body !== 'string') {
        config.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, config);
      
      if (response.status === 401) {
        localStorage.removeItem('user');
        throw new Error('Sesión expirada');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado. No tiene permisos de administrador.');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error en fetchWithAuth (admin):', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchOrderDetail = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetchWithAuth(`/api/admin/orders/${orderId}`, {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error(`El servidor devolvió un formato inválido`);
        }

        const data = await response.json();
        
        if (data.success) {
          setOrder(data.order);
        } else {
          setError(data.message || 'Error al cargar el pedido');
        }
      } catch (err) {
        console.error('❌ Error fetching admin order details:', err);
        setError(err.message || 'Error al cargar los detalles del pedido');
      } finally {
        setLoading(false);
      }
    };

    if (user && user.isAdmin && orderId) {
      fetchOrderDetail();
    } else {
      setError('No tiene permisos de administrador para ver este pedido');
      setLoading(false);
    }
  }, [orderId, user]);

  const getStatusText = (statusAprobado, estado, esParcial) => {
    if (statusAprobado === 0) return 'Revisando';
    if (statusAprobado === -1) {
      if (estado === 2) return 'Servido';
      if (estado === 0) {
        // Si EsParcial es -1, entonces es Parcial
        return esParcial === -1 ? 'Parcial' : 'Preparando';
      }
    }
    return 'Desconocido';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0);
  };

  // Función para calcular el total de un producto (PrecioVenta * Cantidad)
  const calcularTotalProducto = (product) => {
    const precio = parseFloat(product.Precio) || parseFloat(product.PrecioVenta) || 0;
    const cantidad = parseFloat(product.UnidadesPedidas) || 0;
    return precio * cantidad;
  };

  // Función para calcular el total del pedido (suma de todos los productos)
  const calcularTotalPedido = () => {
    if (!order || !order.Productos) return 0;
    return order.Productos.reduce((sum, product) => {
      return sum + calcularTotalProducto(product);
    }, 0);
  };

  if (loading) {
    return (
      <div className="od-loading-container">
        <div className="od-spinner"></div>
        <p>Cargando detalles del pedido...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="od-error-container">
        <div className="od-error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{error}</p>
        <button onClick={() => navigate('/admin/orders')} className="od-back-button">
          <FaArrowLeft /> Volver a Administración
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="od-error-container">
        <div className="od-error-icon">📭</div>
        <h3>Pedido no encontrado</h3>
        <p>El pedido #{orderId} no existe o no se pudo cargar.</p>
        <button onClick={() => navigate('/admin/orders')} className="od-back-button">
          <FaArrowLeft /> Volver a Administración
        </button>
      </div>
    );
  }

  const getStatusBadgeClass = () => {
    if (order.StatusAprobado === 0) return 'od-status-revisando';
    if (order.StatusAprobado === -1) {
      if (order.Estado === 2) return 'od-status-servido';
      if (order.Estado === 0) {
        return order.EsParcial === -1 ? 'od-status-parcial' : 'od-status-preparando';
      }
    }
    return 'od-status-desconocido';
  };

  const totalPedido = calcularTotalPedido();

  return (
    <div className="od-container">
      <div className="od-header">
        <div className="od-header-left">
          <button onClick={() => navigate('/admin/orders')} className="od-back-button">
            <FaArrowLeft className="od-back-icon" />
            Volver a Administración
          </button>
          <div className="od-title-section">
            <FaFileInvoice className="od-title-icon" />
            <div>
              <h2>Detalles del Pedido #{order.NumeroPedido}</h2>
              <p className="od-subtitle">Vista de administrador</p>
            </div>
          </div>
        </div>
        <div className="od-header-actions">
          <button onClick={() => window.location.reload()} className="od-refresh-button">
            <FaSync className="od-refresh-icon" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="od-content">
        {/* Información del cliente */}
        <div className="od-info-section">
          <h3>
            <FaUser className="od-section-icon" />
            Información del Cliente
          </h3>
          <div className="od-info-grid">
            <div className="od-info-item">
              <span className="od-info-label">Cliente:</span>
              <span className="od-info-value">{order.RazonSocial}</span>
            </div>
            <div className="od-info-item">
              <span className="od-info-label">CIF/DNI:</span>
              <span className="od-info-value">{order.CifDni}</span>
            </div>
            <div className="od-info-item">
              <span className="od-info-label">Fecha Pedido:</span>
              <span className="od-info-value">{formatDate(order.FechaPedido)}</span>
            </div>
            {order.FechaNecesaria && (
              <div className="od-info-item">
                <span className="od-info-label">Fecha Necesaria:</span>
                <span className="od-info-value">{formatDate(order.FechaNecesaria)}</span>
              </div>
            )}
            <div className="od-info-item">
              <span className="od-info-label">Estado:</span>
              <span className={`od-status ${getStatusBadgeClass()}`}>
                {getStatusText(order.StatusAprobado, order.Estado, order.EsParcial)}
              </span>
            </div>
            <div className="od-info-item">
              <span className="od-info-label">Total Pedido:</span>
              <span className="od-info-value od-total-amount">{formatCurrency(totalPedido)}</span>
            </div>
          </div>
        </div>

        {/* Productos del pedido */}
        <div className="od-products-section">
          <h3>
            <FaBox className="od-section-icon" />
            Productos del Pedido
          </h3>
          {order.Productos && order.Productos.length > 0 ? (
            <div className="od-products-table-container">
              <table className="od-products-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Total</th>
                    <th>Proveedor</th>
                  </tr>
                </thead>
                <tbody>
                  {order.Productos.map((product, index) => {
                    const totalProducto = calcularTotalProducto(product);
                    
                    return (
                      <tr key={index} className="od-product-row">
                        <td className="od-product-code">{product.CodigoArticulo}</td>
                        <td className="od-product-desc">{product.DescripcionArticulo}</td>
                        <td className="od-product-quantity">{product.UnidadesPedidas}</td>
                        <td className="od-product-price">
                          {formatCurrency(product.Precio || product.PrecioVenta || 0)}
                        </td>
                        <td className="od-product-total">
                          {formatCurrency(totalProducto)}
                        </td>
                        <td className="od-product-supplier">{product.NombreProveedor || 'No especificado'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="od-empty-products">
              <FaBox className="od-empty-icon" />
              <p>No hay productos en este pedido</p>
            </div>
          )}
        </div>

        {/* Resumen del pedido - SOLO muestra el total (PrecioVenta * Cantidad) */}
        <div className="od-summary-section">
          <h3>
            <FaEuroSign className="od-section-icon" />
            Resumen del Pedido
          </h3>
          <div className="od-summary-grid">
            <div className="od-summary-item">
              <span>Total Productos:</span>
              <span>{order.Productos ? order.Productos.length : 0}</span>
            </div>
            <div className="od-summary-item">
              <span>Importe Total:</span>
              <span>{formatCurrency(totalPedido)}</span>
            </div>
            <div className="od-summary-total">
              <span>Total del Pedido:</span>
              <span className="od-total-amount">{formatCurrency(totalPedido)}</span>
            </div>
          </div>
        </div>

        {order.ObservacionesPedido && (
          <div className="od-notes-section">
            <h3>
              <FaFileInvoice className="od-section-icon" />
              Observaciones
            </h3>
            <div className="od-notes-content">
              <p>{order.ObservacionesPedido}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrderDetail;