import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import ProductGrid from '../components/ProductGrid';
import '../styles/OrderEdit.css'; // Cambiado a CSS específico

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
    const str = `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit entero
    }
    return `prod-${hash.toString(36)}`;
  };

  // Funciones para manejar imágenes
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
    const fetchOrderDetails = async () => {
      try {
        setLoading(prev => ({ ...prev, order: true }));
        const response = await api.get(`/api/orders/${orderId}`, {
          params: {
            codigoCliente: user?.codigoCliente,
            seriePedido: 'Web'
          }
        });
        
        const order = response.data.order;
        setOriginalItems(order.Productos.map(item => ({
          ...item,
          Cantidad: item.UnidadesPedidas
        })));
        
        setOrderItems(order.Productos.map(item => ({
          ...item,
          Cantidad: item.UnidadesPedidas
        })));
        
        setDeliveryDate(order.FechaNecesaria?.split('T')[0] || '');
        setComment(order.ObservacionesPedido || '');
        
      } catch (err) {
        setError('Error al cargar los detalles del pedido');
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, order: false }));
      }
    };

    const fetchProducts = async () => {
      try {
        setLoading(prev => ({ ...prev, products: true }));
        const response = await api.get('/api/products');
        
        // Procesar imágenes y eliminar duplicados
        const productsWithImages = await Promise.all(
          response.data.map(async (product) => {
            const imagePath = await getProductImage(product);
            return { ...product, FinalImage: imagePath };
          })
        );
        
        const uniqueProducts = [];
        const seenKeys = new Set();
        
        productsWithImages.forEach(product => {
          const key = generateProductKey(product);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            uniqueProducts.push(product);
          }
        });
        
        setProducts(uniqueProducts);
        setFilteredProducts(uniqueProducts);
      } catch (err) {
        setError('Error al cargar productos');
        console.error(err);
      } finally {
        setLoading(prev => ({ ...prev, products: false }));
      }
    };

    if (user?.codigoCliente) {
      fetchOrderDetails();
      fetchProducts();
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
        PrecioCompra: item.Precio,
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
      }
    } catch (err) {
      console.error('Error al actualizar pedido:', err);
      setError(err.response?.data?.message || err.message || 'Error al actualizar el pedido');
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  if (loading.order || loading.products) {
    return <div className="oe-loading">Cargando datos del pedido...</div>;
  }

  if (error) {
    return <div className="oe-error">{error}</div>;
  }

  return (
    <div className="oe-container">
      <h2>Editar Pedido #{orderId}</h2>

      {error && (
        <div className="oe-error-message">
          <p>{error}</p>
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="oe-delivery-date">
        <label htmlFor="deliveryDate">Nueva fecha de entrega (opcional):</label>
        <input
          type="date"
          id="deliveryDate"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
        />
        {deliveryDate && (
          <button 
            className="oe-clear-date"
            onClick={() => setDeliveryDate('')}
          >
            Limpiar fecha
          </button>
        )}
      </div>

      <div className="oe-filters">
        <div className="oe-search-box">
          <input
            type="text"
            placeholder="Buscar productos por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="oe-sort-options">
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

      <div className="oe-order-container">
        <div className="oe-order-summary">
          <h3>Productos en el Pedido ({orderItems.length})</h3>
          
          {deliveryDate && (
            <div className="oe-delivery-info">
              <strong>Fecha de entrega:</strong> {new Date(deliveryDate).toLocaleDateString()}
            </div>
          )}

          <div className="oe-comment-section">
            <label>Comentarios:</label>
            <textarea 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              placeholder="Agregue comentarios para este pedido..."
            />
          </div>

          {orderItems.length === 0 ? (
            <p>No hay productos en el pedido</p>
          ) : (
            <>
              <ul className="oe-order-items">
                {orderItems.map((item) => (
                  <li key={generateProductKey(item)}>
                    <div className="oe-item-info">
                      <span>{item.DescripcionArticulo}</span>
                      <span>Código: {item.CodigoArticulo}</span>
                      {item.NombreProveedor && <span>Proveedor: {item.NombreProveedor}</span>}
                    </div>
                    <div className="oe-item-actions">
                      <input
                        type="number"
                        min="1"
                        value={item.Cantidad}
                        onChange={(e) => handleUpdateQuantity(item, e.target.value)}
                      />
                      <button
                        className="oe-remove-button"
                        onClick={() => handleRemoveItem(item)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button
                className="oe-submit-order"
                onClick={handleSubmitChanges}
                disabled={orderItems.length === 0 || loading.submit}
              >
                {loading.submit ? 'Guardando cambios...' : 'Guardar Cambios'}
              </button>
            </>
          )}
        </div>

        <div className="oe-product-selection">
          <h3>Agregar más productos ({filteredProducts.length} disponibles)</h3>

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

export default OrderEdit;