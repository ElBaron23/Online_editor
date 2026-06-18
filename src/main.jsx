import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { I18nProvider } from './context/I18nContext.jsx';
import { FileSystemProvider } from './context/FileSystemContext.jsx';

// Styling imports
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../assets/css/style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <FileSystemProvider>
        <App />
      </FileSystemProvider>
    </I18nProvider>
  </React.StrictMode>
);
