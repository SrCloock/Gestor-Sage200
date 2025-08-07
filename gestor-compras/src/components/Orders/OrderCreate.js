import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import ProductGrid from '../Shared/ProductGrid';
import './OrderCreate.css';

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

  // Función hash estable para generar claves únicas
  const generateProductKey = (product) => {
    const str = `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit entero
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
        
        // Eliminar duplicados usando la función hash
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

    // Eliminar duplicados usando la función hash
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

  if (reviewMode) {
    return (
      <div className="review-container">
        <h2>Revisar Pedido</h2>
        <p>Por favor revise los detalles de su pedido antes de confirmar</p>
        
        <div className="review-summary">
          <div className="review-header">
            <h3>Resumen del Pedido</h3>
            <p><strong>Número de productos:</strong> {orderItems.length}</p>
            {deliveryDate && (
              <p><strong>Fecha de entrega:</strong> {new Date(deliveryDate).toLocaleDateString()}</p>
            )}
          </div>
          
          <div className="review-items">
            {orderItems.map((item) => (
              <div key={generateProductKey(item)} className="review-item">
                <div className="item-info">
                  <h4>{item.DescripcionArticulo}</h4>
                  <p>Código: {item.CodigoArticulo}</p>
                  {item.CodigoProveedor && <p>Proveedor: {item.CodigoProveedor}</p>}
                </div>
                <div className="item-quantity">
                  <span>Cantidad: {item.Cantidad}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="review-comment">
            <label>Comentarios para el pedido:</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              placeholder="Escriba aquí cualquier observación adicional..."
            />
          </div>
          
          <div className="review-actions">
            <button onClick={handleBackToEdit} className="edit-button">
              Editar Pedido
            </button>
            <button onClick={handleSubmitOrder} className="confirm-button">
              Confirmar Pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading.products) return <div className="oc-loading">Cargando productos...</div>;
  if (error) return <div className="oc-error">{error}</div>;

  return (
    <div className="oc-container">
      <h2>Crear Nuevo Pedido</h2>

      {error && (
        <div className="oc-error-message">
          <p>{error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="oc-delivery-date">
        <label htmlFor="deliveryDate">Fecha de entrega deseada (opcional):</label>
        <input
          type="date"
          id="deliveryDate"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        {deliveryDate && (
          <button 
            className="oc-clear-date"
            onClick={() => setDeliveryDate('')}
          >
            Limpiar fecha
          </button>
        )}
      </div>

      <div className="oc-filters">
        <div className="pc-search-box">
          <input
            type="text"
            placeholder="Buscar productos por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                // Actualización eliminada para evitar loop
              }
            }}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="pc-sort-options">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="styled-select"
          >
            <option value="asc">Ordenar A-Z</option>
            <option value="desc">Ordenar Z-A</option>
          </select>
        </div>
      </div>

      <div className="oc-order-container">
        <div className="oc-order-summary">
          <h3>Resumen del Pedido ({orderItems.length} productos)</h3>
          
          {deliveryDate && (
            <div className="oc-delivery-info">
              <strong>Fecha de entrega:</strong> {new Date(deliveryDate).toLocaleDateString()}
            </div>
          )}

          {orderItems.length === 0 ? (
            <p>No hay productos en el pedido</p>
          ) : (
            <>
              <ul className="oc-order-items">
                {orderItems.map((item) => (
                  <li key={generateProductKey(item)}>
                    <div className="oc-item-info">
                      <span>{item.DescripcionArticulo}</span>
                      <span>Código: {item.CodigoArticulo}</span>
                      {item.NombreProveedor && <span>Proveedor: {item.NombreProveedor}</span>}
                    </div>
                    <div className="oc-item-actions">
                      <input
                        type="number"
                        min="1"
                        value={item.Cantidad}
                        onChange={(e) => {
                          const value = Math.max(1, parseInt(e.target.value) || 1);
                          setOrderItems((prev) =>
                            prev.map((i) =>
                              generateProductKey(i) === generateProductKey(item)
                                ? { ...i, Cantidad: value }
                                : i
                            )
                          );
                        }}
                      />
                      <button
                        className="oc-remove-button"
                        onClick={() =>
                          setOrderItems((prev) =>
                            prev.filter(
                              (i) => generateProductKey(i) !== generateProductKey(item)
                            ))
                        }
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                className="oc-submit-order"
                onClick={handleReviewOrder}
                disabled={orderItems.length === 0 || loading.submit}
              >
                {loading.submit ? 'Procesando...' : 'Revisar Pedido'}
              </button>
            </>
          )}
        </div>

        <div className="oc-product-selection">
          <h3>Seleccionar Productos ({filteredProducts.length} disponibles)</h3>

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