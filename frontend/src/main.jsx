import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VoiceAudioProvider } from './context/VoiceAudioContext';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <VoiceAudioProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </VoiceAudioProvider>
  </React.StrictMode>
);
