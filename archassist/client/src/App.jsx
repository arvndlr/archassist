import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ProjectForm from './pages/ProjectForm.jsx';
import Report from './pages/Report.jsx';
import History from './pages/History.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import KnowledgeBase from './pages/admin/KnowledgeBase.jsx';
import KnowledgeForm from './pages/admin/KnowledgeForm.jsx';

const home = (user) => (user.role === 'admin' ? '/admin' : '/projects/new');

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={home(user)} replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (user) return <Navigate to={home(user)} replace />;
  return children;
}

function Home() {
  const { user } = useAuth();
  return <Navigate to={home(user)} replace />;
}

// Remount forms when the route id changes so state never leaks between records.
function EditProject() { const { id } = useParams(); return <ProjectForm key={`edit-${id}`} />; }
function EditEntry() { const { id } = useParams(); return <KnowledgeForm key={`entry-${id}`} />; }

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="projects/new" element={<RequireAuth role="student"><ProjectForm key="new" /></RequireAuth>} />
        <Route path="projects/:id/edit" element={<RequireAuth role="student"><EditProject /></RequireAuth>} />
        <Route path="history" element={<RequireAuth role="student"><History /></RequireAuth>} />
        <Route path="reports/:id" element={<Report />} />
        <Route path="admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
        <Route path="admin/knowledge" element={<RequireAuth role="admin"><KnowledgeBase /></RequireAuth>} />
        <Route path="admin/knowledge/new" element={<RequireAuth role="admin"><KnowledgeForm key="new" /></RequireAuth>} />
        <Route path="admin/knowledge/:id" element={<RequireAuth role="admin"><EditEntry /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
