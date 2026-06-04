import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Workspace from './pages/Workspace';
import Documents from './pages/Documents';
import ClinicalResearch from './pages/ClinicalResearch';
import KnowledgeGraph from './pages/KnowledgeGraph';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Custom Premium Dark Theme matching index.css variables
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e5ff', // Neon cyan
    },
    secondary: {
      main: '#a855f7', // Vivid violet
    },
    background: {
      default: '#070a13', // Deep navy black
      paper: '#0d111c', // Card dark background
    },
    text: {
      primary: '#f1f5f9',
      secondary: '#94a3b8',
    },
    divider: 'rgba(241, 245, 249, 0.08)',
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Outfit", "Inter", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
});

// Private Route Guard
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Admin Route Guard
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userRole } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (userRole !== 'admin') return <Navigate to="/workspace" replace />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Research Workspace Routes */}
            <Route
              path="/workspace"
              element={
                <PrivateRoute>
                  <Workspace />
                </PrivateRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <PrivateRoute>
                  <Documents />
                </PrivateRoute>
              }
            />
            <Route
              path="/clinical"
              element={
                <PrivateRoute>
                  <ClinicalResearch />
                </PrivateRoute>
              }
            />
            <Route
              path="/graph"
              element={
                <PrivateRoute>
                  <KnowledgeGraph />
                </PrivateRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <PrivateRoute>
                  <Reports />
                </PrivateRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              }
            />

            {/* Protected Admin Route */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />

            {/* Default Route Redirect */}
            <Route path="*" element={<Navigate to="/workspace" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
