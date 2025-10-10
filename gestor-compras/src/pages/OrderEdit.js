import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductCard from '../components/ProductCard';
import CatalogFilters from '../components/CatalogFilters';
import { FaCalendarAlt, FaSearch, FaTrash, FaArrowLeft, FaFilter, FaTimes, FaBox } from 'react-icons/fa';
import '../styles/OrderEdit.css';

// Componente ProductGrid para OrderEdit
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

// Componente principal OrderEdit actualizado
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
  const productsPerPage = 12;

  // Función para generar clave única
  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}`;
  };

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, order: true }));
        setError('');
        
        const response = await api.get(`/api/orders/${orderId}`, {
          params: {
            codigoCliente: user?.codigoCliente,
            seriePedido: 'WebCD'
          }
        });
        
        const order = response.data.order;
        
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
        setError('');
        
        const response = await api.get('/api/catalog/products');
        
        if (response.data.success) {
          setProducts(response.data.products);
          setFilteredProducts(response.data.products);
        } else {
          setError('Error al cargar los productos');
        }
      } catch (err) {
        console.error('Error fetching products:', err);
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

  // Aplicar filtros y búsqueda (igual que en Catalog)
  useEffect(() => {
    let result = [...products];

    // Filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product => 
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term)
      );
    }

    // Filtro por proveedor
    if (filters.proveedor) {
      result = result.filter(product => 
        product.CodigoProveedor === filters.proveedor
      );
    }

    // Filtro por precio mínimo
    if (filters.precioMin) {
      result = result.filter(product => 
        product.PrecioVenta >= parseFloat(filters.precioMin)
      );
    }

    // Filtro por precio máximo
    if (filters.precioMax) {
      result = result.filter(product => 
        product.PrecioVenta <= parseFloat(filters.precioMax)
      );
    }

    // Ordenar
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
        PrecioCompra: item.PrecioCompra || item.PrecioVenta,
        CodigoProveedor: item.CodigoProveedor || null,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      const response = await api.put(`/api/orders/${orderId}`, {
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

  const calcularTotal = () => {
    return orderItems.reduce((total, item) => {
      const precio = item.PrecioVenta || 0;
      return total + (precio * item.Cantidad);
    }, 0);
  };

  const hasActiveFilters = filters.proveedor || filters.precioMin || filters.precioMax;

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
          <div className="oe-resumen-pedido">
            <div className="oe-resumen-header">
              <h3>Productos en el Pedido</h3>
              <span className="oe-total-items">{orderItems.length} productos</span>
            </div>

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
              </div>
            </div>

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
                <FaBox className="oe-empty-cart-icon" />
                <p>No hay productos en el pedido</p>
                <p>Agregue productos desde el catálogo</p>
              </div>
            ) : (
              <div className="oe-items-list">
                {orderItems.map((item) => (
                  <div key={generateProductKey(item)} className="oe-resumen-item">
                    <div className="oe-item-info">
                      <h4 className="oe-item-descripcion" title={item.DescripcionArticulo}>
                        {item.DescripcionArticulo}
                      </h4>
                      <div className="oe-item-details">
                        <span className="oe-item-precio">
                          Precio: {(item.PrecioVenta || 0).toFixed(2)} €
                        </span>
                        {item.PorcentajeIva && (
                          <span className="oe-item-iva">
                            IVA: {item.PorcentajeIva}%
                          </span>
                        )}
                        {item.NombreProveedor && (
                          <span className="oe-item-proveedor">
                            Proveedor: {item.NombreProveedor}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="oe-item-controls">
                      <div className="oe-item-cantidad">
                        <label>Unidades:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.Cantidad}
                          onChange={(e) => handleUpdateQuantity(item, parseInt(e.target.value) || 1)}
                          className="oe-cantidad-input"
                        />
                      </div>
                      
                      <div className="oe-item-subtotal">
                        {((item.PrecioVenta || 0) * item.Cantidad).toFixed(2)} €
                      </div>
                      
                      <button 
                        onClick={() => handleRemoveItem(item)}
                        className="oe-remove-item"
                        title="Eliminar producto"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="oe-resumen-total">
              <div className="oe-total-line">
                <span>Total del pedido:</span>
                <span className="oe-total-amount">{calcularTotal().toFixed(2)} €</span>
              </div>
              
              {deliveryDate && (
                <div className="oe-fecha-entrega">
                  <span>Fecha necesaria:</span>
                  <span>{new Date(deliveryDate).toLocaleDateString('es-ES')}</span>
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
};

export default OrderEdit;