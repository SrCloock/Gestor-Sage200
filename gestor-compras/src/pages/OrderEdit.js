import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  FaShoppingCart,
  FaSortAmountDown,
  FaSortAmountUp,
  FaSync,
  FaEdit
} from 'react-icons/fa';
import '../styles/OrderEdit.css';

const ProductGrid = ({ products, onAddProduct, currentPage, totalPages, onPageChange, searchTerm, loading }) => {
  if (loading) {
    return (
      <div className="oe-products-loading">
        <div className="oe-loading-spinner"></div>
        <p>Cargando productos...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="oe-no-products">
        <div className="oe-no-products-icon">🔍</div>
        <h3>No se encontraron productos</h3>
        <p>{searchTerm ? 'Intenta ajustar los términos de búsqueda' : 'No hay productos disponibles'}</p>
      </div>
    );
  }

  return (
    <div className="oe-products-section">
      <div className="oe-products-grid">
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
        <div className="oe-pagination">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="oe-pagination-btn"
          >
            Anterior
          </button>
          <span className="oe-pagination-info">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="oe-pagination-btn"
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
  sortOrder,
  onSortOrderChange,
  lastAddedItem,
  originalOrder
}) => {
  const calcularTotal = () => {
    return items.reduce((total, item) => {
      const precio = item.PrecioVenta || 0;
      return total + (precio * (item.Cantidad || 1));
    }, 0);
  };

  if (items.length === 0) {
    return (
      <div className="oe-resumen-pedido">
        <div className="oe-resumen-header">
          <div className="oe-header-left">
            <h3>
              <FaShoppingCart className="oe-header-icon" />
              Resumen del Pedido
            </h3>
          </div>
        </div>
        <div className="oe-empty-cart">
          <FaBox className="oe-empty-cart-icon" />
          <p>No hay productos en el pedido</p>
          <p>Agregue productos desde el catálogo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="oe-resumen-pedido">
      <div className="oe-resumen-header">
        <div className="oe-header-left">
          <h3>
            <FaShoppingCart className="oe-header-icon" />
            Resumen del Pedido
          </h3>
          <div className="oe-sort-order-control">
            <button 
              onClick={onSortOrderChange}
              className="oe-sort-order-btn"
              title={sortOrder === 'newest' ? 'Más recientes primero' : 'Más antiguos primero'}
            >
              {sortOrder === 'newest' ? <FaSortAmountDown /> : <FaSortAmountUp />}
              {sortOrder === 'newest' ? 'Recientes' : 'Antiguos'}
            </button>
          </div>
        </div>
        <span className="oe-total-items">{items.length} productos</span>
      </div>

      <div className="oe-order-info-section">
        <div className="oe-delivery-section">
          <div className="oe-delivery-input">
            <FaCalendarAlt className="oe-input-icon" />
            <div className="oe-input-group">
              <label htmlFor="deliveryDate">Fecha de entrega:</label>
              <input
                type="date"
                id="deliveryDate"
                value={deliveryDate}
                onChange={(e) => onDeliveryDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="oe-date-input"
              />
            </div>
          </div>
        </div>

        <div className="oe-comment-section">
          <div className="oe-comment-input">
            <FaComment className="oe-input-icon" />
            <div className="oe-input-group">
              <label>Comentarios:</label>
              <textarea 
                value={comment}
                onChange={(e) => onCommentChange(e.target.value)}
                rows="3"
                placeholder="Comentarios sobre el pedido..."
                className="oe-comment-textarea"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="oe-items-list-container">
        <div className="oe-items-list-header">
          <span>Productos seleccionados</span>
          <span>Total</span>
        </div>
        <div className="oe-items-list">
          {items.map((item, index) => {
            const itemKey = `${item.CodigoArticulo}-${item.CodigoProveedor || 'NP'}`;
            const isNewItem = itemKey === lastAddedItem;
            
            return (
              <div key={itemKey} className={`oe-order-item ${isNewItem ? 'new-item' : ''}`}>
                <div className="oe-item-info">
                  <div className="oe-item-image">
                    <img 
                      src={item.RutaImagen || '/images/default-product.jpg'} 
                      alt={item.DescripcionArticulo}
                      onError={(e) => {
                        e.target.src = '/images/default-product.jpg';
                      }}
                    />
                  </div>
                  <div className="oe-item-content">
                    <div className="oe-item-main-info">
                      <h4 className="oe-item-name" title={item.DescripcionArticulo}>
                        {item.DescripcionArticulo}
                      </h4>
                      <div className="oe-item-quantity-control">
                        <div className="oe-quantity-wrapper">
                          <label className="oe-quantity-label">Cantidad:</label>
                          <input
                            type="number"
                            min="1"
                            value={item.Cantidad || 1}
                            onChange={(e) => onUpdateQuantity(item, parseInt(e.target.value) || 1)}
                            className="oe-quantity-input"
                          />
                        </div>
                        <div className="oe-item-subtotal">
                          {((item.PrecioVenta || 0) * (item.Cantidad || 1)).toFixed(2)} €
                        </div>
                      </div>
                    </div>
                    
                    <div className="oe-item-meta">
                      <span className="oe-item-code">
                        Código: <strong>{item.CodigoArticulo}</strong>
                      </span>
                      {item.NombreProveedor && (
                        <span className="oe-item-supplier">
                          Proveedor: <strong>{item.NombreProveedor}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onRemoveItem(item)}
                  className="oe-remove-item-btn"
                  title="Eliminar producto"
                >
                  <FaTrash />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="oe-order-total-section">
        <div className="oe-total-line">
          <span>Total del pedido:</span>
          <span className="oe-total-amount">{calcularTotal().toFixed(2)} €</span>
        </div>
        
        {deliveryDate && (
          <div className="oe-delivery-info">
            <FaCalendarAlt className="oe-info-icon" />
            <span>Fecha solicitada: {new Date(deliveryDate).toLocaleDateString('es-ES')}</span>
          </div>
        )}
        
        {originalOrder && (
          <div className="oe-original-info">
            <FaEdit className="oe-info-icon" />
            <span>Editando pedido #{originalOrder.NumeroPedido} - {originalOrder.StatusAprobado === 0 ? 'Revisando' : 'Aprobado'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const OrderEdit = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [originalOrder, setOriginalOrder] = useState(null);
  const [originalItems, setOriginalItems] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState({ order: true, products: true, submit: false });
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
  const [comment, setComment] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const productsPerPage = 12;

  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}`;
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, order: true }));
        setError('');
        
        const response = await api.get(`/orders/${orderId}`, {
          params: {
            codigoCliente: user?.codigoCliente,
            seriePedido: 'WebCD'
          }
        });
        
        const order = response.data.order;
        setOriginalOrder(order);
        
        if (order.StatusAprobado !== 0) {
          setError('Este pedido no se puede editar porque ya ha sido aprobado. Solo se pueden editar pedidos en estado "Revisando".');
          setLoading(prev => ({ ...prev, order: false }));
          return;
        }
        
        if (order && order.productos) {
          const itemsWithQuantity = order.productos.map(item => ({
            ...item,
            Cantidad: item.UnidadesPedidas || 1,
            addedAt: new Date().getTime() - Math.random() * 1000000
          }));
          
          setOriginalItems(itemsWithQuantity);
          setOrderItems(itemsWithQuantity);
          
          setDeliveryDate(order.FechaNecesaria?.split('T')[0] || '');
          setComment(order.ObservacionesPedido || '');
        } else {
          setError('No se encontraron productos en el pedido');
        }
        
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else {
          setError('Error al cargar los detalles del pedido');
        }
      } finally {
        setLoading(prev => ({ ...prev, order: false }));
      }
    };

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

  const handleSortOrderChange = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  const getSortedItems = () => {
    const items = [...orderItems];
    
    if (sortOrder === 'newest') {
      return items.sort((a, b) => {
        const timeA = a.addedAt || 0;
        const timeB = b.addedAt || 0;
        return timeB - timeA;
      });
    } else {
      return items.sort((a, b) => {
        const timeA = a.addedAt || 0;
        const timeB = b.addedAt || 0;
        return timeA - timeB;
      });
    }
  };

  const handleSaveOrder = async () => {
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

      const response = await api.put(`/orders/${orderId}`, {
        items: itemsToSend,
        deliveryDate: deliveryDate || null,
        comment: comment
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
      if (err.response?.status === 401) {
        setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al actualizar el pedido');
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

  if (loading.order) {
    return (
      <div className="oe-loading-container">
        <div className="oe-spinner"></div>
        <p>Cargando pedido...</p>
      </div>
    );
  }

  return (
    <div className="oe-container">
      <div className="oe-header">
        <div className="oe-header-left">
          <button onClick={() => navigate('/mis-pedidos')} className="oe-back-button">
            <FaArrowLeft className="oe-back-icon" />
            Volver a Mis Pedidos
          </button>
          <div className="oe-title-section">
            <FaEdit className="oe-title-icon" />
            <div>
              <h2>Editar Pedido #{orderId}</h2>
              <p className="oe-subtitle">Modifique los productos y la información del pedido</p>
            </div>
          </div>
        </div>
        <div className="oe-header-actions">
          <button onClick={() => window.location.reload()} className="oe-refresh-button">
            <FaSync className="oe-refresh-icon" />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="oe-error-message">
          <div className="oe-error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => setError('')} className="oe-error-close">
            <FaTimes />
          </button>
        </div>
      )}

      <div className="oe-main-content">
        <div className="oe-product-selection">
          <div className="oe-controls-panel">
            <div className="oe-search-container">
              <FaSearch className="oe-search-icon" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, código o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

            <div className="oe-sort-container">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="oe-sort-select"
              >
                <option value="nombre">Ordenar por nombre</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
                <option value="proveedor">Ordenar por proveedor</option>
              </select>
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="oe-toggle-filters"
            >
              <FaFilter />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              {hasActiveFilters && <span className="oe-active-filters-dot"></span>}
            </button>

            {hasActiveFilters && (
              <button 
                onClick={() => setFilters({ proveedor: '', precioMin: '', precioMax: '' })}
                className="oe-clear-filters"
              >
                <FaTimes />
                Limpiar
              </button>
            )}
          </div>

          {showFilters && (
            <div className="oe-filters-section">
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

        <div className="oe-order-summary">
          <ResumenPedido
            items={sortedItems}
            deliveryDate={deliveryDate}
            comment={comment}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onDeliveryDateChange={setDeliveryDate}
            onCommentChange={setComment}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
            lastAddedItem={lastAddedItem}
            originalOrder={originalOrder}
          />

          <div className="oe-actions">
            <button
              onClick={handleSaveOrder}
              disabled={loading.submit || orderItems.length === 0}
              className="oe-save-button"
            >
              {loading.submit ? (
                <>
                  <div className="oe-button-spinner"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <FaCheck className="oe-save-icon" />
                  Guardar Cambios
                  {orderItems.length > 0 && (
                    <span className="oe-items-badge">{orderItems.length}</span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderEdit;