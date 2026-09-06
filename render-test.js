import { renderToString } from 'react-dom/server';
import React from 'react';
import App from './src/App.tsx';
import { ToastProvider } from './src/components/ToastProvider.tsx';
import { ErrorBoundary } from './src/ErrorBoundary.tsx';

global.window = {
  matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
  innerWidth: 1024,
  innerHeight: 768
};
global.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.navigator = { clipboard: { writeText: () => {} } };

try {
  const html = renderToString(React.createElement(ErrorBoundary, null, React.createElement(ToastProvider, null, React.createElement(App))));
  console.log("RENDER SUCCESS, length:", html.length);
} catch (e) {
  console.log("RENDER FAILED:", e.stack);
}
