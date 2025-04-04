import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "./context";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import OrderDetails from "./pages/OrderDetails";
import { useContext } from "react";
import { StoreContext } from "./context";

const AuthWrapper = ({ children }) => {
  const { isAuthenticated } = useContext(StoreContext);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const App = () => (
  <StoreProvider>
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <AuthWrapper>
              <Home />
            </AuthWrapper>
          } 
        />
        <Route 
          path="/products" 
          element={
            <AuthWrapper>
              <Products />
            </AuthWrapper>
          } 
        />
        <Route 
          path="/cart" 
          element={
            <AuthWrapper>
              <Cart />
            </AuthWrapper>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <AuthWrapper>
              <Orders />
            </AuthWrapper>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AuthWrapper>
              <Admin />
            </AuthWrapper>
          } 
        />
        <Route 
          path="/order-details/:orderId" 
          element={
            <AuthWrapper>
              <OrderDetails />
            </AuthWrapper>
          } 
        />
      </Routes>
    </BrowserRouter>
  </StoreProvider>
);

export default App;