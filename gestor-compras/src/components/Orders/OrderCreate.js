import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
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
  const productsPerPage = 20;

  // Función para generar claves únicas
  const generateProductKey = (product, index) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NOPROV'}-${index}`;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/products');
        const sortedProducts = response.data.sort((a, b) =>
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

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) =>
      sortOrder === 'asc'
        ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo)
    );

    setFilteredProducts(result);
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
        item.CodigoArticulo === product.CodigoArticulo &&
        item.CodigoProveedor === product.CodigoProveedor
      );

      if (existingItem) {
        return prev.map(item =>
          item.CodigoArticulo === product.CodigoArticulo &&
          item.CodigoProveedor === product.CodigoProveedor
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
        CodigoProveedor: null,
        CodigoCliente: user.codigoCliente,
        CifDni: user.cifDni
      }));

      const response = await api.post('/api/orders', { items: itemsToSend });

      navigate('/revisar-pedido', {
        state: {
          orderId: response.data.orderId,
          seriePedido: response.data.seriePedido,
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

  const createPageNumbers = () => {
    const pageNumbers = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else if (currentPage <= 3) {
      pageNumbers.push(1, 2, 3, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
    } else {
      pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }

    return pageNumbers;
  };

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

      <div className="oc-filters">
        <div className="oc-search-box">
          <input
            type="text"
            placeholder="Buscar por nombre, proveedor o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="oc-sort-options">
          <label>Ordenar:</label>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">A-Z</option>
            <option value="desc">Z-A</option>
          </select>
        </div>
      </div>

      <div className="oc-order-container">
        <div className="oc-order-summary">
          <h3>Resumen del Pedido ({orderItems.length} productos)</h3>
          {orderItems.length === 0 ? (
            <p>No hay productos en el pedido</p>
          ) : (
            <>
              <ul className="oc-order-items">
                {orderItems.map((item, index) => (
                  <li key={generateProductKey(item, index)}>
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
                              i.CodigoArticulo === item.CodigoArticulo &&
                              i.CodigoProveedor === item.CodigoProveedor
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
                              (i) =>
                                !(
                                  i.CodigoArticulo === item.CodigoArticulo &&
                                  i.CodigoProveedor === item.CodigoProveedor
                                )
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
                onClick={handleSubmitOrder}
                disabled={orderItems.length === 0 || loading.submit}
              >
                {loading.submit ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </>
          )}
        </div>

        <div className="oc-product-selection">
          <h3>Seleccionar Productos ({filteredProducts.length} disponibles)</h3>

          <div className="oc-product-grid">
            {currentProducts.length > 0 ? (
              currentProducts.map((product, index) => (
                <div
                  key={generateProductKey(product, index)}
                  className="oc-product-item"
                  onClick={() => handleAddItem(product)}
                >
                  <h3>{product.DescripcionArticulo}</h3>
                  <p><strong>Código:</strong> {product.CodigoArticulo}</p>
                  {product.NombreProveedor && (
                    <p><strong>Proveedor:</strong> {product.NombreProveedor}</p>
                  )}
                  <button className="oc-add-button">Añadir al pedido</button>
                </div>
              ))
            ) : (
              <div className="oc-no-results">
                No se encontraron productos con los filtros aplicados
              </div>
            )}
          </div>

          {filteredProducts.length > productsPerPage && (
            <div className="oc-pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Anterior
              </button>

              {createPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => page !== '...' && handlePageChange(page)}
                  className={currentPage === page ? 'oc-active' : ''}
                  disabled={page === '...'}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCreate;