import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api';
import { FaSearch, FaBoxOpen, FaExclamationTriangle } from 'react-icons/fa';
import ProductGrid from '../components/ProductGrid';
import '../styles/ProductCatalog.css';

// Función mejorada para generar claves
const generateProductKey = (product) => {
  if (!product) return 'unknown-product';
  
  const codigoArticulo = product.CodigoArticulo || 'no-code';
  const codigoProveedor = product.CodigoProveedor || 'no-prov';
  const baseKey = `${codigoArticulo}-${codigoProveedor}`;
  
  let hash = 0;
  const str = baseKey + (product.DescripcionArticulo || '');
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const uniqueHash = Math.abs(hash).toString(36);
  return `prod-${uniqueHash}-${codigoArticulo.slice(-4)}`;
};

// Función de validación
const isValidProduct = (product) => {
  return product && 
         product.CodigoArticulo && 
         product.DescripcionArticulo &&
         typeof product.CodigoArticulo === 'string';
};

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

  // Redirigir si no hay usuario
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  // Función optimizada para verificar imágenes
  const checkImageExists = useCallback(async (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // Timeout para evitar esperas infinitas
      setTimeout(() => resolve(false), 2000);
    });
  }, []);

  // Función mejorada para obtener imagen del producto
  const getProductImage = useCallback(async (product) => {
    if (!product.CodigoArticulo) return '/images/default.jpg';
    
    // Probar imagen local primero
    const localImage = `/images/${product.CodigoArticulo}.jpg`;
    const localExists = await checkImageExists(localImage);
    
    if (localExists) return localImage;
    
    // Fallback a imagen de la base de datos
    if (product.RutaImagen) {
      const dbImageExists = await checkImageExists(product.RutaImagen);
      if (dbImageExists) return product.RutaImagen;
    }
    
    // Último fallback
    return '/images/default.jpg';
  }, [checkImageExists]);

  // Cargar productos con manejo mejorado de errores
  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      if (!mounted) return;

      try {
        setLoading(true);
        setError('');

        const response = await api.get('/api/products');
        
        if (!mounted) return;

        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Formato de datos inválido');
        }

        // Filtrar y validar productos
        const validProducts = response.data.filter(isValidProduct);
        
        if (validProducts.length === 0) {
          setError('No se encontraron productos válidos');
          setProducts([]);
          setFilteredProducts([]);
          return;
        }

        // Procesar imágenes en paralelo con límite
        const processProduct = async (product) => {
          try {
            const imagePath = await getProductImage(product);
            return { ...product, FinalImage: imagePath };
          } catch (imgError) {
            console.warn(`Error procesando imagen para ${product.CodigoArticulo}:`, imgError);
            return { ...product, FinalImage: '/images/default.jpg' };
          }
        };

        // Procesar en lotes para mejor rendimiento
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < validProducts.length; i += batchSize) {
          batches.push(validProducts.slice(i, i + batchSize));
        }

        let processedProducts = [];
        for (const batch of batches) {
          if (!mounted) break;
          
          const batchResults = await Promise.allSettled(batch.map(processProduct));
          const successfulProducts = batchResults
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
          
          processedProducts = [...processedProducts, ...successfulProducts];
        }

        if (!mounted) return;

        // Ordenar productos
        const sortedProducts = processedProducts.sort((a, b) =>
          sortOrder === 'asc' 
            ? a.DescripcionArticulo.localeCompare(b.DescripcionArticulo)
            : b.DescripcionArticulo.localeCompare(a.DescripcionArticulo)
        );

        setProducts(sortedProducts);
        setFilteredProducts(sortedProducts);

      } catch (err) {
        if (!mounted) return;
        
        console.error('Error loading products:', err);
        setError(err.response?.data?.error || 'Error al cargar el catálogo');
        setProducts([]);
        setFilteredProducts([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [getProductImage, sortOrder]);

  // Filtrar productos de manera eficiente
  useEffect(() => {
    if (!products.length) return;

    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      setFilteredProducts(products);
      setCurrentPage(1);
      return;
    }

    // Debounce para búsqueda
    const timeoutId = setTimeout(() => {
      const filtered = products.filter(product =>
        product.DescripcionArticulo?.toLowerCase().includes(term) ||
        product.NombreProveedor?.toLowerCase().includes(term) ||
        product.CodigoArticulo?.toLowerCase().includes(term)
      );

      setFilteredProducts(filtered);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, products]);

  // Calcular paginación
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  // Manejo de eventos mejorado
  const handleAddToOrder = useCallback((product) => {
    if (!isValidProduct(product)) {
      console.error('Producto inválido:', product);
      return;
    }
    
    navigate('/crear-pedido', { 
      state: { 
        selectedProduct: product,
        timestamp: Date.now() // Para evitar cache
      } 
    });
  }, [navigate]);

  const handlePageChange = useCallback((newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }, [totalPages]);

  // Estados de carga y error
  if (loading) {
    return (
      <div className="pc-loading-container">
        <div className="pc-spinner"></div>
        <p>Cargando catálogo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pc-error-container">
        <FaExclamationTriangle className="pc-error-icon" />
        <h3>Error al cargar el catálogo</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="pc-retry-button"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="pc-container">
      <div className="pc-header">
        <h2 className="pc-title">Catálogo de Suministros Dentales</h2>
        <p className="pc-subtitle">
          {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} disponible{filteredProducts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="pc-controls-panel">
        <div className="pc-search-container">
          <FaSearch className="pc-search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pc-search-input"
            aria-label="Buscar productos"
          />
        </div>

        <div className="pc-filter-container">
          <label htmlFor="sort-order" className="pc-filter-label">
            Ordenar por:
          </label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="pc-filter-select"
          >
            <option value="asc">Nombre A-Z</option>
            <option value="desc">Nombre Z-A</option>
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
      
      {currentProducts.length === 0 && filteredProducts.length > 0 && (
        <div className="pc-pagination-info">
          Página {currentPage} de {totalPages}
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="pc-empty-state">
          <FaBoxOpen className="pc-empty-icon" />
          <h3>No se encontraron productos</h3>
          <p>
            {searchTerm 
              ? `No hay resultados para "${searchTerm}"`
              : 'No hay productos disponibles en este momento'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;