import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaBoxOpen, FaShoppingCart } from 'react-icons/fa';
import ProductGrid from '../components/ProductGrid';
import CartPreview from '../components/CartPreview';
import '../styles/ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const productsPerPage = 20;

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

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

  const handleAddToCart = (product) => {
    setSelectedProducts(prev => {
      const existingIndex = prev.findIndex(p => 
        generateProductKey(p) === generateProductKey(product)
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          Cantidad: updated[existingIndex].Cantidad + 1
        };
        return updated;
      } else {
        return [...prev, { ...product, Cantidad: 1 }];
      }
    });
  };

  const handleRemoveFromCart = (productKey) => {
    setSelectedProducts(prev => prev.filter(p => 
      generateProductKey(p) !== productKey
    ));
  };

  const handleGoToOrder = () => {
    navigate('/crear-pedido', { state: { selectedProducts } });
  };

  const handlePageChange = (newPage) => 
    newPage > 0 && newPage <= totalPages && setCurrentPage(newPage);

  if (loading) return <div className="pc-loading"><FaBoxOpen /> Cargando catálogo...</div>;
  if (error) return <div className="pc-error">{error}</div>;

  return (
    <div className="pc-container">
      <div className="pc-header">
        <h2>Catálogo de Suministros Dentales</h2>
        <p>{filteredProducts.length} productos disponibles en inventario</p>
      </div>

      <div className="pc-controls">
        <div className="pc-search-box">
          <input
            type="text"
            placeholder="Buscar instrumental y suministros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <FaSearch className="search-icon" />
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

      <ProductGrid
        products={currentProducts}
        onAddProduct={handleAddToCart}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        searchTerm={searchTerm}
        generateProductKey={generateProductKey}
      />
      
      <CartPreview 
        products={selectedProducts} 
        onRemove={handleRemoveFromCart}
        onGoToOrder={handleGoToOrder}
        generateProductKey={generateProductKey}
      />

      {!currentProducts.length && (
        <div className="pc-no-results">
          <FaBoxOpen />
          <p>No se encontraron productos con los filtros aplicados</p>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;