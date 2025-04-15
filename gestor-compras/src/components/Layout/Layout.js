import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header'; // Asegúrate que coincida con la exportación
import Sidebar from './Sidebar';
import './Header.css';
import './Sidebar.css';

function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <div className="main-content">
        <Sidebar />
        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Layout; // Export por defecto