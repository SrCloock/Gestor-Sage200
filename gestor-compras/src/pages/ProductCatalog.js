import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaBoxOpen, FaSync, FaFilter, FaExclamationTriangle } from 'react-icons/fa';
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
  const [cacheInfo, setCacheInfo] = useState({ fromCache: false, timestamp: null });
  const [forceReload, setForceReload] = useState(false);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const productsPerPage = 40;

  // Función MEJORADA para generar claves únicas usando campos reales de la base de datos
  const generateProductKey = (product) => {
    return `${product.CodigoArticulo}-${product.CodigoProveedor || 'NP'}-${product.CodigoFamilia || 'NF'}-${product.CodigoSubfamilia || 'NS'}`;
  };

  // Cache simple en memoria con expiración
  const [productsCache, setProductsCache] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const fetchProducts = async (useCache = true, forceRefresh = false) => {
    // Verificar cache primero si no es forzado
    const now = Date.now();
    if (useCache && !forceRefresh && productsCache && (now - lastFetchTime) < CACHE_DURATION) {
      console.log('✅ Sirviendo productos desde cache local');
      setProducts(productsCache);
      setLoading(false);
      setCacheInfo({ fromCache: true, timestamp: new Date(lastFetchTime).toLocaleTimeString() });
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.time('ProductCatalogLoad');
      
      // Usar parámetro para evitar cache del servidor si es forzado
      const cacheParam = forceRefresh ? '?cache=false' : '?cache=true';
      const response = await api.get(`/api/products${cacheParam}`);
      
      console.timeEnd('ProductCatalogLoad');

      let productsData = response.data.products || response.data;

      // Actualizar información del cache
      if (response.data.fromCache !== undefined) {
        setCacheInfo({ 
          fromCache: response.data.fromCache, 
          timestamp: response.data.processedAt ? new Date(response.data.processedAt).toLocaleTimeString() : 'Ahora'
        });
      }

      console.log(`📦 Obtenidos ${Array.isArray(productsData) ? productsData.length : 'N/A'} productos`);

      // Eliminar duplicados usando la clave única MEJORADA
      const uniqueProductsMap = new Map();
      
      if (Array.isArray(productsData)) {
        productsData.forEach(product => {
          const key = generateProductKey(product);
          if (!uniqueProductsMap.has(key)) {
            uniqueProductsMap.set(key, product);
          }
        });
      }

      const uniqueProducts = Array.from(uniqueProductsMap.values());
      setProducts(uniqueProducts);
      
      // Actualizar cache local
      if (!forceRefresh) {
        setProductsCache(uniqueProducts);
        setLastFetchTime(Date.now());
      }

      console.log(`✅ ${uniqueProducts.length} productos únicos procesados`);

    } catch (err) {
      console.error('❌ Error loading products:', err);
      
      // Estrategia de fallback: usar cache local si está disponible
      if (productsCache && productsCache.length > 0) {
        console.log('🔄 Usando cache local debido a error');
        setProducts(productsCache);
        setError('Error de conexión, mostrando datos cacheados. Algunos datos pueden estar desactualizados.');
        setCacheInfo({ fromCache: true, timestamp: new Date(lastFetchTime).toLocaleTimeString() });
      } else {
        setError('Error al cargar el catálogo: ' + (err.message || 'Error desconocido'));
      }
    } finally {
      setLoading(false);
      setForceReload(false);
    }
  };

  useEffect(() => {
    fetchProducts(true, forceReload);
  }, [forceReload]);

  const handleAddToOrder = (product) => {
    navigate('/crear-pedido', { 
      state: { selectedProduct: product }
    });
  };

  const handleRefresh = () => {
    console.log('🔄 Forzando recarga de productos...');
    setForceReload(true);
  };

  const handleClearCache = async () => {
    try {
      await api.delete('/api/products/cache');
      setProductsCache(null);
      setLastFetchTime(0);
      console.log('✅ Cache limpiado manualmente');
      handleRefresh();
    } catch (err) {
      console.error('Error limpiando cache:', err);
      setError('Error al limpiar cache: ' + err.message);
    }
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

  // BUSCADOR MEJORADO - busca en todos los campos relevantes
  const productosFiltrados = useMemo(() => {
    let result = [...products];

    if (filtros.search.trim()) {
      const term = filtros.search.toLowerCase().trim();
      result = result.filter(product => {
        const descripcion = product.DescripcionArticulo?.toLowerCase() || '';
        const codigo = product.CodigoArticulo?.toLowerCase() || '';
        const proveedor = product.NombreProveedor?.toLowerCase() || '';
        const familia = product.Familia?.toLowerCase() || '';
        const subfamilia = product.Subfamilia?.toLowerCase() || '';

        return descripcion.includes(term) ||
               codigo.includes(term) ||
               proveedor.includes(term) ||
               familia.includes(term) ||
               subfamilia.includes(term);
      });
    }

    if (filtros.familia) {
      result = result.filter(product => product.Familia === filtros.familia);
    }

    if (filtros.subfamilia) {
      result = result.filter(product => product.Subfamilia === filtros.subfamilia);
    }

    // Ordenar después de filtrar
    result.sort((a, b) => {
      return sortOrder === 'asc' 
        ? (a.DescripcionArticulo?.localeCompare(b.DescripcionArticulo || '')) 
        : (b.DescripcionArticulo?.localeCompare(a.DescripcionArticulo || ''));
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

  // Calcular productos para la página actual
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = productosFiltrados.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(productosFiltrados.length / productsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll suave hacia arriba
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Indicador de rendimiento
  const renderPerformanceInfo = () => {
    if (cacheInfo.fromCache && !loading) {
      return (
        <div className="pc-cache-info">
          <FaExclamationTriangle className="pc-cache-icon" />
          <span>Mostrando datos cacheados ({cacheInfo.timestamp})</span>
          <button onClick={handleRefresh} className="pc-refresh-cache">
            Actualizar
          </button>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="pc-loading-container">
        <div className="pc-spinner"></div>
        <p>Cargando catálogo de productos...</p>
        <small>Esto puede tomar unos segundos la primera vez</small>
      </div>
    );
  }

  return (
    <div className="pc-container">
      {/* Header con información de cache */}
      <div className="pc-header">
        <div className="pc-title-section">
          <h2 className="pc-title">Catálogo de Productos</h2>
          <p className="pc-subtitle">
            {products.length} productos disponibles
            {cacheInfo.fromCache && ` • Cache: ${cacheInfo.timestamp}`}
          </p>
        </div>
        
        <div className="pc-header-actions">
          <button onClick={handleRefresh} className="pc-refresh-button" disabled={loading}>
            <FaSync className={`pc-refresh-icon ${loading ? 'pc-spinning' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
          
          {process.env.NODE_ENV === 'development' && (
            <button onClick={handleClearCache} className="pc-clear-cache-button" title="Limpiar cache">
              🗑️ Cache
            </button>
          )}
        </div>
      </div>

      {/* Información de cache */}
      {renderPerformanceInfo()}

      {error && (
        <div className="pc-error-message">
          <div className="pc-error-icon">⚠️</div>
          <p>{error}</p>
          <button onClick={() => setError('')} className="pc-error-close">×</button>
        </div>
      )}

      {/* Panel de controles */}
      <div className="pc-controls-panel">
        <div className="pc-search-container">
          <FaSearch className="pc-search-icon" />
          <input
            type="text"
            placeholder="Buscar productos por nombre, código, proveedor, familia..."
            value={filtros.search}
            onChange={(e) => {
              setFiltros(prev => ({ ...prev, search: e.target.value }));
              setCurrentPage(1);
            }}
            className="pc-search-input"
          />
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
          <FaFilter className="pc-filter-icon" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="pc-filter-select"
          >
            <option value="asc">Ordenar A-Z</option>
            <option value="desc">Ordenar Z-A</option>
          </select>
        </div>
        
        <button 
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="pc-toggle-filters"
        >
          <FaFilter />
          {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </button>
      </div>

      {/* Filtros avanzados */}
      {mostrarFiltros && (
        <FiltrosAvanzados
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          onLimpiarFiltros={limpiarFiltros}
          opcionesFamilias={opcionesFamilias}
          opcionesSubfamilias={opcionesSubfamilias}
        />
      )}

      {/* Información de resultados filtrados */}
      {filtros.search || filtros.familia || filtros.subfamilia ? (
        <div className="pc-filter-info">
          <span>
            Mostrando {productosFiltrados.length} de {products.length} productos
            {filtros.search && ` para "${filtros.search}"`}
            {filtros.familia && ` en familia "${filtros.familia}"`}
            {filtros.subfamilia && ` en subfamilia "${filtros.subfamilia}"`}
          </span>
          <button onClick={limpiarFiltros} className="pc-clear-filters">
            Limpiar filtros
          </button>
        </div>
      ) : null}

      {/* Grid de productos */}
      <ProductGrid
        products={currentProducts}
        onAddProduct={handleAddToOrder}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        searchTerm={filtros.search}
        generateProductKey={generateProductKey}
        loading={loading}
      />

      {/* Footer con estadísticas */}
      {!loading && (
        <div className="pc-footer">
          <div className="pc-stats">
            <span>Total productos: {products.length}</span>
            <span>Filtrados: {productosFiltrados.length}</span>
            <span>Página {currentPage} de {totalPages}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;