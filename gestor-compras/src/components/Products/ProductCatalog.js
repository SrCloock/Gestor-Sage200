import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import ProductGrid from '../Shared/ProductGrid';
import { FaSearch, FaBoxOpen } from 'react-icons/fa';
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
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NOPROV'}`;
  };

  const removeDuplicates = (products) => {
    const seen = new Set();
    return products.filter(product => {
      const key = generateProductKey(product);
      return seen.has(key) ? false : seen.add(key);
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
    return product.RutaImagen || '/images/default.jpg';
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/api/products');
        const uniqueProducts = removeDuplicates(response.data);
        
        const productsWithImages = await Promise.all(
          uniqueProducts.map(async (product) => ({
            ...product,
            FinalImage: await getProductImage(product)
          }))
        );

        const sortedProducts = [...productsWithImages].sort((a, b) =>
          a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        );

        setProducts(sortedProducts);
        setFilteredProducts(sortedProducts);
      } catch (err) {
        setError('Error al cargar el catálogo de productos');
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
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => sortOrder === 'asc' 
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

  const handleProductClick = (product) => {
    navigate('/crear-pedido', { state: { selectedProduct: product } });
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) return <div className="pc-loading">Cargando productos...</div>;
  if (error) return <div className="pc-error">{error}</div>;

  return (
    <div className="pc-container">
      <div className="pc-header">
        <h2><FaBoxOpen /> Catálogo de Suministros Dentales</h2>
        <p>{filteredProducts.length} productos profesionales disponibles</p>
      </div>

      <div className="pc-controls">
        <div className="pc-search-box">
          <input
            type="text"
            placeholder="Buscar por producto, código o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="search-icon" />
        </div>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="styled-select"
        >
          <option value="asc">Ordenar A-Z</option>
          <option value="desc">Ordenar Z-A</option>
        </select>
      </div>

      <ProductGrid
        products={currentProducts}
        onAddProduct={handleProductClick}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        searchTerm={searchTerm}
      />
    </div>
  );
};

export default ProductCatalog;