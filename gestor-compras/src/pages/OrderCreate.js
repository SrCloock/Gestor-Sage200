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
        {items.map((item, index) => (
          <div key={`${item.CodigoArticulo}-${index}`} className="oc-resumen-item">
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
        ))}
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

  // Función mejorada para generar claves únicas
  const generateProductKey = (product) => {
    return `${product.Ejercicio || '0000'}-${product.CodigoArticulo}-${product.CodigoAlmacen || '00'}-${product.Periodo || '00'}-${product.Partida || '000'}-${product.TipoUnidadMedida_ || '00'}-${product.CodigoColor_ || '000'}-${product.CodigoTalla01_ || '000'}`;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(prev => ({ ...prev, products: true }));
        const response = await api.get('/api/products');
        setProducts(response.data.products || response.data);
      } catch (err) {
        console.error('Error al cargar productos:', err);
        setError('Error al cargar productos');
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

  // Filtrar y ordenar productos
  const productosFiltrados = products
    .filter(product => {
      const matchesSearch = !filtros.search || 
        product.DescripcionArticulo?.toLowerCase().includes(filtros.search.toLowerCase()) ||
        product.CodigoArticulo?.toLowerCase().includes(filtros.search.toLowerCase()) ||
        product.NombreProveedor?.toLowerCase().includes(filtros.search.toLowerCase());
      
      const matchesFamilia = !filtros.familia || product.Familia === filtros.familia;
      const matchesSubfamilia = !filtros.subfamilia || product.Subfamilia === filtros.subfamilia;
      
      return matchesSearch && matchesFamilia && matchesSubfamilia;
    })
    .sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo);
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
      setError('');
      setLoading(prev => ({ ...prev, submit: true }));

      if (!user?.codigoCliente || !user?.cifDni) {
        throw new Error('Datos de usuario incompletos. Por favor, inicie sesión nuevamente.');
      }

      const itemsToSend = orderItems.map(item => ({
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        Cantidad: Number(item.Cantidad || item.UnidadesPedidas || 1),
        PrecioCompra: item.PrecioCompra || item.Precio || 0,
        CodigoProveedor: item.CodigoProveedor || null,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni,
        Familia: item.Familia || '',
        Subfamilia: item.Subfamilia || ''
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
          items: orderItems,
          total: orderItems.reduce((sum, item) => {
            const precio = item.PrecioVenta || item.PrecioCompra || item.Precio || 0;
            const cantidad = item.Cantidad || item.UnidadesPedidas || 1;
            return sum + (precio * cantidad);
          }, 0),
          success: true
        }
      });
    } catch (err) {
      console.error('Error al crear pedido:', err);
      setError(err.response?.data?.message || err.message || 'Error al crear el pedido');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  // Obtener opciones para filtros
  const opcionesFamilias = [...new Set(products.map(p => p.Familia).filter(Boolean))].sort();
  const opcionesSubfamilias = products
    .filter(p => p.Familia && p.Subfamilia)
    .map(p => ({ familia: p.Familia, valor: p.Subfamilia }));
  const subfamiliasUnicas = [...new Map(opcionesSubfamilias.map(item => [item.valor, item])).values()];

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

  if (reviewMode) {
    return (
      <div className="oc-review-container">
        <div className="oc-review-header">
          <button onClick={handleBackToEdit} className="oc-back-button">
            <FaArrowLeft />
            Volver a editar
          </button>
          <h2>Revisar Pedido</h2>
          <p>Confirme los detalles antes de enviar el pedido</p>
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
        
        <div className="oc-review-actions">
          <button 
            onClick={handleSubmitOrder}
            disabled={loading.submit}
            className="oc-submit-button"
          >
            {loading.submit ? (
              <>
                <div className="oc-spinner"></div>
                Procesando...
              </>
            ) : (
              <>
                <FaCheck />
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

        {error && (
          <div className="oc-error-message">
            <div className="oc-error-icon">⚠️</div>
            <p>{error}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="oc-container">
      <div className="oc-header">
        <button onClick={() => navigate(-1)} className="oc-back-button">
          <FaArrowLeft />
          Volver
        </button>
        <div className="oc-title-section">
          <h2>Crear Nuevo Pedido</h2>
          <p>Seleccione los productos para su pedido</p>
        </div>
      </div>

      {error && (
        <div className="oc-error-message">
          <div className="oc-error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => setError('')} className="oc-error-close">×</button>
        </div>
      )}

      <div className="oc-main-content">
        <div className="oc-order-panel">
          <ResumenPedido 
            items={orderItems}
            deliveryDate={deliveryDate}
            comment={comment}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onDeliveryDateChange={setDeliveryDate}
            onCommentChange={setComment}
          />
          
          {orderItems.length > 0 && (
            <button 
              onClick={handleReviewOrder}
              className="oc-review-button"
            >
              <FaCheck />
              Revisar y Confirmar Pedido
            </button>
          )}
        </div>

        <div className="oc-catalog-panel">
          <div className="oc-catalog-controls">
            <div className="oc-search-container">
              <FaSearch className="oc-search-icon" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, código o proveedor..."
                value={filtros.search}
                onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
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

            <div className="oc-controls-right">
              <button 
                onClick={() => setMostrarFiltros(!mostrarFiltros)} 
                className={`oc-filter-toggle ${mostrarFiltros ? 'active' : ''}`}
              >
                <FaFilter /> Filtros
              </button>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="oc-sort-select"
              >
                <option value="asc">Ordenar A-Z</option>
                <option value="desc">Ordenar Z-A</option>
              </select>
            </div>
          </div>

          {mostrarFiltros && (
            <FiltrosAvanzados
              filtros={filtros}
              onFiltroChange={handleFiltroChange}
              opcionesFamilias={opcionesFamilias}
              opcionesSubfamilias={subfamiliasUnicas}
              onLimpiarFiltros={limpiarFiltros}
            />
          )}

          <ProductGrid
            products={currentProducts}
            onAddProduct={handleAddItem}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            searchTerm={filtros.search}
            generateProductKey={generateProductKey}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderCreate;