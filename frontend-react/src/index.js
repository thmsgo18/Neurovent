import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/global.css';
import App from './App';
import { PreferencesProvider } from './context/PreferencesContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <PreferencesProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PreferencesProvider>
  </React.StrictMode>
);
