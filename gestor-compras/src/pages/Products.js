import { useState, useContext, useMemo, useEffect, useCallback } from "react";
import { StoreContext } from "../context";
import ProductCard from "../components/ProductCard";
import productsData from "../mock/products.json"; // Datos mockeados
import "../styles/products.css";

const PRODUCTS_PER_PAGE = 20;

const Products = () => {
  const { cart, setCart } = useContext(StoreContext);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("asc"); // Orden por precio
  const [sortBy, setSortBy] = useState("name"); // Orden por nombre o precio

  // Simula la carga de productos
  useEffect(() => {
    const loadProducts = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        setError("Error al cargar los productos");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Implementa debounce en la búsqueda (espera 300ms antes de actualizar el estado)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reinicia a la primera página en una nueva búsqueda
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  // Filtra y ordena productos de forma optimizada
  const filteredAndSortedProducts = useMemo(() => {
    let filteredProducts = productsData;

    // Filtrar por nombre o proveedor
    if (debouncedSearch) {
      const normalizedSearch = debouncedSearch.trim().toLowerCase();
      filteredProducts = filteredProducts.filter((product) =>
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.supplier.toLowerCase().includes(normalizedSearch) // Cambiado 'provider' a 'supplier'
      );
    }

    // Ordenar productos según el tipo seleccionado
    const sortedProducts = [...filteredProducts]; // Copiar para evitar la mutación
    if (sortBy === "name") {
      sortedProducts.sort((a, b) =>
        sortOrder === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      );
    } else if (sortBy === "price") {
      sortedProducts.sort((a, b) =>
        sortOrder === "asc" ? a.price - b.price : b.price - a.price
      );
    }

    return sortedProducts;
  }, [debouncedSearch, sortBy, sortOrder]);

  // Obtener los productos de la página actual
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredAndSortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [filteredAndSortedProducts, currentPage]);

  // Función para cambiar de página
  const totalPages = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);
  const changePage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Función optimizada para agregar productos al carrito
  const addToCart = useCallback((product) => {
    setCart((prevCart) => {
      const existingProduct = prevCart.find((item) => item.id === product.id);
      return existingProduct
        ? prevCart.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...prevCart, { ...product, quantity: 1 }];
    });
  }, [setCart]);

  if (loading) return <p aria-live="polite">Cargando productos...</p>;
  if (error) return <p className="error" aria-live="assertive">{error}</p>;

  return (
    <div>
      {/* Contenedor para el campo de búsqueda */}
      <div id="search-input-wrapper">
        <input
          id="search-input"
          type="text"
          placeholder="Comienza a escribir para buscar productos...."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar productos"
          aria-describedby="search-helper-text"
        />
      </div>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor="sort-by">Ordenar por:</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Nombre</option>
            <option value="price">Precio</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-order">Orden:</label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </select>
        </div>
      </div>

      <div className="product-list">
        {paginatedProducts.length > 0 ? (
          <div className="grid-container">
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} addToCart={addToCart} />
            ))}
          </div>
        ) : (
          <p aria-live="polite">No se encontraron productos que coincidan con la búsqueda.</p>
        )}
      </div>

      {/* Controles de paginación */}
      {totalPages > 1 && (
        <div className="pagination">
          <button onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1}>
            Anterior
          </button>
          <span>Página {currentPage} de {totalPages}</span>
          <button onClick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages}>
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
};

export default Products;
