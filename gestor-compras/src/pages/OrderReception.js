import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/OrderReception.css';

const OrderReception = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  
  const [order, setOrder] = useState(null);
  const [receptionItems, setReceptionItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [albaranesGenerados, setAlbaranesGenerados] = useState([]);
  const [totalRecibido, setTotalRecibido] = useState(0);
  const [totalPedido, setTotalPedido] = useState(0);

  const fetchWithAuth = async (url, options = {}) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      
      if (!storedUser) {
        throw new Error('No hay usuario en sesión');
      }

      const config = { 
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'usuario': storedUser.username || '',
          'codigoempresa': storedUser.codigoCliente || ''
        },
        ...options
      };
      
      if (config.body && typeof config.body !== 'string') {
        config.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, config);
      
      if (response.status === 401) {
        localStorage.removeItem('user');
        throw new Error('Sesión expirada');
      } else if (response.status === 403) {
        throw new Error('Acceso denegado');
      } else if (response.status === 404) {
        throw new Error('Recurso no encontrado');
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        setError('No hay sesión activa');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchOrderReception = async () => {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser) {
        setError('Usuario no autenticado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const response = await fetchWithAuth(`/api/reception/${orderId}`, {
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
          const items = data.order.Productos.map(product => ({
            ...product,
            UnidadesRecibidas: product.UnidadesRecibidas || 0,
            ComentarioRecepcion: product.ComentarioRecepcion || '',
            // Guardar el valor original para comparar cambios
            UnidadesRecibidasOriginal: product.UnidadesRecibidas || 0
          }));
          setReceptionItems(items);
          
          // Calcular totales
          const totalPed = items.reduce((sum, item) => sum + (item.UnidadesPedidas || 0), 0);
          const totalRec = items.reduce((sum, item) => sum + (item.UnidadesRecibidas || 0), 0);
          setTotalPedido(totalPed);
          setTotalRecibido(totalRec);
        } else {
          setError(data.message || 'Error al cargar el pedido');
        }
      } catch (err) {
        setError(err.message || 'Error al cargar los datos del pedido');
        
        if (err.message.includes('Sesión expirada') || err.message.includes('Acceso denegado')) {
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (user && orderId) {
      fetchOrderReception();
    }
  }, [orderId, user, logout, navigate]);

  const handleQuantityChange = (index, value) => {
    const newItems = [...receptionItems];
    const unidadesPedidas = newItems[index].UnidadesPedidas;
    let nuevasUnidades = parseInt(value) || 0;
    
    // Validar límites
    if (nuevasUnidades < 0) nuevasUnidades = 0;
    if (nuevasUnidades > unidadesPedidas) nuevasUnidades = unidadesPedidas;
    
    // Calcular delta de cambio
    const deltaCambio = nuevasUnidades - (newItems[index].UnidadesRecibidas || 0);
    newItems[index].deltaCambio = deltaCambio;
    
    // IMPORTANTE: El usuario introduce el TOTAL acumulado que debe quedar registrado
    newItems[index].UnidadesRecibidas = nuevasUnidades;
    
    // Si hay diferencia con lo pedido, sugerir comentario
    if (nuevasUnidades !== unidadesPedidas) {
      if (!newItems[index].ComentarioRecepcion || 
          newItems[index].ComentarioRecepcion === 'Todo recibido correctamente') {
        newItems[index].ComentarioRecepcion = `Recibidas ${nuevasUnidades} de ${unidadesPedidas}`;
      }
    } else {
      // Si es completo, establecer comentario por defecto
      if (!newItems[index].ComentarioRecepcion || 
          newItems[index].ComentarioRecepcion.startsWith('Recibidas')) {
        newItems[index].ComentarioRecepcion = 'Todo recibido correctamente';
      }
    }
    
    setReceptionItems(newItems);
    
    // Actualizar total recibido
    const totalRec = newItems.reduce((sum, item) => sum + (item.UnidadesRecibidas || 0), 0);
    setTotalRecibido(totalRec);
  };

  const handleCommentChange = (index, value) => {
    const newItems = [...receptionItems];
    newItems[index].ComentarioRecepcion = value;
    setReceptionItems(newItems);
  };

  const handleFinalizeOrder = async () => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      setError('No hay sesión activa');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      setFinalizing(true);
      setError('');
      setSuccess('');

      // CORRECCIÓN: Enviar solicitud sin body (o con body vacío)
      // El backend no necesita más datos porque el usuario ya está en los headers
      const response = await fetchWithAuth(`/api/reception/${orderId}/finalize`, {
        method: 'POST'
        // No enviar body - el backend no lo necesita para finalizar
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no JSON:', text.substring(0, 200));
        throw new Error(`El servidor devolvió un formato inválido`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message || 'Pedido marcado como servido correctamente');
        
        // Solo actualizar el estado del pedido localmente
        // NO actualizar las unidades porque no cambian
        setOrder(prev => ({ 
          ...prev, 
          Estado: 2,
          EsParcial: 0 
        }));
        
        console.log('✅ Pedido finalizado:', data);
        
        // Redirigir después de un breve delay
        setTimeout(() => {
          navigate(`/mis-pedidos/${orderId}`, { 
            state: { 
              message: data.message || 'Pedido finalizado y marcado como servido',
              finalizado: true
            } 
          });
        }, 1500);
      } else {
        setError(data.message || 'Error al finalizar el pedido');
      }
    } catch (err) {
      console.error('❌ Error en handleFinalizeOrder:', err);
      
      if (err.message.includes('Sesión expirada') || err.message.includes('Acceso denegado')) {
        setError(err.message);
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else {
        setError(err.message || 'Error al finalizar el pedido. Verifique la consola para más detalles.');
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleSubmit = async () => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      setError('No hay sesión activa');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      setAlbaranesGenerados([]);

      // Validar que todos los items con diferencia tengan comentario
      const itemsWithDifferences = receptionItems.filter(item => {
        const tieneDiferencia = item.UnidadesRecibidas !== item.UnidadesPedidas;
        const comentarioValido = item.ComentarioRecepcion?.trim() && 
                              item.ComentarioRecepcion !== 'Todo recibido correctamente';
        return tieneDiferencia && !comentarioValido;
      });
      
      if (itemsWithDifferences.length > 0) {
        const itemCodes = itemsWithDifferences.map(item => item.CodigoArticulo).join(', ');
        setError(`Debe agregar comentarios para los artículos: ${itemCodes}`);
        setSubmitting(false);
        return;
      }

      // IMPORTANTE: Enviar el TOTAL acumulado que debe quedar registrado
      const requestBody = {
        items: receptionItems.map(item => ({
          Orden: item.Orden,
          CodigoArticulo: item.CodigoArticulo,
          UnidadesRecibidas: item.UnidadesRecibidas, // TOTAL acumulado que el usuario introduce
          ComentarioRecepcion: item.ComentarioRecepcion || ''
        })),
        usuario: storedUser.username,
        codigoempresa: storedUser.codigoCliente,
        timestamp: new Date().toISOString()
      };

      const response = await fetchWithAuth(`/api/reception/${orderId}/confirm`, {
        method: 'POST',
        body: requestBody
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no JSON:', text.substring(0, 200));
        throw new Error(`El servidor devolvió un formato inválido`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Recepción confirmada correctamente');
        
        const albaranesData = data.detallesAlbaranes || [];
        const albaranesArray = Array.isArray(albaranesData) ? albaranesData : [];
        setAlbaranesGenerados(albaranesArray);
        
        setOrder(prev => ({
          ...prev,
          Estado: data.estado || 2,
          EsParcial: data.esParcial || 0
        }));

        setTimeout(() => {
          navigate(`/mis-pedidos/${orderId}`, { 
            state: { 
              refreshed: true,
              receptionConfirmed: true,
              message: 'Recepción confirmada correctamente',
              albaranesGenerados: albaranesArray
            } 
          });
        }, 3000);
      } else {
        setError(data.message || 'Error al confirmar la recepción');
      }
    } catch (err) {
      console.error('❌ Error en handleSubmit:', err);
      
      if (err.message.includes('Sesión expirada') || err.message.includes('Acceso denegado')) {
        setError(err.message);
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else {
        setError(err.message || 'Error al confirmar la recepción');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 0: return 'Preparando';
      case 1: return 'Parcial';
      case 2: return 'Servido';
      default: return 'Estado desconocido';
    }
  };

  const calculateCurrentStatus = () => {
    if (!receptionItems.length) return 0;
    
    const totalPedidoCalc = receptionItems.reduce((sum, item) => sum + (item.UnidadesPedidas || 0), 0);
    const totalRecibidoCalc = receptionItems.reduce((sum, item) => sum + (item.UnidadesRecibidas || 0), 0);
    
    if (totalRecibidoCalc === 0) return 0;
    if (totalRecibidoCalc === totalPedidoCalc) return 2;
    return 1;
  };

  const currentStatus = calculateCurrentStatus();
  const totalPendiente = totalPedido - totalRecibido;

  if (loading) {
    return (
      <div className="orr-loading-container">
        <div className="orr-spinner"></div>
        <p>Cargando datos del pedido...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="orr-error-container">
        <div className="orr-error-icon">⚠️</div>
        <p>{error}</p>
        <button onClick={() => navigate('/mis-pedidos')} className="orr-back-button">
          Volver al historial
        </button>
      </div>
    );
  }

  return (
    <div className="orr-container">
      <div className="orr-header">
        <div className="orr-title-section">
          <h2>Confirmar Recepción del Pedido #{order?.NumeroPedido}</h2>
          <div className="orr-status-info">
            <div className="orr-status">
              Estado: <span className={`orr-status-badge orr-status-${currentStatus}`}>
                {getStatusText(currentStatus)}
              </span>
            </div>
            <div className="orr-totals">
              <span className="orr-total-item">Pedido: <strong>{totalPedido}</strong></span>
              <span className="orr-total-item">Recibido: <strong>{totalRecibido}</strong></span>
              <span className="orr-total-item">Pendiente: <strong>{totalPendiente}</strong></span>
            </div>
          </div>
        </div>
        <button onClick={() => navigate(`/mis-pedidos/${orderId}`)} className="orr-back-button">
          ← Volver al detalle
        </button>
      </div>

      {error && (
        <div className="orr-error-message">
          <div className="orr-error-icon">⚠️</div>
          <p>{error}</p>
          {error.includes('Sesión expirada') && (
            <p>Será redirigido al login automáticamente...</p>
          )}
        </div>
      )}

      {success && (
        <div className="orr-success-message">
          <div className="orr-success-icon">✅</div>
          <p>{success}</p>
          {albaranesGenerados && albaranesGenerados.length > 0 && (
            <div className="orr-albaranes-info">
              <p>Albaranes de compra generados: {albaranesGenerados.length}</p>
            </div>
          )}
          <p>Redirigiendo al detalle del pedido...</p>
        </div>
      )}

      {albaranesGenerados && Array.isArray(albaranesGenerados) && albaranesGenerados.length > 0 && (
        <div className="orr-albaranes-generados">
          <h3>Albaranes de Compra Generados</h3>
          <div className="orr-albaranes-grid">
            {albaranesGenerados.map((albaran, index) => (
              <div key={index} className="orr-albaran-card">
                <div className="orr-albaran-header">
                  <h4>Albarán #{albaran.numeroAlbaran}</h4>
                  <span className="orr-albaran-proveedor">Proveedor: {albaran.proveedor}</span>
                  <span className={`orr-albaran-estado ${albaran.esNuevo ? 'orr-albaran-nuevo' : 'orr-albaran-actualizado'}`}>
                    {albaran.esNuevo ? '🆕 Nuevo' : '✏️ Actualizado'}
                  </span>
                </div>
                <div className="orr-albaran-details">
                  <p>Items: {albaran.items}</p>
                  <p>Total: {albaran.total?.toFixed(2)} €</p>
                  <p>Estado: {albaran.esParcial ? 'Recepción Parcial' : 'Completo'}</p>
                  {albaran.itemsDetalle && (
                    <div className="orr-albaran-items">
                      <strong>Detalle:</strong>
                      <ul>
                        {albaran.itemsDetalle.map((item, idx) => (
                          <li key={idx}>{item.CodigoArticulo}: {item.UnidadesRecibidas} unidades</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="orr-info-cards">
        <div className="orr-info-card">
          <div className="orr-card-icon">👤</div>
          <div className="orr-card-content">
            <h4>Cliente</h4>
            <p>{order?.RazonSocial}</p>
          </div>
        </div>
        
        <div className="orr-info-card">
          <div className="orr-card-icon">📅</div>
          <div className="orr-card-content">
            <h4>Fecha de pedido</h4>
            <p>{order?.FechaPedido ? new Date(order.FechaPedido).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>
        
        {order?.FechaNecesaria && (
          <div className="orr-info-card">
            <div className="orr-card-icon">🚚</div>
            <div className="orr-card-content">
              <h4>Fecha necesaria</h4>
              <p>{new Date(order.FechaNecesaria).toLocaleDateString()}</p>
            </div>
          </div>
        )}
      </div>

      <div className="orr-table-container">
        <div className="orr-table-header">
          <h3>Artículos del Pedido</h3>
          <div className="orr-instructions">
            <p><strong>Importante:</strong> Introduzca el <strong>total acumulado</strong> de unidades recibidas hasta el momento.</p>
            <p className="orr-warning-text">
              Si la cantidad recibida es diferente a la pedida, debe agregar un comentario explicando la diferencia.
            </p>
          </div>
        </div>
        
        <table className="orr-reception-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Código</th>
              <th>Proveedor</th>
              <th>Pedido</th>
              <th>Total Recibido</th>
              <th>Pendiente</th>
              <th>Comentarios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {receptionItems.map((item, index) => {
              const hasDifference = item.UnidadesRecibidas !== item.UnidadesPedidas;
              const pendiente = (item.UnidadesPedidas || 0) - (item.UnidadesRecibidas || 0);
              const comentarioValido = item.ComentarioRecepcion?.trim() && 
                                    item.ComentarioRecepcion !== 'Todo recibido correctamente';
              const needsComment = hasDifference && !comentarioValido;
              
              return (
                <tr key={index} className={`${hasDifference ? 'orr-partial-reception' : ''} ${needsComment ? 'orr-needs-comment' : ''}`}>
                  <td className="orr-item-description">{item.DescripcionArticulo}</td>
                  <td className="orr-item-code">{item.CodigoArticulo}</td>
                  <td className="orr-item-proveedor">{item.CodigoProveedor || 'No especificado'}</td>
                  <td className="orr-item-ordered">{item.UnidadesPedidas}</td>
                  <td className="orr-item-received">
                    <div className="orr-quantity-input-container">
                      <input
                        type="number"
                        min="0"
                        max={item.UnidadesPedidas}
                        value={item.UnidadesRecibidas}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        disabled={order?.Estado === 2}
                        className="orr-quantity-input"
                        title={`Total acumulado de unidades recibidas${item.deltaCambio ? ` (Cambio: ${item.deltaCambio > 0 ? '+' : ''}${item.deltaCambio})` : ''}`}
                      />
                      {item.deltaCambio !== undefined && item.deltaCambio !== 0 && (
                        <span className={`orr-change-indicator ${item.deltaCambio > 0 ? 'orr-change-up' : 'orr-change-down'}`}>
                          {item.deltaCambio > 0 ? `+${item.deltaCambio}` : item.deltaCambio}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="orr-item-pending">{pendiente}</td>
                  <td className="orr-item-comments">
                    <textarea
                      placeholder={hasDifference ? "Explique la diferencia en cantidades..." : "Comentarios sobre la recepción"}
                      value={item.ComentarioRecepcion}
                      onChange={(e) => handleCommentChange(index, e.target.value)}
                      disabled={order?.Estado === 2}
                      className="orr-comment-input"
                      rows="2"
                    />
                    {needsComment && (
                      <span className="orr-comment-warning">⚠️ Comentario requerido</span>
                    )}
                  </td>
                  <td className="orr-item-status">
                    {item.UnidadesRecibidas === item.UnidadesPedidas ? (
                      <span className="orr-status-complete">✅ Completo</span>
                    ) : item.UnidadesRecibidas === 0 ? (
                      <span className="orr-status-pending">⏳ Pendiente</span>
                    ) : (
                      <span className="orr-status-partial">⚠️ Parcial</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {order?.Estado !== 2 && (
        <div className="orr-finalize-section">
          <div className="orr-finalize-header">
            <h3>Finalizar Pedido</h3>
            <div className="orr-finalize-info">
              <p>
                <strong>¿No va a recepcionar más unidades?</strong> Marque el pedido como servido para eliminarlo de la lista de pendientes.
              </p>
              <p className="orr-warning-text">
                <strong>IMPORTANTE:</strong> Esta acción solo cambia el estado del pedido a "Servido". 
                <br />
                • NO modifica las unidades recibidas
                <br />
                • NO genera nuevos albaranes
                <br />
                • NO afecta a los albaranes existentes (facturados o no)
                <br />
                • Las unidades pendientes se mantienen igual
              </p>
            </div>
          </div>
          <button 
            onClick={handleFinalizeOrder}
            disabled={finalizing || order?.Estado === 2}
            className="orr-button orr-finalize-button"
          >
            {finalizing ? (
              <>
                <div className="orr-button-spinner"></div>
                Finalizando...
              </>
            ) : (
              'Finalizar Pedido (Marcar como Servido)'
            )}
          </button>
        </div>
      )}

      <div className="orr-actions">
        <button 
          onClick={() => navigate(`/mis-pedidos/${orderId}`)}
          className="orr-button orr-secondary-button"
        >
          Volver al detalle
        </button>
        
        {order?.Estado !== 2 && (
          <button 
            onClick={handleSubmit}
            disabled={submitting}
            className="orr-button orr-primary-button"
          >
            {submitting ? (
              <>
                <div className="orr-button-spinner"></div>
                Confirmando...
              </>
            ) : (
              'Confirmar Recepción'
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderReception;