import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaBoxOpen } from 'react-icons/fa';
import ProductGrid from '../components/ProductGrid';
import '../styles/ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const productsPerPage = 20;

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  const generateProductKey = (product) => {
    const str = `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };

  const removeDuplicates = (products) => {
    const seen = new Set();
    return products.filter(product => {
      const key = generateProductKey(product);
      return seen.has(key) ? false : seen.add(key);
    });
  };

  const checkImageExists = async (url) => {
    const img = new Image();
    img.src = url;
    return new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const getProductImage = async (product) => {
    const localImage = `/images/${product.CodigoArticulo}.jpg`;
    return (await checkImageExists(localImage)) 
      ? localImage 
      : product.RutaImagen || '/images/default.jpg';
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await api.get('/api/products');
        const uniqueProducts = removeDuplicates(response.data);
        
        const productsWithImages = await Promise.all(
          uniqueProducts.map(async p => ({
            ...p,
            FinalImage: await getProductImage(p)
          }))
        );

        const sorted = [...productsWithImages].sort((a, b) =>
          a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        );

        setProducts(sorted);
        setFilteredProducts(sorted);
      } catch (err) {
        setError('Error al cargar el catálogo');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = products.filter(p =>
      p.DescripcionArticulo?.toLowerCase().includes(term) ||
      p.NombreProveedor?.toLowerCase().includes(term) ||
      p.CodigoArticulo?.toLowerCase().includes(term)
    );

    filtered.sort((a, b) => sortOrder === 'asc' 
      ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
      : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo)
    );

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchTerm, sortOrder, products]);

  const indexOfLast = currentPage * productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfLast - productsPerPage, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handleAddToOrder = (product) => {
    // Navegar a la página de crear pedido con el producto seleccionado
    navigate('/crear-pedido', { state: { selectedProduct: product } });
  };

  const handlePageChange = (newPage) => 
    newPage > 0 && newPage <= totalPages && setCurrentPage(newPage);

  if (loading) return (
    <div className="pc-loading-container">
      <div className="pc-spinner"></div>
      <p>Cargando catálogo...</p>
    </div>
  );

  if (error) return (
    <div className="pc-error-container">
      <div className="pc-error-icon">⚠️</div>
      <p>{error}</p>
    </div>
  );

  return (
    <div className="pc-container">
      <div className="pc-header">
        <h2 className="pc-title">Catálogo de Suministros Dentales</h2>
        <p className="pc-subtitle">{filteredProducts.length} productos disponibles en inventario</p>
      </div>

      <div className="pc-controls-panel">
        <div className="pc-search-container">
          <input
            type="text"
            placeholder="Buscar instrumental y suministros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pc-search-input"
          />
          <FaSearch className="pc-search-icon" />
        </div>

        <div className="pc-filter-container">
          <label className="pc-filter-label">Ordenar por:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="pc-filter-select"
          >
            <option value="asc">Ordenar A-Z</option>
            <option value="desc">Ordenar Z-A</option>
          </select>
        </div>
      </div>

      <ProductGrid
        products={currentProducts}
        onAddProduct={handleAddToOrder}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        searchTerm={searchTerm}
        generateProductKey={generateProductKey}
      />
      
      {!currentProducts.length && (
        <div className="pc-empty-state">
          <FaBoxOpen className="pc-empty-icon" />
          <h3>No se encontraron productos</h3>
          <p>No hay productos que coincidan con los filtros aplicados</p>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;