import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
  const { user } = useAuth();

  if (!user.isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden w-full">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0 w-full">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;