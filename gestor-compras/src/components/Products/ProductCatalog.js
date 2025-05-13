import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import './ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 20;
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor}`;
  };

  const removeDuplicates = (products) => {
    const seen = new Set();
    return products.filter(product => {
      const key = generateProductKey(product);
      if (!seen.has(key)) {
        seen.add(key);
        return true;
      }
      return false;
    });
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
        const uniqueProducts = removeDuplicates(response.data);

        const productsWithImages = await Promise.all(uniqueProducts.map(async (product) => {
          const imagePath = await getProductImage(product);
          return { ...product, FinalImage: imagePath };
        }));

        const sortedProducts = [...productsWithImages].sort((a, b) =>
          a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        );

        setProducts(sortedProducts);
        setFilteredProducts(sortedProducts);
      } catch (err) {
        setError('Error al cargar productos');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    let result = [...products];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(product =>
        product.DescripcionArticulo.toLowerCase().includes(term) ||
        (product.NombreProveedor && product.NombreProveedor.toLowerCase().includes(term)) ||
        (product.CodigoArticulo && product.CodigoArticulo.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.DescripcionArticulo.localeCompare(b.DescripcionArticulo);
      } else {
        return b.DescripcionArticulo.localeCompare(a.DescripcionArticulo);
      }
    });

    setFilteredProducts(result);
    setCurrentPage(1);
  }, [searchTerm, sortOrder, products]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handleProductClick = (product) => {
    navigate('/crear-pedido', { state: { selectedProduct: product } });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const createPageNumbers = () => {
    const pageNumbers = [];
    const maxPage = totalPages;

    if (maxPage <= 5) {
      for (let i = 1; i <= maxPage; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pageNumbers.push(1, 2, 3, '...', maxPage);
      } else if (currentPage >= maxPage - 2) {
        pageNumbers.push(1, '...', maxPage - 2, maxPage - 1, maxPage);
      } else {
        pageNumbers.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', maxPage);
      }
    }

    return pageNumbers;
  };

  if (loading) return <div className="pc-loading">Cargando productos...</div>;
  if (error) return <div className="pc-error">{error}</div>;

  return (
    <div className="pc-container">
      <div className="pc-header">
        <h2>Catálogo de Productos</h2>
        <p>{filteredProducts.length} productos disponibles</p>
      </div>

      <div className="pc-controls">
        <div className="pc-search-box">
          <input
            type="text"
            placeholder="Buscar productos por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      <div className="pc-product-grid">
        {currentProducts.length > 0 ? (
          currentProducts.map(product => (
            <div
              key={generateProductKey(product)}
              className="pc-product-card"
              onClick={() => handleProductClick(product)}
            >
              <img
                src={product.FinalImage}
                alt={product.DescripcionArticulo}
                className="product-image"
              />

              <div className="product-header">
                <h3>{product.DescripcionArticulo}</h3>
                <span className="product-code">{product.CodigoArticulo}</span>
              </div>

              {product.NombreProveedor && (
                <div className="product-supplier">
                  <span>Proveedor:</span> {product.NombreProveedor}
                </div>
              )}

              <div className="product-actions">
                <button className="add-button">
                  Añadir al pedido
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="pc-no-results">
            No se encontraron productos con los filtros aplicados
          </div>
        )}
      </div>

      {filteredProducts.length > productsPerPage && (
        <div className="pc-pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Anterior
          </button>

          {createPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => handlePageChange(page === '...' ? currentPage : page)}
              className={currentPage === page ? 'pc-active' : ''}
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
  );
};

export default ProductCatalog;
