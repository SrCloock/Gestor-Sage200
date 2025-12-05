import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductCard from '../components/ProductCard';
import CatalogFilters from '../components/CatalogFilters';
import { 
  FaSearch, 
  FaCalendarAlt, 
  FaArrowLeft, 
  FaCheck, 
  FaFilter, 
  FaTrash, 
  FaBox, 
  FaTimes,
  FaComment,
  FaShoppingCart
} from 'react-icons/fa';
import '../styles/OrderCreate.css';

const ProductGrid = ({ products, onAddProduct, currentPage, totalPages, onPageChange, searchTerm, loading }) => {
  if (loading) {
    return (
      <div className="oc-products-loading">
        <div className="oc-loading-spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="oc-no-products">
        <div className="oc-no-products-icon">🔍</div>
        <h3>No se encontraron productos</h3>
        <p>{searchTerm ? 'Intenta ajustar los términos de búsqueda' : 'No hay productos disponibles'}</p>
      </div>
    );
  }

  return (
    <div className="oc-products-section">
      <div className="oc-products-grid">
        {products.map(product => (
          <ProductCard
            key={`${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}`}
            product={product}
            onAddToOrder={onAddProduct}
            showAddButton={true}
          />
        ))}
      </div>
      
      {totalPages > 1 && (
        <div className="oc-pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="oc-pagination-btn"
          >
            Anterior
          </button>
          <span className="oc-pagination-info">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="oc-pagination-btn"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

const ResumenPedido = ({ 
  items, 
  deliveryDate, 
  comment, 
  onUpdateQuantity, 
  onRemoveItem, 
  onDeliveryDateChange, 
  onCommentChange,
  lastAddedItem
}) => {
  const calcularTotal = () => {
    return items.reduce((total, item) => {
      const precio = item.PrecioVenta || 0;
      return total + (precio * (item.Cantidad || 1));
    }, 0);
  };

  if (items.length === 0) {
    return (
      <div className="oc-resumen-pedido">
        <div className="oc-resumen-header">
          <h3>
            <FaShoppingCart className="oc-header-icon" />
            Resumen del Pedido
          </h3>
          <span className="oc-total-items">0 productos</span>
        </div>
        <div className="oc-empty-cart">
          <FaBox className="oc-empty-cart-icon" />
          <p>No hay productos en el pedido</p>
          <p>Agregue productos desde el catálogo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="oc-resumen-pedido">
      <div className="oc-resumen-header">
        <div className="oc-header-left">
          <h3>
            <FaShoppingCart className="oc-header-icon" />
            Resumen del Pedido
          </h3>
        </div>
      </div>

      <div className="oc-order-info-section">
        <div className="oc-delivery-section">
          <div className="oc-delivery-input">
            <FaCalendarAlt className="oc-input-icon" />
            <div className="oc-input-group">
              <label htmlFor="deliveryDate">Fecha de entrega:</label>
              <input
                type="date"
                id="deliveryDate"
                value={deliveryDate}
                onChange={(e) => onDeliveryDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="oc-date-input"
              />
            </div>
          </div>
        </div>

        <div className="oc-comment-section">
          <div className="oc-comment-input">
            <FaComment className="oc-input-icon" />
            <div className="oc-input-group">
              <label>Comentarios:</label>
              <textarea 
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                rows="3"
                placeholder="Comentarios sobre el pedido..."
                className="oc-comment-textarea"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="oc-items-list-container">
        <div className="oc-items-list-header">
          <span>Productos seleccionados</span>
          <span>Total</span>
        </div>
        <div className="oc-items-list">
          {items.map((item, index) => {
            const itemKey = `${item.CodigoArticulo}-${item.CodigoProveedor || 'NP'}`;
            const isNewItem = itemKey === lastAddedItem;
            
            return (
              <div key={itemKey} className={`oc-order-item ${isNewItem ? 'new-item' : ''}`}>
                <div className="oc-item-info">
                  <div className="oc-item-image">
                    <img 
                      src={item.RutaImagen || '/images/default-product.jpg'} 
                      alt={item.DescripcionArticulo}
                      onError={(e) => {
                        e.target.src = '/images/default-product.jpg';
                      }}
                    />
                  </div>
                  <div className="oc-item-content">
                    <div className="oc-item-main-info">
                      <h4 className="oc-item-name" title={item.DescripcionArticulo}>
                        {item.DescripcionArticulo}
                      </h4>
                      <div className="oc-item-quantity-control">
                        <div className="oc-quantity-wrapper">
                          <label className="oc-quantity-label">Cantidad:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.Cantidad || 1}
                            onChange={(e) => onUpdateQuantity(item, parseInt(e.target.value) || 1)}
                            className="oc-quantity-input"
                          />
                        </div>
                        <div className="oc-item-subtotal">
                          {((item.PrecioVenta || 0) * (item.Cantidad || 1)).toFixed(2)} €
                        </div>
                      </div>
                    </div>
                    
                    <div className="oc-item-meta">
                      <span className="oc-item-code">
                        Código: <strong>{item.CodigoArticulo}</strong>
                      </span>
                      {item.NombreProveedor && (
                        <span className="oc-item-supplier">
                          Proveedor: <strong>{item.NombreProveedor}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onRemoveItem(item)}
                  className="oc-remove-item-btn"
                  title="Eliminar producto"
                >
                  <FaTrash />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="oc-order-total-section">
        <div className="oc-total-line">
          <span>Total del pedido:</span>
          <span className="oc-total-amount">{calcularTotal().toFixed(2)} €</span>
        </div>
        
        {deliveryDate && (
          <div className="oc-delivery-info">
            <FaCalendarAlt className="oc-info-icon" />
            <span>Fecha solicitada: {new Date(deliveryDate).toLocaleDateString('es-ES')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [filters, setFilters] = useState({
    proveedor: '',
    precioMin: '',
    precioMax: ''
  });
  const [sortBy, setSortBy] = useState('nombre');
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const [comment, setComment] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const productsPerPage = 12;

  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}`;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(prev => ({ ...prev, products: true }));
        setError('');
        
        const response = await api.get('/catalog/products', {
          params: { limit: 10000, page: 1 }
        });
        
        if (response.data.success) {
          setProducts(response.data.products);
          setFilteredProducts(response.data.products);
        } else {
          setError('Error al cargar los productos');
        }
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else {
          setError('Error al conectar con el servidor');
        }
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };

    fetchProducts();

    if (location.state?.selectedProduct) {
      const selectedProduct = location.state.selectedProduct;
      setOrderItems([{
        ...selectedProduct,
        Cantidad: 1,
        CodigoCliente: user?.codigoCliente,
        CifDni: user?.cifDni,
        addedAt: new Date().getTime()
      }]);
    }
  }, [location, user]);

  useEffect(() => {
    let result = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product => 
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term)
      );
    }

    if (filters.proveedor) {
      result = result.filter(product => 
        product.CodigoProveedor === filters.proveedor
      );
    }

    if (filters.precioMin) {
      result = result.filter(product => 
        product.PrecioVenta >= parseFloat(filters.precioMin)
      );
    }

    if (filters.precioMax) {
      result = result.filter(product => 
        product.PrecioVenta <= parseFloat(filters.precioMax)
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'nombre':
          return a.DescripcionArticulo.localeCompare(b.DescripcionArticulo);
        case 'precio-asc':
          return a.PrecioVenta - b.PrecioVenta;
        case 'precio-desc':
          return b.PrecioVenta - a.PrecioVenta;
        case 'proveedor':
          return a.NombreProveedor.localeCompare(b.NombreProveedor);
        default:
          return 0;
      }
    });

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [products, searchTerm, filters, sortBy]);

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
    const itemKey = generateProductKey(product);
    setLastAddedItem(itemKey);
    
    setOrderItems((prev) => {
      const existingItem = prev.find(item =>
        generateProductKey(item) === itemKey
      );

      if (existingItem) {
        const updatedItems = prev.map(item => 
          generateProductKey(item) === itemKey
            ? { 
                ...item, 
                Cantidad: (item.Cantidad || 0) + 1,
                addedAt: new Date().getTime() 
              }
            : item
        );
        
        return updatedItems.sort((a, b) => {
          const timeA = a.addedAt || 0;
          const timeB = b.addedAt || 0;
          return timeB - timeA;
        });
      } else {
        const newItem = {
          ...product,
          Cantidad: 1,
          CodigoCliente: user?.codigoCliente,
          CifDni: user?.cifDni,
          addedAt: new Date().getTime()
        };
        
        return [newItem, ...prev].sort((a, b) => {
          const timeA = a.addedAt || 0;
          const timeB = b.addedAt || 0;
          return timeB - timeA;
        });
      }
    });
    
    setTimeout(() => setLastAddedItem(null), 1000);
  };

  const handleRemoveItem = (itemToRemove) => {
    setOrderItems(prev => 
      prev.filter(item => generateProductKey(item) !== generateProductKey(itemToRemove))
    );
  };

  const handleUpdateQuantity = (itemToUpdate, newQuantity) => {
    const quantity = Math.max(1, parseInt(newQuantity) || 1);
    setOrderItems(prev => {
      const updatedItems = prev.map(item => 
        generateProductKey(item) === generateProductKey(itemToUpdate)
          ? { ...item, Cantidad: quantity }
          : item
      );
      
      return updatedItems.sort((a, b) => {
        const timeA = a.addedAt || 0;
        const timeB = b.addedAt || 0;
        return timeB - timeA;
      });
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

  const getSortedItems = () => {
    const items = [...orderItems];
    return items.sort((a, b) => {
      const timeA = a.addedAt || 0;
      const timeB = b.addedAt || 0;
      return timeB - timeA;
    });
  };

  const handleSubmitOrder = async () => {
    try {
      setLoading(prev => ({ ...prev, submit: true }));
      setError('');

      const itemsToSend = orderItems.map(item => ({
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        Cantidad: Number(item.Cantidad),
        PrecioVenta: item.PrecioVenta,
        CodigoProveedor: item.CodigoProveedor || null,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      const response = await api.post('/orders', {
        items: itemsToSend,
        deliveryDate: deliveryDate || null,
        comment: comment
      });

      if (response.data.success) {
        navigate('/revisar-pedido', {
          state: {
            orderId: response.data.orderId,
            seriePedido: response.data.seriePedido,
            deliveryDate: deliveryDate,
            items: orderItems,
            comment: comment,
            total: response.data.importeLiquido || calcularTotal()
          }
        });
      } else {
        setError(response.data.message || 'Error al procesar el pedido');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Su sesión ha expirada. Por favor, inicie sesión nuevamente.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al procesar el pedido');
      }
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const calcularTotal = () => {
    return orderItems.reduce((sum, item) => {
      const precio = item.PrecioVenta || 0;
      return sum + (precio * (item.Cantidad || 1));
    }, 0);
  };

  const hasActiveFilters = filters.proveedor || filters.precioMin || filters.precioMax;
  const sortedItems = getSortedItems();

  return (
    <div className="oc-container">
      <div className="oc-header">
        <div className="oc-header-left">
          <button onClick={() => navigate('/catalogo')} className="oc-back-button">
            <FaArrowLeft className="oc-back-icon" />
            Volver al Catálogo
          </button>
          <div className="oc-title-section">
            <FaShoppingCart className="oc-title-icon" />
            <div>
              <h2>Crear Nuevo Pedido</h2>
              <p className="oc-subtitle">Seleccione los productos y complete la información del pedido</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="oc-error-message">
          <div className="oc-error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => setError('')} className="oc-error-close">
            <FaTimes />
          </button>
        </div>
      )}

      <div className="oc-main-content">
        <div className="oc-product-selection">
          <div className="oc-controls-panel">
            <div className="oc-search-container">
              <FaSearch className="oc-search-icon" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, código o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="oc-search-input"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="oc-clear-search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="oc-sort-container">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="oc-sort-select"
              >
                <option value="nombre">Ordenar por nombre</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
                <option value="proveedor">Ordenar por proveedor</option>
              </select>
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="oc-toggle-filters"
            >
              <FaFilter />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              {hasActiveFilters && <span className="oc-active-filters-dot"></span>}
            </button>

            {hasActiveFilters && (
              <button 
                onClick={() => setFilters({ proveedor: '', precioMin: '', precioMax: '' })}
                className="oc-clear-filters"
              >
                <FaTimes />
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="oc-filters-section">
              <CatalogFilters 
                filters={filters}
                onFiltersChange={setFilters}
              />
            </div>
          )}

          <ProductGrid
            products={currentProducts}
            onAddProduct={handleAddItem}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            searchTerm={searchTerm}
            loading={loading.products}
          />
        </div>

        <div className="oc-order-summary">
          <ResumenPedido
            items={sortedItems}
            deliveryDate={deliveryDate}
            comment={comment}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onDeliveryDateChange={setDeliveryDate}
            onCommentChange={setComment}
            lastAddedItem={lastAddedItem}
          />

          {!reviewMode ? (
            <div className="oc-actions">
              <button
                onClick={handleReviewOrder}
                disabled={orderItems.length === 0}
                className="oc-review-button"
              >
                <FaCheck className="oc-review-icon" />
                Revisar Pedido
                {orderItems.length > 0 && (
                  <span className="oc-items-badge">{orderItems.length}</span>
                )}
              </button>
            </div>
          ) : (
            <div className="oc-review-actions">
              <button
                onClick={handleSubmitOrder}
                disabled={loading.submit}
                className="oc-submit-button"
              >
                {loading.submit ? (
                  <>
                    <div className="oc-button-spinner"></div>
                    Procesando...
                  </>
                ) : (
                  'Confirmar Pedido'
                )}
              </button>
              <button
                onClick={handleBackToEdit}
                className="oc-back-edit-button"
              >
                Volver a Editar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCreate;