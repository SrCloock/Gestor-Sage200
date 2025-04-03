import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StoreProvider } from "./context";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import OrderDetails from "./pages/OrderDetails"; // Importamos la página de detalles del pedido

const App = () => (
  <StoreProvider>
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/order-details/:orderId" element={<OrderDetails />} /> {/* Ruta para los detalles de pedido */}
      </Routes>
    </BrowserRouter>
  </StoreProvider>
);

export default App;
