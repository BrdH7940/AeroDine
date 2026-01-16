// frontend/src/App.tsx
import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useUserStore } from './store/userStore';

function App() {
  const initializeAuth = useUserStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state from localStorage on app load
    initializeAuth();
  }, [initializeAuth]);

  return <AppRoutes />;
}

export default App;
