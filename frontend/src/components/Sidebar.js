import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FiHome, FiShoppingCart, FiList, 
  FiPieChart, FiMenu, FiChevronLeft 
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: '/', name: 'Inicio', icon: <FiHome /> },
    { path: '/products', name: 'Productos', icon: <FiShoppingCart /> },
    { path: '/orders', name: 'Pedidos', icon: <FiList /> },
    { path: '/dashboard', name: 'Dashboard', icon: <FiPieChart /> }
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <h2>Gestor Compras</h2>}
        <button className="toggle-btn" onClick={toggleSidebar}>
          {collapsed ? <FiMenu /> : <FiChevronLeft />}
        </button>
      </div>
      
      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
            title={item.name}
          >
            <span className="menu-icon">{item.icon}</span>
            {!collapsed && <span className="menu-text">{item.name}</span>}
          </Link>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">U</div>
          {!collapsed && <span className="user-name">Usuario</span>}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;