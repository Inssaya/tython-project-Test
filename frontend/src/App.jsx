import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventsList from './pages/EventsList';
import EventRedirect from './pages/EventRedirect';
import Participants from './pages/Participants';
import PublicEventRegister from './pages/PublicEventRegister';
import StaffManagement from './pages/StaffManagement';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register/:id" element={<PublicEventRegister />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/events/:id" element={<EventRedirect />} />
            <Route path="/participants" element={<Participants />} />
            <Route
              path="/staff"
              element={
                <AdminRoute>
                  <StaffManagement />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
