import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductGrid from '../components/ProductGrid';
import { FaCalendarAlt, FaSearch, FaSort, FaTrash, FaArrowLeft } from 'react-icons/fa';
import '../styles/OrderEdit.css';

const OrderEdit = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [originalItems, setOriginalItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState({ order: true, products: true, submit: false });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [comment, setComment] = useState('');
  const productsPerPage = 20;

  // Función mejorada para generar claves únicas
  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}-${product.CodigoFamilia || 'NF'}-${product.CodigoSubfamilia || 'NS'}`;
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, order: true }));
        setError('');
        console.log('Cargando detalles del pedido:', orderId);
        
        const response = await api.get(`/api/orders/${orderId}`, {
          params: {
            codigoCliente: user?.codigoCliente,
            seriePedido: 'WebCD'
          }
        });
        
        const order = response.data.order;
        console.log('Pedido cargado:', order);
        
        // VERIFICAR SI SE PUEDE EDITAR (solo en estado "Revisando")
        if (order.StatusAprobado !== 0) {
          setError('Este pedido no se puede editar porque ya ha sido aprobado. Solo se pueden editar pedidos en estado "Revisando".');
          setLoading(prev => ({ ...prev, order: false }));
          return;
        }
        
        if (order && order.productos) {
          const itemsWithQuantity = order.productos.map(item => ({
            ...item,
            Cantidad: item.UnidadesPedidas || 1
          }));
          
          setOriginalItems(itemsWithQuantity);
          setOrderItems(itemsWithQuantity);
          
          setDeliveryDate(order.FechaNecesaria?.split('T')[0] || '');
          // CORREGIDO: Cargar el comentario correctamente desde ObservacionesPedido
          setComment(order.ObservacionesPedido || '');
        } else {
          setError('No se encontraron productos en el pedido');
        }
        
      } catch (err) {
        console.error('Error cargando detalles del pedido:', err);
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else {
          setError('Error al cargar los detalles del pedido: ' + (err.message || 'Error desconocido'));
        }
      } finally {
        setLoading(prev => ({ ...prev, order: false }));
      }
    };

    const fetchProducts = async () => {
      try {
        setLoading(prev => ({ ...prev, products: true }));
        const response = await api.get('/api/products');
        
        let productsData = response.data.products || response.data;
        
        // Eliminar duplicados usando la clave única
        const uniqueProducts = [];
        const seenKeys = new Set();
        
        productsData.forEach(product => {
          const key = generateProductKey(product);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueProducts.push(product);
          }
        });
        
        setProducts(uniqueProducts);
        setFilteredProducts(uniqueProducts);
      } catch (err) {
        console.error('Error cargando productos:', err);
        setError('Error al cargar productos: ' + (err.message || 'Error desconocido'));
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };

    if (user?.codigoCliente) {
      fetchOrderDetails();
      fetchProducts();
    } else {
      setError('No se pudo identificar el cliente');
      setLoading({ order: false, products: false, submit: false });
    }
  }, [orderId, user]);

  useEffect(() => {
    let result = [...products];
    
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(product => {
        const matchesCode = product.CodigoArticulo?.toLowerCase().includes(term);
        const matchesDesc = product.DescripcionArticulo?.toLowerCase().includes(term);
        const matchesSupplier = product.NombreProveedor?.toLowerCase().includes(term);
        return matchesCode || matchesDesc || matchesSupplier;
      });
    }

    // Eliminar duplicados nuevamente después del filtrado
    const uniqueProducts = [];
    const seenKeys = new Set();
    
    result.forEach(product => {
      const key = generateProductKey(product);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueProducts.push(product);
      }
    });

    uniqueProducts.sort((a, b) =>
      sortOrder === 'asc'
        ? (a.DescripcionArticulo || '').localeCompare(b.DescripcionArticulo || '')
        : (b.DescripcionArticulo || '').localeCompare(a.DescripcionArticulo || '')
    );

    setFilteredProducts(uniqueProducts);
    setCurrentPage(1);
  }, [searchTerm, sortOrder, products]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleAddItem = (product) => {
    setOrderItems((prev) => {
      const existingItem = prev.find(item =>
        generateProductKey(item) === generateProductKey(product)
      );

      if (existingItem) {
        return prev.map(item =>
          generateProductKey(item) === generateProductKey(product)
            ? { ...item, Cantidad: item.Cantidad + 1 }
            : item
        );
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
  };

  const handleRemoveItem = (itemToRemove) => {
    setOrderItems(prev => 
      prev.filter(item => 
        generateProductKey(item) !== generateProductKey(itemToRemove)
      )
    );
  };

  const handleUpdateQuantity = (itemToUpdate, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    setOrderItems(prev => 
      prev.map(item => 
        generateProductKey(item) === generateProductKey(itemToUpdate)
          ? { ...item, Cantidad: quantity }
          : item
      )
    );
  };

  const handleSubmitChanges = async () => {
    try {
      setError('');
      setLoading(prev => ({ ...prev, submit: true }));

      const itemsToSend = orderItems.map(item => ({
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        Cantidad: Number(item.Cantidad),
        PrecioCompra: item.PrecioCompra || item.Precio,
        CodigoProveedor: item.CodigoProveedor || null,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      console.log('Enviando datos de actualización:', {
        items: itemsToSend,
        deliveryDate: deliveryDate || null,
        comment: comment // CORREGIDO: Enviar el comentario
      });

      const response = await api.put(`/api/orders/${orderId}`, {
        items: itemsToSend,
        deliveryDate: deliveryDate || null,
        comment: comment // CORREGIDO: Esto mantendrá el comentario
      });

      if (response.data.success) {
        navigate('/mis-pedidos', {
          state: {
            success: true,
            message: 'Pedido actualizado correctamente'
          }
        });
      } else {
        setError(response.data.message || 'Error al actualizar el pedido');
      }
    } catch (err) {
      console.error('Error al actualizar pedido:', err);
      if (err.response?.status === 401) {
        setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al actualizar el pedido');
      }
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading.order || loading.products) {
    return (
      <div className="oe-loading-container">
        <div className="oe-spinner"></div>
        <p>Cargando datos del pedido...</p>
      </div>
    );
  }

  if (error && !loading.order && !loading.products) {
    return (
      <div className="oe-error-container">
        <div className="oe-error-icon">⚠️</div>
        <p>{error}</p>
        <div className="oe-error-actions">
          <button onClick={handleRefresh} className="oe-retry-button">
            Reintentar
          </button>
          <button onClick={() => navigate('/mis-pedidos')} className="oe-back-button">
            Volver al Historial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="oe-container">
      <div className="oe-header">
        <button onClick={() => navigate('/mis-pedidos')} className="oe-back-button">
          <FaArrowLeft className="oe-back-icon" />
          Volver al Historial
        </button>
        <div className="oe-title-section">
          <h2>Editar Pedido #{orderId}</h2>
          <p>Modifique los productos y detalles de su pedido</p>
        </div>
      </div>

      {error && (
        <div className="oe-error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="oe-error-close">×</button>
        </div>
      )}

      <div className="oe-delivery-section">
        <div className="oe-delivery-input">
          <FaCalendarAlt className="oe-delivery-icon" />
          <label htmlFor="deliveryDate">Nueva fecha de entrega (opcional):</label>
          <input
            type="date"
            id="deliveryDate"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="oe-date-input"
          />
          {deliveryDate && (
            <button 
              className="oe-clear-date"
              onClick={() => setDeliveryDate('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="oe-controls-panel">
        <div className="oe-search-container">
          <FaSearch className="oe-search-icon" />
          <input
            type="text"
            placeholder="Buscar productos por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="oe-search-input"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="oe-clear-search"
            >
              ×
            </button>
          )}
        </div>

        <div className="oe-filter-container">
          <FaSort className="oe-filter-icon" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="oe-filter-select"
          >
            <option value="asc">Ordenar A-Z</option>
            <option value="desc">Ordenar Z-A</option>
          </select>
        </div>
      </div>

      <div className="oe-main-content">
        <div className="oe-order-summary">
          <div className="oe-summary-header">
            <h3>Productos en el Pedido</h3>
            <span className="oe-items-count">{orderItems.length} productos</span>
          </div>
          
          {deliveryDate && (
            <div className="oe-delivery-info">
              <FaCalendarAlt className="oe-info-icon" />
              <span>Entrega: {new Date(deliveryDate).toLocaleDateString()}</span>
            </div>
          )}

          <div className="oe-comment-section">
            <label>Comentarios:</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              placeholder="Agregue comentarios sobre el pedido..."
              className="oe-comment-textarea"
            />
          </div>

          {orderItems.length === 0 ? (
            <div className="oe-empty-cart">
              <p>No hay productos en el pedido</p>
              <p>Agregue productos desde el catálogo</p>
            </div>
          ) : (
            <div className="oe-order-items">
              {orderItems.map((item) => (
                <div key={generateProductKey(item)} className="oe-order-item">
                  <div className="oe-item-details">
                    <h4>{item.DescripcionArticulo}</h4>
                    <div className="oe-item-meta">
                      <p><strong>Código:</strong> {item.CodigoArticulo}</p>
                      {item.NombreProveedor && <p><strong>Proveedor:</strong> {item.NombreProveedor}</p>}
                      {item.Familia && <p><strong>Familia:</strong> {item.Familia}</p>}
                      <p><strong>Precio:</strong> {(item.PrecioCompra || item.Precio || 0).toFixed(2)} €</p>
                    </div>
                  </div>
                  <div className="oe-item-controls">
                    <div className="oe-quantity-section">
                      <label>Cantidad:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.Cantidad}
                        onChange={(e) => handleUpdateQuantity(item, e.target.value)}
                        className="oe-quantity-input"
                      />
                    </div>
                    <div className="oe-subtotal">
                      <strong>Subtotal:</strong> {((item.PrecioCompra || item.Precio || 0) * item.Cantidad).toFixed(2)} €
                    </div>
                    <button
                      className="oe-remove-button"
                      onClick={() => handleRemoveItem(item)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="oe-total-section">
            <div className="oe-total-line">
              <span>Total del pedido:</span>
              <span className="oe-total-amount">
                {orderItems.reduce((total, item) => {
                  const precio = item.PrecioCompra || item.Precio || 0;
                  return total + (precio * item.Cantidad);
                }, 0).toFixed(2)} €
              </span>
            </div>
          </div>

          <div className="oe-actions">
            <button
              onClick={handleSubmitChanges}
              disabled={loading.submit || orderItems.length === 0}
              className="oe-submit-button"
            >
              {loading.submit ? (
                <>
                  <div className="oe-button-spinner"></div>
                  Guardando cambios...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
            <button
              onClick={() => navigate('/mis-pedidos')}
              className="oe-cancel-button"
            >
              Cancelar
            </button>
          </div>
        </div>

        <div className="oe-product-selection">
          <div className="oe-products-header">
            <h3>Seleccionar Productos ({filteredProducts.length} disponibles)</h3>
          </div>

          <ProductGrid
            products={currentProducts}
            onAddProduct={handleAddItem}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            generateProductKey={generateProductKey}
            loading={loading.products}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderEdit;