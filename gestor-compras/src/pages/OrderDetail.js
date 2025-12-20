import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import '../styles/OrderDetail.css';

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
        
        let response;
        
        if (user?.isAdmin) {
          response = await api.get(`/admin/all-orders/${orderId}`);
        } else {
          response = await api.get(`/orders/${orderId}`, {
            params: {
              codigoCliente: user?.codigoCliente,
              seriePedido: 'WebCD'
            }
          });
        }
        
        if (response.data && response.data.order) {
          console.log('📊 Datos del pedido:', response.data.order);
          console.log('📊 Productos del pedido:', response.data.order.productos || response.data.order.Productos);
          setOrder(response.data.order);
        } else {
          setError('No se encontraron datos del pedido');
        }
      } catch (err) {
        console.error('❌ Error al cargar detalles del pedido:', err);
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else if (err.response?.status === 404) {
          setError('El pedido solicitado no existe.');
        } else {
          setError('Error al cargar los detalles del pedido');
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

  const canConfirmReception = () => {
    if (!order) return false;
    return order.StatusAprobado === -1 && order.Estado !== 2;
  };

  const getStatusInfo = () => {
    if (!order) return { text: 'Desconocido', color: 'unknown' };
    
    if (order.StatusAprobado === 0) {
      return { 
        text: 'Revisando', 
        color: 'reviewing' 
      };
    }
    
    if (order.StatusAprobado === -1) {
      if (order.Estado === 2) {
        return { 
          text: 'Servido', 
          color: 'delivered' 
        };
      } else if (order.Estado === 0) {
        if (order.EsParcial === -1) {
          return { 
            text: 'Parcial', 
            color: 'partial' 
          };
        } else {
          return { 
            text: 'Preparando', 
            color: 'preparing' 
          };
        }
      }
    }
    
    return { text: 'Desconocido', color: 'unknown' };
  };

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
      setError('Error al actualizar los datos del pedido');
    } finally {
      setLoading(false);
    }
  };

  const canEditOrder = () => {
    if (!order) return false;
    return order.StatusAprobado === 0;
  };

  // Función para calcular el total de un producto (SOLO PrecioVenta * Cantidad)
  const calcularTotalProducto = (product) => {
    const precio = parseFloat(product.PrecioVenta) || parseFloat(product.Precio) || 0;
    const cantidad = parseFloat(product.UnidadesPedidas) || parseFloat(product.Cantidad) || 0;
    return precio * cantidad;
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

  const productos = order.productos || order.Productos || [];
  const numeroLineas = productos.length;
  const statusInfo = getStatusInfo();

  // Calcular total del pedido (solo PrecioVenta * Cantidad, sin IVA)
  const totalPedido = productos.reduce((sum, product) => {
    return sum + calcularTotalProducto(product);
  }, 0);

  // Calcular IVA si no viene de la API
  const totalIVA = order.TotalIVA || 0;

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
            {order.EsParcial === -1 && order.Estado === 0 && (
              <span className="od-parcial-indicator">⚠️ Recepción parcial</span>
            )}
          </div>
          <p className="od-order-date">
            Realizado el {new Date(order.FechaPedido).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
      
      <div className="od-info-grid">
        <div className="od-info-card">
          <div className="od-card-header">
            <h3>Información General</h3>
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
                {totalPedido.toFixed(2)} €
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
            <h3>Información del Cliente</h3>
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
                  {order.Estado !== 0 && <th>Comentario Recepción</th>}
                </tr>
              </thead>
              <tbody>
                {productos.map((product, index) => {
                  const cantidadPedida = parseFloat(product.UnidadesPedidas) || parseFloat(product.Cantidad) || 0;
                  const cantidadRecibida = parseFloat(product.UnidadesRecibidas) || 0;
                  const precio = parseFloat(product.Precio) || parseFloat(product.PrecioVenta) || 0;
                  const totalProducto = calcularTotalProducto(product);
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
                        {precio.toFixed(2)} €
                      </td>
                      <td className="od-product-total">
                        {totalProducto.toFixed(2)} €
                      </td>
                      {order.Estado !== 0 && (
                        <td className="od-product-comment">
                          {product.ComentarioRecepcion || '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="od-table-summary">
              <div className="od-summary-row">
                <span>Base Imponible:</span>
                <span>{totalPedido.toFixed(2)} €</span>
              </div>
              <div className="od-summary-row">
                <span>IVA:</span>
                <span>{totalIVA.toFixed(2)} €</span>
              </div>
              <div className="od-summary-row od-total-row">
                <span>Total:</span>
                <span className="od-grand-total">
                  {totalPedido.toFixed(2)} €
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