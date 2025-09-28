import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductGrid from '../components/ProductGrid';
import FiltrosAvanzados from '../components/FiltrosAvanzados';
import { FaSearch, FaCalendarAlt, FaArrowLeft, FaCheck, FaFilter, FaTrash, FaBox } from 'react-icons/fa';
import '../styles/OrderCreate.css';

// Componente ResumenPedido
const ResumenPedido = ({ items, deliveryDate, comment, onUpdateQuantity, onRemoveItem, onDeliveryDateChange, onCommentChange }) => {
  const calcularTotal = () => {
    return items.reduce((total, item) => {
      const precio = item.PrecioVenta || item.PrecioCompra || item.Precio || 0;
      return total + (precio * (item.Cantidad || item.UnidadesPedidas || 1));
    }, 0);
  };

  if (items.length === 0) {
    return (
      <div className="oc-resumen-pedido">
        <div className="oc-resumen-header">
          <h3>Resumen del Pedido</h3>
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
        <h3>Resumen del Pedido</h3>
        <span className="oc-total-items">{items.length} productos</span>
      </div>

      <div className="oc-delivery-section">
        <div className="oc-delivery-input">
          <FaCalendarAlt className="oc-delivery-icon" />
          <label htmlFor="deliveryDate">Fecha de entrega (opcional):</label>
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

      <div className="oc-comment-section">
        <label>Comentarios:</label>
        <textarea 
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          rows="3"
          placeholder="Agregue comentarios sobre el pedido..."
          className="oc-comment-textarea"
        />
      </div>

      <div className="oc-items-list">
        {items.map((item, index) => {
          // Generar una clave única para cada item
          const itemKey = `${item.CodigoArticulo}-${item.CodigoProveedor || 'NP'}-${index}`;
          return (
            <div key={itemKey} className="oc-resumen-item">
              <div className="oc-item-info">
                <h4 className="oc-item-descripcion" title={item.DescripcionArticulo}>
                  {item.DescripcionArticulo}
                </h4>
                <div className="oc-item-details">
                  <span className="oc-item-precio">
                    Precio: {(item.PrecioVenta || item.PrecioCompra || item.Precio || 0).toFixed(2)} €
                  </span>
                  <span className="oc-item-proveedor">
                    Proveedor: {item.NombreProveedor || 'No especificado'}
                  </span>
                  {item.Familia && (
                    <span className="oc-item-familia">Familia: {item.Familia}</span>
                  )}
                  {item.Subfamilia && (
                    <span className="oc-item-subfamilia">Subfamilia: {item.Subfamilia}</span>
                  )}
                </div>
              </div>
              
              <div className="oc-item-controls">
                <div className="oc-item-cantidad">
                  <label>Unidades:</label>
                  <input
                    type="number"
                    min="1"
                    value={item.Cantidad || item.UnidadesPedidas || 1}
                    onChange={(e) => onUpdateQuantity(item, e.target.value)}
                    className="oc-cantidad-input"
                  />
                </div>
                
                <div className="oc-item-subtotal">
                  {((item.PrecioVenta || item.PrecioCompra || item.Precio || 0) * (item.Cantidad || item.UnidadesPedidas || 1)).toFixed(2)} €
                </div>
                
                <button 
                  onClick={() => onRemoveItem(item)}
                  className="oc-remove-item"
                  title="Eliminar producto"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="oc-resumen-total">
        <div className="oc-total-line">
          <span>Total del pedido:</span>
          <span className="oc-total-amount">{calcularTotal().toFixed(2)} €</span>
        </div>
        
        {deliveryDate && (
          <div className="oc-fecha-entrega">
            <span>Fecha necesaria:</span>
            <span>{new Date(deliveryDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente principal OrderCreate
const OrderCreate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState({ products: true, submit: false });
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const [comment, setComment] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    familia: '',
    subfamilia: '',
    search: ''
  });
  const productsPerPage = 20;

  // Función MEJORADA para generar claves únicas
  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}-${product.CodigoFamilia || 'NF'}-${product.CodigoSubfamilia || 'NS'}`;
  };

  // Cache simple en memoria
  const [productsCache, setProductsCache] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  useEffect(() => {
    const fetchProducts = async () => {
      // Verificar cache primero
      const now = Date.now();
      if (productsCache && (now - lastFetchTime) < CACHE_DURATION) {
        setProducts(productsCache);
        setLoading(prev => ({ ...prev, products: false }));
        return;
      }

      try {
        setLoading(prev => ({ ...prev, products: true }));
        setError('');
        const response = await api.get('/api/products');
        
        let productsData = response.data.products || response.data;

        // Eliminar duplicados usando la clave única MEJORADA
        const uniqueProductsMap = new Map();
        
        productsData.forEach(product => {
          const key = generateProductKey(product);
          if (!uniqueProductsMap.has(key)) {
            uniqueProductsMap.set(key, product);
          }
        });

        const uniqueProducts = Array.from(uniqueProductsMap.values());
        setProducts(uniqueProducts);
        setProductsCache(uniqueProducts);
        setLastFetchTime(Date.now());

      } catch (err) {
        console.error('Error al cargar productos:', err);
        if (err.response?.status === 401) {
          setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        } else {
          setError('Error al cargar productos: ' + (err.message || 'Error desconocido'));
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
        CifDni: user?.cifDni
      }]);
    }
  }, [location, user]);

  // Filtrar y ordenar productos - BUSCADOR MEJORADO
  const productosFiltrados = products
    .filter(product => {
      if (filtros.search.trim()) {
        const term = filtros.search.toLowerCase().trim();
        const descripcion = product.DescripcionArticulo?.toLowerCase() || '';
        const codigo = product.CodigoArticulo?.toLowerCase() || '';
        const proveedor = product.NombreProveedor?.toLowerCase() || '';
        const familia = product.Familia?.toLowerCase() || '';
        const subfamilia = product.Subfamilia?.toLowerCase() || '';

        if (!descripcion.includes(term) &&
            !codigo.includes(term) &&
            !proveedor.includes(term) &&
            !familia.includes(term) &&
            !subfamilia.includes(term)) {
          return false;
        }
      }
      
      const matchesFamilia = !filtros.familia || product.Familia === filtros.familia;
      const matchesSubfamilia = !filtros.subfamilia || product.Subfamilia === filtros.subfamilia;
      
      return matchesFamilia && matchesSubfamilia;
    })
    .sort((a, b) => {
      return sortOrder === 'asc' 
        ? (a.DescripcionArticulo || '').localeCompare(b.DescripcionArticulo || '')
        : (b.DescripcionArticulo || '').localeCompare(a.DescripcionArticulo || '');
    });

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = productosFiltrados.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(productosFiltrados.length / productsPerPage);

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
            ? { ...item, Cantidad: (item.Cantidad || 0) + 1 }
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
      setLoading(prev => ({ ...prev, submit: true }));
      setError('');

      const itemsToSend = orderItems.map(item => ({
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        Cantidad: Number(item.Cantidad),
        PrecioCompra: item.PrecioCompra || item.Precio,
        CodigoProveedor: item.CodigoProveedor || null,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      console.log('Enviando pedido con datos:', {
        items: itemsToSend,
        FechaNecesaria: deliveryDate || null,
        ObservacionesPedido: comment
      });

      const response = await api.post('/api/orders', {
        items: itemsToSend,
        FechaNecesaria: deliveryDate || null,
        ObservacionesPedido: comment
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
      console.error('Error al crear pedido:', err);
      if (err.response?.status === 401) {
        setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al procesar el pedido');
      }
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const calcularTotal = () => {
    return orderItems.reduce((sum, item) => {
      const precio = item.PrecioVenta || item.PrecioCompra || item.Precio || 0;
      return sum + (precio * (item.Cantidad || 1));
    }, 0);
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => {
      if (name === 'familia') {
        return { ...prev, familia: value, subfamilia: '' };
      }
      return { ...prev, [name]: value };
    });
    setCurrentPage(1);
  };

  const limpiarFiltros = () => {
    setFiltros({ familia: '', subfamilia: '', search: '' });
    setCurrentPage(1);
  };

  const opcionesFamilias = [...new Set(products.map(p => p.Familia).filter(Boolean))].sort();
  const opcionesSubfamilias = products
    .filter(p => p.Familia && p.Subfamilia)
    .map(p => ({ familia: p.Familia, valor: p.Subfamilia }));
  const uniqueSubfamilias = [...new Map(opcionesSubfamilias.map(item => [item.valor, item])).values()];

  if (reviewMode) {
    return (
      <div className="oc-container">
        <div className="oc-header">
          <button onClick={handleBackToEdit} className="oc-back-button">
            <FaArrowLeft className="oc-back-icon" />
            Volver a editar
          </button>
          <div className="oc-title-section">
            <h2>Revisar y Confirmar Pedido</h2>
            <p>Revise los detalles antes de enviar el pedido</p>
          </div>
        </div>

        <ResumenPedido
          items={orderItems}
          deliveryDate={deliveryDate}
          comment={comment}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onDeliveryDateChange={setDeliveryDate}
          onCommentChange={setComment}
        />

        <div className="oc-actions">
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
              <>
                <FaCheck className="oc-check-icon" />
                Confirmar Pedido
              </>
            )}
          </button>
          <button
            onClick={handleBackToEdit}
            className="oc-cancel-button"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="oc-container">
      <div className="oc-header">
        <button onClick={() => navigate(-1)} className="oc-back-button">
          <FaArrowLeft className="oc-back-icon" />
          Volver
        </button>
        <div className="oc-title-section">
          <h2>Crear Nuevo Pedido</h2>
          <p>Seleccione productos del catálogo para agregar a su pedido</p>
        </div>
        <div className="oc-header-actions">
          <button 
            onClick={() => setMostrarFiltros(!mostrarFiltros)} 
            className="oc-filter-btn"
          >
            <FaFilter className="oc-filter-icon" />
            Filtros
          </button>
          {orderItems.length > 0 && (
            <button onClick={handleReviewOrder} className="oc-review-btn">
              <FaCheck className="oc-check-icon" />
              Revisar Pedido ({orderItems.length})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="oc-error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="oc-error-close">×</button>
        </div>
      )}

      {mostrarFiltros && (
        <FiltrosAvanzados
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          opcionesFamilias={opcionesFamilias}
          opcionesSubfamilias={uniqueSubfamilias}
          onLimpiarFiltros={limpiarFiltros}
        />
      )}

      <div className="oc-controls-panel">
        <div className="oc-search-container">
          <FaSearch className="oc-search-icon" />
          <input
            type="text"
            placeholder="Buscar productos por nombre, código, proveedor, familia..."
            value={filtros.search}
            onChange={(e) => {
              setFiltros(prev => ({ ...prev, search: e.target.value }));
              setCurrentPage(1);
            }}
            className="oc-search-input"
          />
          {filtros.search && (
            <button 
              onClick={() => setFiltros(prev => ({ ...prev, search: '' }))}
              className="oc-clear-search"
            >
              ×
            </button>
          )}
        </div>

        <div className="oc-filter-container">
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
        <div className="oc-product-selection">
          <div className="oc-products-header">
            <h3>Seleccionar Productos ({productosFiltrados.length} disponibles)</h3>
          </div>

          <ProductGrid
            products={currentProducts}
            onAddProduct={handleAddItem}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            searchTerm={filtros.search}
            generateProductKey={generateProductKey}
            loading={loading.products}
          />
        </div>

        <div className="oc-order-summary">
          <ResumenPedido
            items={orderItems}
            deliveryDate={deliveryDate}
            comment={comment}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onDeliveryDateChange={setDeliveryDate}
            onCommentChange={setComment}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderCreate;