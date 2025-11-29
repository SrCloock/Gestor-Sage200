import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import '../styles/OrderDetail.css';

// Constantes unificadas para estados
const ORDER_STATUS = {
  REVIEWING: { code: 0, text: 'Revisando', color: 'reviewing' },
  APPROVED: { code: -1, text: 'Aprobado', color: 'approved' },
  PREPARING: { code: 0, text: 'Preparando', color: 'preparing' },
  PARTIAL: { code: 1, text: 'Parcial', color: 'partial' },
  DELIVERED: { code: 2, text: 'Servido', color: 'delivered' }
};

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
        console.log('Obteniendo detalles del pedido:', orderId, 'para usuario:', user?.username);
        
        let response;
        
        // Si es admin, usar endpoint de admin
        if (user?.isAdmin) {
          response = await api.get(`/admin/all-orders/${orderId}`);
        } else {
          // Si es usuario normal, usar endpoint normal
          response = await api.get(`/orders/${orderId}`, {
            params: {
              codigoCliente: user?.codigoCliente,
              seriePedido: 'WebCD'
            }
          });
        }
        
        console.log('Respuesta del API:', response.data);
        
        if (response.data && response.data.order) {
          setOrder(response.data.order);
        } else {
          setError('No se encontraron datos del pedido');
        }
      } catch (err) {
        console.error('Error detallado:', err);
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else if (err.response?.status === 404) {
          setError('El pedido solicitado no existe.');
        } else {
          setError(err.response?.data?.message || 'Error al cargar los detalles del pedido');
        }
      } finally {
        setLoading(false);
      }
    };
  
    if (user) {
      fetchOrderDetails();
    } else {
      setError('No se pudo identificar el usuario');
      setLoading(false);
    }
  }, [orderId, user]);

  // ✅ CORREGIDO: Función unificada para determinar si se puede confirmar recepción
  const canConfirmReception = () => {
    if (!order) return false;
    
    // Solo se puede confirmar recepción si está aprobado y no está completamente servido
    return order.StatusAprobado === ORDER_STATUS.APPROVED.code && 
           order.Estado !== ORDER_STATUS.DELIVERED.code;
  };

  // ✅ CORREGIDO: Función unificada para texto del estado
  const getStatusInfo = () => {
    if (!order) return { text: 'Desconocido', color: 'unknown' };
    
    if (order.StatusAprobado === ORDER_STATUS.REVIEWING.code) {
      return { 
        text: ORDER_STATUS.REVIEWING.text, 
        color: ORDER_STATUS.REVIEWING.color 
      };
    }
    
    if (order.StatusAprobado === ORDER_STATUS.APPROVED.code) {
      switch (order.Estado) {
        case ORDER_STATUS.PREPARING.code:
          return { 
            text: ORDER_STATUS.PREPARING.text, 
            color: ORDER_STATUS.PREPARING.color 
          };
        case ORDER_STATUS.PARTIAL.code:
          return { 
            text: ORDER_STATUS.PARTIAL.text, 
            color: ORDER_STATUS.PARTIAL.color 
          };
        case ORDER_STATUS.DELIVERED.code:
          return { 
            text: ORDER_STATUS.DELIVERED.text, 
            color: ORDER_STATUS.DELIVERED.color 
          };
        default:
          return { 
            text: ORDER_STATUS.PREPARING.text, 
            color: ORDER_STATUS.PREPARING.color 
          };
      }
    }
    
    return { text: 'Desconocido', color: 'unknown' };
  };

  // ✅ CORREGIDO: Navegación mejorada
  const handleConfirmReception = () => {
    navigate(`/mis-pedidos/${orderId}/recepcion`);
  };

  const handleEditOrder = () => {
    navigate(`/mis-pedidos/${orderId}/editar`);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/orders/${orderId}`, {
        params: {
          codigoCliente: user?.codigoCliente,
          seriePedido: 'WebCD'
        }
      });
      
      if (response.data && response.data.order) {
        setOrder(response.data.order);
      }
    } catch (err) {
      console.error('Error al actualizar:', err);
      setError('Error al actualizar los datos del pedido');
    } finally {
      setLoading(false);
    }
  };

  const canEditOrder = () => {
    if (!order) return false;
    return order.StatusAprobado === ORDER_STATUS.REVIEWING.code;
  };

  if (loading) return (
    <div className="od-loading-container">
      <div className="od-spinner"></div>
      <p>Cargando detalles del pedido...</p>
    </div>
  );

  if (error) return (
    <div className="od-error-container">
      <div className="od-error-icon">⚠️</div>
      <p>{error}</p>
      <div className="od-error-actions">
        <button onClick={handleRefresh} className="od-retry-button">
          Reintentar
        </button>
        <button onClick={() => navigate('/mis-pedidos')} className="od-back-button">
          Volver al Historial
        </button>
      </div>
    </div>
  );

  if (!order) return (
    <div className="od-not-found">
      <div className="od-not-found-icon">❌</div>
      <h3>No se encontró el pedido</h3>
      <p>El pedido solicitado no existe o no tienes permisos para verlo</p>
      <button onClick={() => navigate('/mis-pedidos')} className="od-back-button">
        Volver al Historial
      </button>
    </div>
  );

  // Asegurarse de que productos existe y es un array
  const productos = order.productos || order.Productos || [];
  const numeroLineas = productos.length;
  const statusInfo = getStatusInfo();

  return (
    <div className="od-container">
      <div className="od-header-section">
        <button onClick={() => navigate('/mis-pedidos')} className="od-back-button">
          ← Volver al Historial
        </button>
        
        <div className="od-title-section">
          <div className="od-title-main">
            <h1>Pedido #{order.NumeroPedido}</h1>
            <span className={`od-status-badge od-status-${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
          <p className="od-order-date">
            Realizado el {new Date(order.FechaPedido).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </p>
        </div>

        <div className="od-header-actions">
          <button onClick={handleRefresh} className="od-refresh-button">
            🔄 Actualizar
          </button>
        </div>
      </div>
      
      <div className="od-info-grid">
        <div className="od-info-card">
          <div className="od-card-header">
            <h3>📦 Información General</h3>
          </div>
          <div className="od-info-content">
            <div className="od-info-row">
              <span className="od-info-label">Fecha de Pedido:</span>
              <span className="od-info-value">
                {new Date(order.FechaPedido).toLocaleDateString('es-ES')}
              </span>
            </div>
            {order.FechaNecesaria && (
              <div className="od-info-row">
                <span className="od-info-label">Fecha Necesaria:</span>
                <span className="od-info-value">
                  {new Date(order.FechaNecesaria).toLocaleDateString('es-ES')}
                </span>
              </div>
            )}
            <div className="od-info-row">
              <span className="od-info-label">Total Artículos:</span>
              <span className="od-info-value">{numeroLineas}</span>
            </div>
            <div className="od-info-row">
              <span className="od-info-label">Total del Pedido:</span>
              <span className="od-info-value od-total-amount">
                {order.ImporteLiquido ? `${order.ImporteLiquido.toFixed(2)} €` : '0.00 €'}
              </span>
            </div>
            {order.ObservacionesPedido && (
              <div className="od-info-row od-observations">
                <span className="od-info-label">Observaciones:</span>
                <span className="od-info-value">{order.ObservacionesPedido}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="od-info-card">
          <div className="od-card-header">
            <h3>👤 Información del Cliente</h3>
          </div>
          <div className="od-info-content">
            <div className="od-info-row">
              <span className="od-info-label">Razón Social:</span>
              <span className="od-info-value">{order.RazonSocial}</span>
            </div>
            <div className="od-info-row">
              <span className="od-info-label">CIF/DNI:</span>
              <span className="od-info-value">{order.CifDni || 'No disponible'}</span>
            </div>
            <div className="od-info-row">
              <span className="od-info-label">Dirección:</span>
              <span className="od-info-value">
                {order.Domicilio}, {order.CodigoPostal} {order.Municipio}, {order.Provincia}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="od-actions-section">
        {canEditOrder() && (
          <button 
            onClick={handleEditOrder}
            className="od-action-button od-edit-button"
          >
            ✏️ Editar Pedido
          </button>
        )}
        
        {canConfirmReception() && (
          <button 
            onClick={handleConfirmReception}
            className="od-action-button od-primary-button"
          >
            📦 Confirmar Recepción
          </button>
        )}
      </div>

      <div className="od-products-section">
        <div className="od-section-header">
          <h2>Artículos del Pedido</h2>
          <span className="od-items-count">{numeroLineas} productos</span>
        </div>
        
        {numeroLineas === 0 ? (
          <div className="od-empty-products">
            <div className="od-empty-icon">📦</div>
            <h3>No hay productos en este pedido</h3>
            <p>Este pedido no contiene artículos</p>
          </div>
        ) : (
          <div className="od-table-container">
            <table className="od-products-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Cantidad Pedida</th>
                  <th>Cantidad Recibida</th>
                  <th>Precio Unitario</th>
                  <th>Total</th>
                  {order.Estado !== ORDER_STATUS.PREPARING.code && <th>Comentario Recepción</th>}
                </tr>
              </thead>
              <tbody>
                {productos.map((product, index) => {
                  const cantidadPedida = product.UnidadesPedidas || product.Cantidad || 0;
                  const cantidadRecibida = product.UnidadesRecibidas || 0;
                  const precio = product.Precio || 0;
                  const total = product.ImporteLiquido || (precio * cantidadPedida);
                  const tieneDiferencia = cantidadRecibida !== cantidadPedida;
                  
                  return (
                    <tr key={index} className={`od-product-row ${tieneDiferencia ? 'od-with-difference' : ''}`}>
                      <td className="od-product-code">{product.CodigoArticulo}</td>
                      <td className="od-product-description">
                        <div className="od-product-desc-content">
                          <span className="od-product-name">{product.DescripcionArticulo}</span>
                          {product.CodigoProveedor && (
                            <span className="od-product-supplier">
                              Proveedor: {product.CodigoProveedor}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="od-product-quantity">{cantidadPedida}</td>
                      <td className={`od-product-quantity ${tieneDiferencia ? 'od-quantity-modified' : ''}`}>
                        {cantidadRecibida}
                        {tieneDiferencia && (
                          <span className="od-difference-indicator">⚠️</span>
                        )}
                      </td>
                      <td className="od-product-price">
                        {precio ? `${precio.toFixed(2)} €` : '0.00 €'}
                      </td>
                      <td className="od-product-total">
                        {total ? `${total.toFixed(2)} €` : '0.00 €'}
                      </td>
                      {order.Estado !== ORDER_STATUS.PREPARING.code && (
                        <td className="od-product-comment">
                          {product.ComentarioRecepcion || '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Resumen de totales */}
            <div className="od-table-summary">
              <div className="od-summary-row">
                <span>Base Imponible:</span>
                <span>{order.BaseImponible ? `${order.BaseImponible.toFixed(2)} €` : '0.00 €'}</span>
              </div>
              <div className="od-summary-row">
                <span>IVA:</span>
                <span>{order.TotalIVA ? `${order.TotalIVA.toFixed(2)} €` : '0.00 €'}</span>
              </div>
              <div className="od-summary-row od-total-row">
                <span>Total:</span>
                <span className="od-grand-total">
                  {order.ImporteLiquido ? `${order.ImporteLiquido.toFixed(2)} €` : '0.00 €'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;