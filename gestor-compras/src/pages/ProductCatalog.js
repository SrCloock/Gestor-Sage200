import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaBoxOpen, FaSync, FaFilter } from 'react-icons/fa';
import ProductGrid from '../components/ProductGrid';
import FiltrosAvanzados from '../components/FiltrosAvanzados';
import '../styles/ProductCatalog.css';

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    familia: '',
    subfamilia: '',
    search: ''
  });
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const productsPerPage = 40;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await api.get('/api/products');
        
        if (response.data.products) {
          setProducts(response.data.products);
        } else {
          setProducts(response.data);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setError('Error al cargar el catálogo');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || '00'}`;
  };

  const handleAddToOrder = (product) => {
    navigate('/crear-pedido', { 
      state: { selectedProduct: product }
    });
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const opcionesFamilias = useMemo(() => {
    const familias = [...new Set(products.map(p => p.Familia).filter(Boolean))];
    return familias.sort();
  }, [products]);

  const opcionesSubfamilias = useMemo(() => {
    const subfamilias = products
      .filter(p => p.Familia && p.Subfamilia)
      .map(p => ({ familia: p.Familia, valor: p.Subfamilia }));
    
    return [...new Map(subfamilias.map(item => [item.valor, item])).values()];
  }, [products]);

  const productosFiltrados = useMemo(() => {
    let result = [...products];

    if (filtros.search) {
      const term = filtros.search.toLowerCase();
      result = result.filter(product => 
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term)
      );
    }

    if (filtros.familia) {
      result = result.filter(product => product.Familia === filtros.familia);
    }

    if (filtros.subfamilia) {
      result = result.filter(product => product.Subfamilia === filtros.subfamilia);
    }

    result.sort((a, b) => {
      return sortOrder === 'asc' 
        ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
        : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo);
    });

    return result;
  }, [products, filtros, sortOrder]);

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

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = productosFiltrados.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(productosFiltrados.length / productsPerPage);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  if (loading) {
    return (
      <div className="pc-loading-container">
        <div className="pc-spinner"></div>
        <p>Cargando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="pc-container">
      <div className="pc-header">
        <div className="pc-title-section">
          <h2 className="pc-title">Catálogo de Suministros Dentales</h2>
          <p className="pc-subtitle">
            {productosFiltrados.length} productos disponibles
            {filtros.search && ` - Filtro: "${filtros.search}"`}
            {filtros.familia && ` - Familia: ${filtros.familia}`}
            {filtros.subfamilia && ` - Subfamilia: ${filtros.subfamilia}`}
          </p>
        </div>
        <div className="pc-header-actions">
          <button 
            onClick={() => setMostrarFiltros(!mostrarFiltros)} 
            className="pc-filter-toggle"
          >
            <FaFilter /> Filtros
          </button>
          <button onClick={handleRefresh} className="pc-refresh-btn">
            <FaSync />
          </button>
        </div>
      </div>

      <div className="pc-controls-panel">
        <div className="pc-search-container">
          <input
            type="text"
            placeholder="Buscar por descripción, código o proveedor..."
            value={filtros.search}
            onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
            className="pc-search-input"
          />
          <FaSearch className="pc-search-icon" />
          {filtros.search && (
            <button 
              onClick={() => setFiltros(prev => ({ ...prev, search: '' }))}
              className="pc-clear-search"
            >
              ×
            </button>
          )}
        </div>

        <div className="pc-filter-container">
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

      {mostrarFiltros && (
        <FiltrosAvanzados
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          opcionesFamilias={opcionesFamilias}
          opcionesSubfamilias={opcionesSubfamilias}
          onLimpiarFiltros={limpiarFiltros}
        />
      )}

      {error && (
        <div className="pc-error-container">
          <div className="pc-error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      )}

      <ProductGrid
        products={currentProducts}
        onAddProduct={handleAddToOrder}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        searchTerm={filtros.search}
        generateProductKey={generateProductKey}
      />
      
      {!loading && productosFiltrados.length === 0 && (
        <div className="pc-empty-state">
          <FaBoxOpen className="pc-empty-icon" />
          <h3>No se encontraron productos</h3>
          <p>
            {filtros.search || filtros.familia || filtros.subfamilia
              ? 'No hay productos que coincidan con los filtros aplicados'
              : 'No hay productos disponibles en este momento'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;