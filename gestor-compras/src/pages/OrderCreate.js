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

  // Función mejorada para generar claves únicas
  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}-${user?.codigoCliente || '00'}`;
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
        
        // Eliminar duplicados basados en clave única
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
      const selectedProduct = location.state.selectedProduct;
      setOrderItems([{
        ...selectedProduct,
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

    // Eliminar duplicados
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

      // Verificar que no hay productos duplicados
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
            PrecioCompra: item.PrecioCompra,
            CodigoProveedor: item.CodigoProveedor || null,
            CodigoCliente: user.codigoCliente,
            CifDni: user.cifDni
          });
        }
      });

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
            <p>Número de productos: {orderItems.length}</p>
            
            <div className="oc-products-list">
              <h4>Productos en el pedido</h4>
              {orderItems.map((item, index) => (
                <div key={generateProductKey(item) + index} className="oc-review-product">
                  <div className="oc-product-info">
                    <h5>{item.DescripcionArticulo}</h5>
                    <p>Código: {item.CodigoArticulo}</p>
                    {item.CodigoProveedor && <p>Proveedor: {item.CodigoProveedor}</p>}
                  </div>
                  <div className="oc-product-quantity">
                    <span>Cantidad: {item.Cantidad}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {deliveryDate && (
              <div className="oc-delivery-info">
                <h4>Fecha de entrega solicitada</h4>
                <p>{new Date(deliveryDate).toLocaleDateString()}</p>
              </div>
            )}
            
            {comment && (
              <div className="oc-comment-info">
                <h4>Comentarios</h4>
                <p>{comment}</p>
              </div>
            )}
          </div>
          
          <div className="oc-review-actions">
            <button onClick={handleSubmitOrder} disabled={loading.submit} className="oc-submit-button">
              {loading.submit ? 'Creando pedido...' : 'Confirmar Pedido'}
            </button>
            <button onClick={handleBackToEdit} className="oc-cancel-button">
              Cancelar
            </button>
          </div>
        </div>
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
        <h2>Crear Nuevo Pedido</h2>
      </div>

      {error && (
        <div className="oc-error-message">
          <p>{error}</p>
          <button onClick={() => setError('')} className="oc-error-close">
            ×
          </button>
        </div>
      )}

      <div className="oc-content">
        <div className="oc-order-summary">
          <h3>Resumen del Pedido</h3>
          <p>Número de productos: {orderItems.length}</p>
          
          {orderItems.length > 0 && (
            <div className="oc-products-list">
              {orderItems.map((item, index) => (
                <div key={generateProductKey(item) + index} className="oc-order-item">
                  <div className="oc-item-info">
                    <h4>{item.DescripcionArticulo}</h4>
                    <p>Código: {item.CodigoArticulo}</p>
                    {item.CodigoProveedor && <p>Proveedor: {item.CodigoProveedor}</p>}
                  </div>
                  <div className="oc-item-controls">
                    <input
                      type="number"
                      min="1"
                      value={item.Cantidad}
                      onChange={(e) => handleUpdateQuantity(item, e.target.value)}
                      className="oc-quantity-input"
                    />
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="oc-remove-button"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="oc-delivery-section">
            <label htmlFor="deliveryDate">
              <FaCalendarAlt />
              Fecha de entrega deseada (opcional):
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
            <label htmlFor="comment">Comentarios (opcional):</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              placeholder="Agregue comentarios sobre su pedido..."
            />
          </div>
          
          <div className="oc-actions">
            <button
              onClick={handleReviewOrder}
              disabled={orderItems.length === 0}
              className="oc-review-button"
            >
              <FaCheck />
              Revisar y Confirmar Pedido
            </button>
          </div>
        </div>

        <div className="oc-product-selection">
          <div className="oc-search-section">
            <div className="oc-search-container">
              <FaSearch className="oc-search-icon" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, código o proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="oc-search-input"
              />
            </div>
            
            <div className="oc-sort-container">
              <label>Ordenar por:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="oc-sort-select"
              >
                <option value="asc">Nombre (A-Z)</option>
                <option value="desc">Nombre (Z-A)</option>
              </select>
            </div>
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