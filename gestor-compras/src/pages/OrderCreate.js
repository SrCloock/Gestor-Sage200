import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductGrid from '../components/ProductGrid';
import { FaSearch, FaCalendarAlt, FaArrowLeft, FaCheck, FaTrash, FaPlus, FaMinus } from 'react-icons/fa';
import '../styles/OrderCreate.css';

// Hook personalizado para productos
const useProducts = (user, location) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const generateProductKey = useCallback((product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}-${user?.codigoCliente || '00'}`;
  }, [user]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/products', {
          params: { limit: 100 } // Limitar inicialmente
        });

        if (response.data.success) {
          setProducts(response.data.products);
        }
      } catch (err) {
        setError('Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProducts();
  }, [user]);

  return { products, loading, error, generateProductKey };
};

const OrderCreate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const { products, loading: productsLoading, generateProductKey } = useProducts(user, location);
  
  const [orderItems, setOrderItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const [comment, setComment] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const productsPerPage = 20;

  // Filtrado y paginación optimizados
  const { filteredProducts, totalPages } = useMemo(() => {
    let result = [...products];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) =>
      sortOrder === 'asc'
        ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo)
    );

    const totalPages = Math.ceil(result.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const paginatedProducts = result.slice(startIndex, startIndex + productsPerPage);

    return {
      filteredProducts: paginatedProducts,
      totalPages,
      totalProducts: result.length
    };
  }, [products, searchTerm, sortOrder, currentPage, productsPerPage]);

  // Efecto para producto seleccionado desde el catálogo
  useEffect(() => {
    if (location.state?.selectedProduct) {
      const selectedProduct = location.state.selectedProduct;
      handleAddItem(selectedProduct);
      // Limpiar el estado de navegación
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Manejar añadir producto
  const handleAddItem = useCallback((product) => {
    setOrderItems(prev => {
      const existingIndex = prev.findIndex(item =>
        generateProductKey(item) === generateProductKey(product)
      );

      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          Cantidad: newItems[existingIndex].Cantidad + 1
        };
        return newItems;
      } else {
        return [
          ...prev,
          {
            ...product,
            Cantidad: 1,
            CodigoCliente: user?.codigoCliente,
            CifDni: user?.cifDni
          }
        ];
      }
    });
  }, [generateProductKey, user]);

  // Manejar eliminar producto
  const handleRemoveItem = useCallback((itemToRemove) => {
    setOrderItems(prev => 
      prev.filter(item => generateProductKey(item) !== generateProductKey(itemToRemove))
    );
  }, [generateProductKey]);

  // Manejar cambio de cantidad
  const handleUpdateQuantity = useCallback((itemToUpdate, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    setOrderItems(prev => 
      prev.map(item => 
        generateProductKey(item) === generateProductKey(itemToUpdate)
          ? { ...item, Cantidad: quantity }
          : item
      )
    );
  }, [generateProductKey]);

  // Validar y revisar pedido
  const handleReviewOrder = useCallback(() => {
    if (orderItems.length === 0) {
      setError('Debe agregar al menos un producto al pedido');
      return;
    }
    setError('');
    setReviewMode(true);
  }, [orderItems.length]);

  // Enviar pedido
  const handleSubmitOrder = async () => {
    try {
      setError('');
      setSubmitLoading(true);

      if (!user?.codigoCliente) {
        throw new Error('Datos de usuario incompletos');
      }

      // Preparar items sin duplicados
      const itemsMap = new Map();
      const itemsToSend = [];
      
      orderItems.forEach(item => {
        const key = generateProductKey(item);
        if (!itemsMap.has(key)) {
          itemsMap.set(key, true);
          itemsToSend.push({
            CodigoArticulo: item.CodigoArticulo,
            DescripcionArticulo: item.DescripcionArticulo,
            Cantidad: Number(item.Cantidad),
            PrecioCompra: item.PrecioCompra || item.PrecioVenta,
            CodigoProveedor: item.CodigoProveedor || null,
            CodigoCliente: user.codigoCliente,
            CifDni: user.cifDni
          });
        }
      });

      const orderData = {
        items: itemsToSend,
        deliveryDate: deliveryDate || null,
        comment: comment.trim() || null
      };

      const response = await api.post('/api/orders', orderData);

      if (response.data.success) {
        navigate('/mis-pedidos', {
          state: {
            success: true,
            message: `Pedido #${response.data.orderId} creado correctamente`,
            orderId: response.data.orderId
          }
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al crear el pedido');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Modo revisión
  if (reviewMode) {
    return (
      <div className="oc-review-container">
        <div className="oc-review-header">
          <button onClick={() => setReviewMode(false)} className="oc-back-button">
            <FaArrowLeft />
            Volver a editar
          </button>
          <h2>Revisar Pedido</h2>
          <p>Verifique los detalles antes de confirmar</p>
        </div>
        
        <div className="oc-review-content">
          <div className="oc-review-card">
            <h3>Resumen del Pedido</h3>
            
            <div className="oc-review-items">
              {orderItems.map((item, index) => (
                <div key={generateProductKey(item) + index} className="oc-review-item">
                  <div className="oc-item-info">
                    <h4>{item.DescripcionArticulo}</h4>
                    <p>Código: {item.CodigoArticulo}</p>
                    {item.NombreProveedor && <p>Proveedor: {item.NombreProveedor}</p>}
                  </div>
                  <div className="oc-item-quantity">
                    <span>Cantidad: {item.Cantidad}</span>
                    <span className="oc-item-total">
                      Total: {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format((item.PrecioCompra || item.PrecioVenta || 0) * item.Cantidad)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="oc-review-details">
              {deliveryDate && (
                <div className="oc-detail-item">
                  <FaCalendarAlt />
                  <span>Entrega: {new Date(deliveryDate).toLocaleDateString('es-ES')}</span>
                </div>
              )}
              
              {comment && (
                <div className="oc-detail-item">
                  <span>Comentarios: {comment}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="oc-review-actions">
            <button 
              onClick={handleSubmitOrder} 
              disabled={submitLoading}
              className="oc-submit-button"
            >
              {submitLoading ? (
                <>
                  <div className="oc-spinner"></div>
                  Creando pedido...
                </>
              ) : (
                <>
                  <FaCheck />
                  Confirmar Pedido
                </>
              )}
            </button>
            <button 
              onClick={() => setReviewMode(false)}
              className="oc-cancel-button"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modo edición
  return (
    <div className="oc-container">
      <div className="oc-header">
        <button onClick={() => navigate('/catalogo')} className="oc-back-button">
          <FaArrowLeft />
          Volver al Catálogo
        </button>
        <h2>Crear Nuevo Pedido</h2>
        <div className="oc-header-stats">
          <span>{orderItems.length} productos en el pedido</span>
        </div>
      </div>

      {error && (
        <div className="oc-error-message">
          <span>{error}</span>
          <button onClick={() => setError('')} className="oc-error-close">×</button>
        </div>
      )}

      <div className="oc-content">
        {/* Resumen del pedido */}
        <aside className="oc-order-sidebar">
          <div className="oc-order-summary">
            <h3>Tu Pedido</h3>
            
            {orderItems.length === 0 ? (
              <div className="oc-empty-order">
                <p>No hay productos en el pedido</p>
                <small>Añade productos desde el catálogo</small>
              </div>
            ) : (
              <div className="oc-order-items">
                {orderItems.map((item, index) => (
                  <div key={generateProductKey(item) + index} className="oc-order-item">
                    <div className="oc-item-main">
                      <div className="oc-item-info">
                        <h4>{item.DescripcionArticulo}</h4>
                        <span className="oc-item-code">{item.CodigoArticulo}</span>
                      </div>
                      <div className="oc-item-controls">
                        <div className="oc-quantity-controls">
                          <button
                            onClick={() => handleUpdateQuantity(item, item.Cantidad - 1)}
                            className="oc-quantity-btn"
                          >
                            <FaMinus />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.Cantidad}
                            onChange={(e) => handleUpdateQuantity(item, e.target.value)}
                            className="oc-quantity-input"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(item, item.Cantidad + 1)}
                            className="oc-quantity-btn"
                          >
                            <FaPlus />
                          </button>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="oc-remove-button"
                          title="Eliminar producto"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="oc-item-price">
                      {new Intl.NumberFormat('es-ES', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format((item.PrecioCompra || item.PrecioVenta || 0) * item.Cantidad)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detalles adicionales */}
            <div className="oc-order-details">
              <div className="oc-delivery-section">
                <label htmlFor="deliveryDate">
                  <FaCalendarAlt />
                  Fecha de entrega deseada:
                </label>
                <input
                  type="date"
                  id="deliveryDate"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="oc-comment-section">
                <label htmlFor="comment">Comentarios:</label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows="3"
                  placeholder="Instrucciones especiales, comentarios..."
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="oc-sidebar-actions">
              <button
                onClick={handleReviewOrder}
                disabled={orderItems.length === 0}
                className="oc-review-button"
              >
                <FaCheck />
                Revisar y Confirmar
              </button>
            </div>
          </div>
        </aside>

        {/* Catálogo de productos */}
        <main className="oc-product-catalog">
          <div className="oc-catalog-header">
            <div className="oc-search-container">
              <FaSearch className="oc-search-icon" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="oc-search-input"
              />
            </div>
            
            <div className="oc-sort-container">
              <select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value);
                  setCurrentPage(1);
                }}
                className="oc-sort-select"
              >
                <option value="asc">Nombre A-Z</option>
                <option value="desc">Nombre Z-A</option>
              </select>
            </div>
          </div>

          {productsLoading ? (
            <div className="oc-loading-products">
              <div className="oc-spinner"></div>
              <p>Cargando productos...</p>
            </div>
          ) : (
            <ProductGrid
              products={filteredProducts}
              onAddProduct={handleAddItem}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              searchTerm={searchTerm}
              generateProductKey={generateProductKey}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default OrderCreate;