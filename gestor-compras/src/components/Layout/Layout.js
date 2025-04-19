import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import './Header.css';
import './Sidebar.css';
import './Layout.css';

const Layout = () => {
  return (
    <div className="app-layout">
      <Header />
      <div className="layout-body">
        <Sidebar />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
