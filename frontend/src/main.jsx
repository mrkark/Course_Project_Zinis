import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import useSocketStore from './store/socketStore';
import { socketService } from './services/socket';
import './index.css';

// The application uses a dark interface by default.
document.documentElement.classList.add('dark');

function AppWrapper() {
  const { initSocket, connect } = useSocketStore();

  useEffect(() => {
    const cleanup = initSocket();
    connect();
    return cleanup;
  }, [initSocket, connect]);

  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWrapper />
    </BrowserRouter>
  </React.StrictMode>
);