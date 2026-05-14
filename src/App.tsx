import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CameraProvider } from './context/CameraContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Live from './pages/Live';
import Database from './pages/Database';
import Dashboard from './pages/Dashboard';
import Map from './pages/Map';
import Recordings from './pages/Recordings';
import AIAssist from './pages/AIAssist';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Help from './pages/Help';

function App() {
  return (
    <AuthProvider>
      <CameraProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/live" replace />} />
              <Route path="/live" element={<Live />} />
              <Route path="/database" element={<Database />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/map" element={<Map />} />
              <Route path="/recordings" element={<Recordings />} />
              <Route path="/ai-assist" element={<AIAssist />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
            </Route>
          </Routes>
        </Router>
      </CameraProvider>
    </AuthProvider>
  );
}

export default App;