import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import ProductGrid from '../Shared/ProductGrid';
import './OfferCreate.css';

const OfferCreate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [offerItems, setOfferItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState({ products: true, submit: false });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [reviewMode, setReviewMode] = useState(false);
  const productsPerPage = 20;

  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NOPROV'}`;
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
          return { 
            ...product, 
            FinalImage: imagePath,
            PrecioVenta: product.PrecioVenta || product.PrecioCompra
          };
        }));
        
        const sortedProducts = productsWithImages.sort((a, b) =>
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
      setOfferItems([{
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
    const seenCodes = new Set();
    
    result.forEach(product => {
      if (!seenCodes.has(product.CodigoArticulo)) {
        seenCodes.add(product.CodigoArticulo);
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
    setProducts(prev => [...prev]);
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
    setOfferItems((prev) => {
      const existingItem = prev.find(item =>
        item.CodigoArticulo === product.CodigoArticulo
      );

      if (existingItem) {
        return prev.map(item =>
          item.CodigoArticulo === product.CodigoArticulo
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

  const handleReviewOffer = () => {
    if (offerItems.length === 0) {
      setError('Debe agregar al menos un producto a la oferta');
      return;
    }
    setReviewMode(true);
  };

  const handleBackToEdit = () => {
    setReviewMode(false);
  };

  const handleSubmitOffer = async () => {
    try {
      setError('');
      setLoading((prev) => ({ ...prev, submit: true }));

      if (!user?.codigoCliente || !user?.cifDni) {
        throw new Error('Datos de usuario incompletos. Por favor, inicie sesión nuevamente.');
      }

      const itemsToSend = offerItems.map(item => ({
        CodigoArticulo: item.CodigoArticulo,
        DescripcionArticulo: item.DescripcionArticulo,
        Cantidad: Number(item.Cantidad),
        PrecioVenta: item.PrecioVenta,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      const offerData = {
        items: itemsToSend,
        deliveryDate: deliveryDate || null
      };

      const response = await api.post('/api/offers', offerData);

      navigate('/revisar-oferta', {
        state: {
          offerId: response.data.offerId,
          serieOferta: response.data.serieOferta,
          deliveryDate: deliveryDate,
          success: true
        }
      });
    } catch (err) {
      console.error('Error al crear oferta:', err);
      setError(err.response?.data?.message || err.message || 'Error al crear la oferta');
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  if (reviewMode) {
    return (
      <div className="review-container">
        <h2>Revisar Oferta</h2>
        <p>Por favor revise los detalles de su oferta antes de confirmar</p>
        
        <div className="review-summary">
          <div className="review-header">
            <h3>Resumen de la Oferta</h3>
            <p><strong>Número de productos:</strong> {offerItems.length}</p>
            {deliveryDate && (
              <p><strong>Fecha de entrega:</strong> {new Date(deliveryDate).toLocaleDateString()}</p>
            )}
          </div>
          
          <div className="review-items">
            {offerItems.map((item, index) => (
              <div key={index} className="review-item">
                <div className="item-info">
                  <h4>{item.DescripcionArticulo}</h4>
                  <p>Código: {item.CodigoArticulo}</p>
                  <p>Precio: {item.PrecioVenta} €</p>
                </div>
                <div className="item-quantity">
                  <span>Cantidad: {item.Cantidad}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="review-actions">
            <button onClick={handleBackToEdit} className="edit-button">
              Editar Oferta
            </button>
            <button onClick={handleSubmitOffer} className="confirm-button">
              Confirmar Oferta
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
      <h2>Crear Nueva Oferta</h2>

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
        <div className="oc-search-box">
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
                setProducts(prev => [...prev]);
              }
            }}
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="oc-sort-options">
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
          <h3>Resumen de la Oferta ({offerItems.length} productos)</h3>
          
          {deliveryDate && (
            <div className="oc-delivery-info">
              <strong>Fecha de entrega:</strong> {new Date(deliveryDate).toLocaleDateString()}
            </div>
          )}

          {offerItems.length === 0 ? (
            <p>No hay productos en la oferta</p>
          ) : (
            <>
              <ul className="oc-order-items">
                {offerItems.map((item) => (
                  <li key={generateProductKey(item)}>
                    <div className="oc-item-info">
                      <span>{item.DescripcionArticulo}</span>
                      <span>Código: {item.CodigoArticulo}</span>
                      <span>Precio: {item.PrecioVenta} €</span>
                      {item.NombreProveedor && <span>Proveedor: {item.NombreProveedor}</span>}
                    </div>
                    <div className="oc-item-actions">
                      <input
                        type="number"
                        min="1"
                        value={item.Cantidad}
                        onChange={(e) => {
                          const value = Math.max(1, parseInt(e.target.value) || 1);
                          setOfferItems((prev) =>
                            prev.map((i) =>
                              i.CodigoArticulo === item.CodigoArticulo
                                ? { ...i, Cantidad: value }
                                : i
                            )
                          );
                        }}
                      />
                      <button
                        className="oc-remove-button"
                        onClick={() =>
                          setOfferItems((prev) =>
                            prev.filter(
                              (i) => i.CodigoArticulo !== item.CodigoArticulo
                            )
                          )
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
                onClick={handleReviewOffer}
                disabled={offerItems.length === 0 || loading.submit}
              >
                {loading.submit ? 'Procesando...' : 'Revisar Oferta'}
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
          />
        </div>
      </div>
    </div>
  );
};

export default OfferCreate;