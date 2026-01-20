// frontend/src/App.tsx
import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useUserStore } from './store/userStore';
import { ModalProvider } from './contexts/ModalContext';

function App() {
  const initializeAuth = useUserStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state from localStorage on app load
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ModalProvider>
      <AppRoutes />
    </ModalProvider>
  );
}

export default App;
