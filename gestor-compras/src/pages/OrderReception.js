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
  const [finalizing, setFinalizing] = useState(false); // 🔥 NUEVO ESTADO
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [albaranesGenerados, setAlbaranesGenerados] = useState([]);

  // 🔥 CORREGIDO: Función mejorada para fetch con autenticación
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
      
      // Si en las opciones se pasa un body, lo convertimos a JSON
      if (config.body && typeof config.body !== 'string') {
        config.body = JSON.stringify(config.body);
      }

      console.log('🔐 Headers enviados:', config.headers);
      console.log('📤 URL:', url);
      console.log('👤 Usuario:', storedUser.username);

      const response = await fetch(url, config);
      
      console.log('📡 Response status:', response.status);
      
      if (response.status === 401) {
        console.log('❌ Error 401 - Sesión expirada');
        localStorage.removeItem('user');
        throw new Error('Sesión expirada. Por favor, inicie sesión nuevamente.');
      } else if (response.status === 403) {
        console.log('❌ Error 403 - Acceso denegado');
        const errorText = await response.text();
        console.log('📄 Respuesta del servidor (403):', errorText);
        throw new Error('Acceso denegado. No tiene permisos para esta acción.');
      } else if (response.status === 404) {
        throw new Error('Recurso no encontrado');
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error en fetchWithAuth:', error);
      throw error;
    }
  };

  // Verificar sesión
  useEffect(() => {
    console.log('🔐 Estado de autenticación:', {
      usuario: user,
      tieneUser: !!user,
      tieneLocalStorage: !!localStorage.getItem('user'),
      orderId: orderId
    });
    
    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        console.log('🔄 Restaurando usuario desde localStorage');
      } else {
        setError('No hay sesión activa. Redirigiendo al login...');
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
        
        console.log('🔍 Fetching order reception for:', orderId, 'User:', storedUser.username);
        
        const response = await fetchWithAuth(`/api/reception/${orderId}`, {
          method: 'GET'
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.error('❌ El servidor devolvió:', text.substring(0, 200));
          throw new Error(`El servidor devolvió un formato inválido`);
        }

        const data = await response.json();
        console.log('✅ Datos recibidos:', data);
        
        if (data.success) {
          setOrder(data.order);
          const items = data.order.Productos.map(product => ({
            ...product,
            UnidadesRecibidas: product.UnidadesRecibidas || 0,
            ComentarioRecepcion: product.ComentarioRecepcion || ''
          }));
          setReceptionItems(items);
        } else {
          setError(data.message || 'Error al cargar el pedido');
        }
      } catch (err) {
        console.error('❌ Error fetching order reception:', err);
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

  // 🔥 CORREGIDO: Función mejorada para manejar cambios de cantidad
  const handleQuantityChange = (index, value) => {
    const newItems = [...receptionItems];
    const unidadesPedidas = newItems[index].UnidadesPedidas;
    const nuevasUnidades = Math.max(0, Math.min(parseInt(value) || 0, unidadesPedidas));
    
    newItems[index].UnidadesRecibidas = nuevasUnidades;
    
    // Detectar si el comentario actual es automático (empieza con "Cantidad modificada")
    const comentarioActual = newItems[index].ComentarioRecepcion || '';
    const esComentarioAutomatico = comentarioActual.startsWith('Cantidad modificada:');
    
    // Si hay diferencia con lo pedido
    if (nuevasUnidades !== unidadesPedidas) {
      // Actualizar o crear comentario automático
      newItems[index].ComentarioRecepcion = `Cantidad modificada: recibidas ${nuevasUnidades} de ${unidadesPedidas} pedidas`;
    } else if (esComentarioAutomatico) {
      // Si ahora está completo y había comentario automático, cambiarlo a completo
      newItems[index].ComentarioRecepcion = 'Todo recibido correctamente';
    }
    // Si no hay diferencia y no es comentario automático, no hacemos nada (se mantiene el comentario existente)
    
    setReceptionItems(newItems);
  };

  // 🔥 MEJORADO: Función para manejar cambios en comentarios
  const handleCommentChange = (index, value) => {
    const newItems = [...receptionItems];
    
    // Solo actualizar si el usuario está escribiendo manualmente
    // No sobrescribir si es un comentario automático que el usuario está modificando
    newItems[index].ComentarioRecepcion = value;
    
    setReceptionItems(newItems);
  };

  // 🔥 NUEVA FUNCIÓN: Finalizar pedido (marcar como servido)
  const handleFinalizeOrder = async () => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      setError('No hay sesión activa. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      setFinalizing(true);
      setError('');
      setSuccess('');

      console.log('🔚 Finalizando pedido:', orderId);

      const response = await fetchWithAuth(`/api/reception/${orderId}/finalize`, {
        method: 'POST',
        body: {
          usuario: storedUser.username,
          codigoempresa: storedUser.codigoCliente
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ El servidor devolvió:', text.substring(0, 200));
        throw new Error(`El servidor devolvió un formato inválido`);
      }

      const data = await response.json();
      console.log('✅ Respuesta del servidor:', data);
      
      if (data.success) {
        setSuccess('Pedido marcado como servido correctamente');
        setOrder(prev => ({ ...prev, Estado: 2 }));
        
        setTimeout(() => {
          navigate(`/mis-pedidos/${orderId}`, { 
            state: { 
              message: 'Pedido finalizado y marcado como servido'
            } 
          });
        }, 2000);
      } else {
        setError(data.message || 'Error al finalizar el pedido');
      }
    } catch (err) {
      console.error('❌ Error finalizando pedido:', err);
      
      if (err.message.includes('Sesión expirada') || err.message.includes('Acceso denegado')) {
        setError(err.message);
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 2000);
      } else {
        setError(err.message || 'Error al finalizar el pedido');
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleSubmit = async () => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      setError('No hay sesión activa. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      setAlbaranesGenerados([]);

      console.log('🔄 Enviando confirmación para order:', orderId);

      // 🔥 CORREGIDO: Incluir "Todo recibido correctamente" como comentario válido
      const itemsWithDifferences = receptionItems.filter(item => 
        item.UnidadesRecibidas !== item.UnidadesPedidas && 
        !item.ComentarioRecepcion.trim() &&
        item.ComentarioRecepcion !== 'Todo recibido correctamente'
      );
      
      if (itemsWithDifferences.length > 0) {
        const itemCodes = itemsWithDifferences.map(item => item.CodigoArticulo).join(', ');
        setError(`Debe agregar comentarios para los artículos: ${itemCodes} ya que la cantidad recibida difiere de la pedida`);
        setSubmitting(false);
        return;
      }

      const requestBody = {
        items: receptionItems,
        usuario: storedUser.username,
        codigoempresa: storedUser.codigoCliente,
        timestamp: new Date().toISOString()
      };

      console.log('📤 Enviando datos:', requestBody);

      const response = await fetchWithAuth(`/api/reception/${orderId}/confirm`, {
        method: 'POST',
        body: requestBody
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ El servidor devolvió:', text.substring(0, 200));
        throw new Error(`El servidor devolvió un formato inválido`);
      }

      const data = await response.json();
      console.log('✅ Respuesta del servidor:', data);
      
      if (data.success) {
        setSuccess('Recepción confirmada correctamente');
        
        // 🔥 CORRECCIÓN: Asegurar que albaranesGenerados sea siempre un array
        const albaranesData = data.detallesAlbaranes || [];
        const albaranesArray = Array.isArray(albaranesData) ? albaranesData : [];
        setAlbaranesGenerados(albaranesArray);
        
        setOrder(prev => ({
          ...prev,
          Estado: data.estado || 2
        }));

        // Actualizar las cantidades recibidas en el estado local
        const updatedItems = [...receptionItems];
        
        // 🔥 CORRECCIÓN: Verificar que albaranesArray es un array antes de mapear
        if (Array.isArray(albaranesArray) && albaranesArray.length > 0) {
          albaranesArray.forEach(albaran => {
            if (albaran.itemsDetalle && Array.isArray(albaran.itemsDetalle)) {
              albaran.itemsDetalle.forEach(itemAlbaran => {
                const itemIndex = updatedItems.findIndex(item => 
                  item.CodigoArticulo === itemAlbaran.CodigoArticulo && 
                  item.CodigoProveedor === albaran.proveedor
                );
                if (itemIndex !== -1) {
                  updatedItems[itemIndex].UnidadesRecibidas = itemAlbaran.UnidadesRecibidas;
                }
              });
            }
          });
        }
        setReceptionItems(updatedItems);

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
      console.error('❌ Error confirming reception:', err);
      
      // 🔥 MEJORADO: Manejo específico de errores
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
    
    const totalPedido = receptionItems.reduce((sum, item) => sum + (item.UnidadesPedidas || 0), 0);
    const totalRecibido = receptionItems.reduce((sum, item) => sum + (item.UnidadesRecibidas || 0), 0);
    
    if (totalRecibido === 0) return 0;
    if (totalRecibido === totalPedido) return 2;
    return 1;
  };

  const currentStatus = calculateCurrentStatus();

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
          <div className="orr-status">
            Estado actual: <span className={`orr-status-badge orr-status-${currentStatus}`}>
              {getStatusText(currentStatus)}
            </span>
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
              <p><strong>Albaranes de compra generados:</strong> {albaranesGenerados.length}</p>
            </div>
          )}
          <p>Redirigiendo al detalle del pedido...</p>
        </div>
      )}

      {/* 🔥 CORRECCIÓN: Verificar que albaranesGenerados es un array antes de mapear */}
      {albaranesGenerados && Array.isArray(albaranesGenerados) && albaranesGenerados.length > 0 && (
        <div className="orr-albaranes-generados">
          <h3>📦 Albaranes de Compra Generados</h3>
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
                  <p><strong>Items:</strong> {albaran.items}</p>
                  <p><strong>Total:</strong> {albaran.total?.toFixed(2)} €</p>
                  <p><strong>Estado:</strong> {albaran.esParcial ? 'Recepción Parcial' : 'Completo'}</p>
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
          <p>Confirme las cantidades recibidas y agregue comentarios si es necesario</p>
          <p className="orr-warning-text">
            ⚠️ <strong>Importante:</strong> Si la cantidad recibida es diferente a la pedida, debe agregar un comentario explicando la diferencia.
          </p>
          <p className="orr-info-text">
            💡 <strong>Nota:</strong> Al confirmar la recepción, se generarán automáticamente los albaranes de compra correspondientes.
          </p>
        </div>
        
        <table className="orr-reception-table">
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Código</th>
              <th>Proveedor</th>
              <th>Pedido</th>
              <th>Recibido</th>
              <th>Pendiente</th>
              <th>Comentarios</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {receptionItems.map((item, index) => {
              const hasDifference = item.UnidadesRecibidas !== item.UnidadesPedidas;
              // 🔥 CORREGIDO: Incluir "Todo recibido correctamente" como comentario válido
              const needsComment = hasDifference && 
                !item.ComentarioRecepcion.trim() && 
                item.ComentarioRecepcion !== 'Todo recibido correctamente';
              const pendiente = (item.UnidadesPedidas || 0) - (item.UnidadesRecibidas || 0);
              
              return (
                <tr key={index} className={`${hasDifference ? 'orr-partial-reception' : ''} ${needsComment ? 'orr-needs-comment' : ''}`}>
                  <td className="orr-item-description">{item.DescripcionArticulo}</td>
                  <td className="orr-item-code">{item.CodigoArticulo}</td>
                  <td className="orr-item-proveedor">{item.CodigoProveedor || 'No especificado'}</td>
                  <td className="orr-item-ordered">{item.UnidadesPedidas}</td>
                  <td className="orr-item-received">
                    <input
                      type="number"
                      min="0"
                      max={item.UnidadesPedidas}
                      value={item.UnidadesRecibidas}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      disabled={order?.Estado === 2}
                      className="orr-quantity-input"
                    />
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

      {/* 🔥 NUEVA SECCIÓN: Botón para finalizar pedido */}
      {order?.Estado !== 2 && (
        <div className="orr-finalize-section">
          <div className="orr-finalize-header">
            <h3>🔚 Finalizar Pedido</h3>
            <div className="orr-finalize-info">
              <p>
                <strong>¿No va a recepcionar más unidades?</strong> Puede marcar el pedido como servido para eliminarlo de la lista de pendientes.
              </p>
              <p className="orr-finalize-warning">
                ⚠️ Esta acción establecerá todas las unidades pendientes a 0 y marcará el pedido como completamente servido.
              </p>
            </div>
          </div>
          <button 
            onClick={handleFinalizeOrder}
            disabled={finalizing}
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