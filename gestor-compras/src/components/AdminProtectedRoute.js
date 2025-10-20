import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminProtectedRoute = () => {
  const { user } = React.useContext(AuthContext);
  
  console.log('🔐 Verificando permisos de admin:', {
    usuario: user?.username,
    isAdmin: user?.isAdmin,
    tieneUser: !!user
  });
  
  if (!user) {
    console.log('❌ No hay usuario, redirigiendo al login');
    return <Navigate to="/login" replace />;
  }

  if (!user.isAdmin) {
    console.log('🚫 Usuario no es administrador, redirigiendo al home');
    return <Navigate to="/" replace />;
  }

  console.log('✅ Usuario es administrador, permitiendo acceso');
  return <Outlet />;
};

export default AdminProtectedRoute;