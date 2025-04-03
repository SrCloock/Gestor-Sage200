import PropTypes from "prop-types";
import "../styles/productCard.css";

const ProductCard = ({ product, addToCart }) => {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="product-image" />
      <div className="product-details">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <p className="product-price">${product.price.toFixed(2)}</p>
        
        {/* Mostrar el proveedor aquí */}
        <p className="product-supplier">Proveedor: {product.supplier}</p>

        <button onClick={() => addToCart(product)} aria-label={`Agregar ${product.name} al carrito`}>
          Agregar al carrito
        </button>
      </div>
    </div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    price: PropTypes.number.isRequired,
    image: PropTypes.string.isRequired,
    supplier: PropTypes.string.isRequired, // Añadido para el proveedor
  }).isRequired,
  addToCart: PropTypes.func.isRequired,
};

export default ProductCard;
