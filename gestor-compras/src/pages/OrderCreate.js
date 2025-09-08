import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductGrid from '../components/ProductGrid';
import { FaSearch, FaCalendarAlt, FaArrowLeft, FaCheck } from 'react-icons/fa';
import '../styles/OrderCreate.css';

const OrderCreate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState({ products: true, submit: false });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const [comment, setComment] = useState('');
  const productsPerPage = 20;

  const generateProductKey = (product) => {
    const str = `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };

  const checkImageExists = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const getProductImage = async (product) => {
    const localImagePath = `/images/${product.CodigoArticulo}.jpg`;
    const exists = await checkImageExists(localImagePath);
    if (exists) return localImagePath;
    if (product.RutaImagen) return product.RutaImagen;
    return '/images/default.jpg';
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/products');
        const productsWithImages = await Promise.all(response.data.map(async (product) => {
          const imagePath = await getProductImage(product);
          return { ...product, FinalImage: imagePath };
        }));
        
        const uniqueProducts = [];
        const seenKeys = new Set();
        
        productsWithImages.forEach(product => {
          const key = generateProductKey(product);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueProducts.push(product);
          }
        });
        
        const sortedProducts = uniqueProducts.sort((a, b) =>
          a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        );
        
        setProducts(sortedProducts);
        setFilteredProducts(sortedProducts);
      } catch (err) {
        console.error(err);
        setError('Error al cargar productos');
      } finally {
        setLoading((prev) => ({ ...prev, products: false }));
      }
    };

    fetchProducts();

    if (location.state?.selectedProduct) {
      setOrderItems([{
        ...location.state.selectedProduct,
        Cantidad: 1,
        CodigoCliente: user?.codigoCliente,
        CifDni: user?.cifDni
      }]);
    }
  }, [location, user]);

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
        ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo)
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

  const handleReviewOrder = () => {
    if (orderItems.length === 0) {
      setError('Debe agregar al menos un producto al pedido');
      return;
    }
    setReviewMode(true);
  };

  const handleBackToEdit = () => {
    setReviewMode(false);
  };

  const handleSubmitOrder = async () => {
    try {
      setError('');
      setLoading((prev) => ({ ...prev, submit: true }));

      if (!user?.codigoCliente || !user?.cifDni) {
        throw new Error('Datos de usuario incompletos. Por favor, inicie sesión nuevamente.');
      }

      const itemsToSend = orderItems.map(item => ({
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        Cantidad: Number(item.Cantidad),
        PrecioCompra: item.PrecioCompra,
        CodigoProveedor: item.CodigoProveedor || null,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      const orderData = {
        items: itemsToSend,
        deliveryDate: deliveryDate || null,
        comment: comment
      };

      const response = await api.post('/api/orders', orderData);

      navigate('/revisar-pedido', {
        state: {
          orderId: response.data.orderId,
          seriePedido: response.data.seriePedido,
          deliveryDate: deliveryDate,
          comment: comment,
          success: true
        }
      });
    } catch (err) {
      console.error('Error al crear pedido:', err);
      setError(err.response?.data?.message || err.message || 'Error al crear el pedido');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleRemoveItem = (itemToRemove) => {
    setOrderItems(prev => 
      prev.filter(item => generateProductKey(item) !== generateProductKey(itemToRemove))
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

  if (reviewMode) {
    return (
      <div className="oc-review-container">
        <div className="oc-review-header">
          <button onClick={handleBackToEdit} className="oc-back-button">
            <FaArrowLeft />
            Volver a editar
          </button>
          <h2>Revisar Pedido</h2>
          <p>Por favor revise los detalles de su pedido antes de confirmar</p>
        </div>
        
        <div className="oc-review-card">
          <div className="oc-review-summary">
            <h3>Resumen del Pedido</h3>
            <div className="oc-summary-details">
              <p><strong>Número de productos:</strong> {orderItems.length}</p>
              {deliveryDate && (
                <p><strong>Fecha de entrega:</strong> {new Date(deliveryDate).toLocaleDateString()}</p>
              )}
            </div>
          </div>
          
          <div className="oc-review-items">
            <h4>Productos en el pedido</h4>
            {orderItems.map((item) => (
              <div key={generateProductKey(item)} className="oc-review-item">
                <div className="oc-item-info">
                  <h5>{item.DescripcionArticulo}</h5>
                  <p>Código: {item.CodigoArticulo}</p>
                  {item.CodigoProveedor && <p>Proveedor: {item.CodigoProveedor}</p>}
                </div>
                <div className="oc-item-quantity">
                  <span>Cantidad: {item.Cantidad}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="oc-review-comment">
            <label>Comentarios para el pedido:</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              placeholder="Escriba aquí cualquier observación adicional..."
              className="oc-comment-textarea"
            />
          </div>
          
          <div className="oc-review-actions">
            <button onClick={handleSubmitOrder} className="oc-confirm-button" disabled={loading.submit}>
              {loading.submit ? (
                <>
                  <div className="oc-button-spinner"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <FaCheck />
                  Confirmar Pedido
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading.products) return (
    <div className="oc-loading-container">
      <div className="oc-spinner"></div>
      <p>Cargando productos...</p>
    </div>
  );

  if (error) return (
    <div className="oc-error-container">
      <div className="oc-error-icon">⚠️</div>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="oc-container">
      <div className="oc-header">
        <h2>Crear Nuevo Pedido</h2>
        <p>Seleccione los productos que desea incluir en su pedido</p>
      </div>

      {error && (
        <div className="oc-error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="oc-error-close">×</button>
        </div>
      )}

      <div className="oc-delivery-section">
        <div className="oc-delivery-card">
          <FaCalendarAlt className="oc-delivery-icon" />
          <div className="oc-delivery-content">
            <label htmlFor="deliveryDate">Fecha de entrega deseada (opcional):</label>
            <input
              type="date"
              id="deliveryDate"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="oc-date-input"
            />
          </div>
          {deliveryDate && (
            <button 
              className="oc-clear-date"
              onClick={() => setDeliveryDate('')}
            >
              Limpiar fecha
            </button>
          )}
        </div>
      </div>

      <div className="oc-controls-panel">
        <div className="oc-search-container">
          <input
            type="text"
            placeholder="Buscar productos por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="oc-search-input"
          />
          <FaSearch className="oc-search-icon" />
        </div>

        <div className="oc-filter-container">
          <label className="oc-filter-label">Ordenar por:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="oc-filter-select"
          >
            <option value="asc">Ordenar A-Z</option>
            <option value="desc">Ordenar Z-A</option>
          </select>
        </div>
      </div>

      <div className="oc-main-content">
        <div className="oc-order-summary">
          <div className="oc-summary-header">
            <h3>Resumen del Pedido</h3>
            <span className="oc-items-count">{orderItems.length} productos</span>
          </div>
          
          {deliveryDate && (
            <div className="oc-delivery-info">
              <FaCalendarAlt className="oc-info-icon" />
              <span>Entrega: {new Date(deliveryDate).toLocaleDateString()}</span>
            </div>
          )}

          {orderItems.length === 0 ? (
            <div className="oc-empty-cart">
              <p>No hay productos en el pedido</p>
              <span>Agregue productos desde el catálogo</span>
            </div>
          ) : (
            <>
              <div className="oc-order-items">
                {orderItems.map((item) => (
                  <div key={generateProductKey(item)} className="oc-order-item">
                    <div className="oc-item-details">
                      <h4>{item.DescripcionArticulo}</h4>
                      <p>Código: {item.CodigoArticulo}</p>
                      {item.NombreProveedor && <p>Proveedor: {item.NombreProveedor}</p>}
                    </div>
                    <div className="oc-item-controls">
                      <div className="oc-quantity-control">
                        <button
                          onClick={() => handleUpdateQuantity(item, item.Cantidad - 1)}
                          className="oc-quantity-btn"
                        >
                          -
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
                          +
                        </button>
                      </div>
                      <button
                        className="oc-remove-button"
                        onClick={() => handleRemoveItem(item)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="oc-review-button"
                onClick={handleReviewOrder}
                disabled={orderItems.length === 0 || loading.submit}
              >
                {loading.submit ? 'Procesando...' : 'Revisar y Confirmar Pedido'}
              </button>
            </>
          )}
        </div>

        <div className="oc-product-section">
          <div className="oc-product-header">
            <h3>Catálogo de Productos</h3>
            <span className="oc-products-count">{filteredProducts.length} productos disponibles</span>
          </div>

          <ProductGrid
            products={currentProducts}
            onAddProduct={handleAddItem}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            generateProductKey={generateProductKey}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderCreate;