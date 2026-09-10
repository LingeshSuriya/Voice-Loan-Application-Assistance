import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { VoiceAudioProvider } from './context/VoiceAudioContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <VoiceAudioProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </VoiceAudioProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
