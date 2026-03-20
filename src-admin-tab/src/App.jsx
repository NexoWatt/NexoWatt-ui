import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import InstallerPage from './pages/InstallerPage';
import LicensePage from './pages/LicensePage';
import RedirectPage from './pages/RedirectPage';

export default function App() {
  return (
    <Routes>
      <Route element={<InstallerPage />} path="/" />
      <Route element={<InstallerPage />} path="/installer" />
      <Route element={<LicensePage />} path="/license" />
      <Route element={<RedirectPage targetKey="appcenter" />} path="/redirect/appcenter" />
      <Route element={<RedirectPage targetKey="simulation" />} path="/redirect/simulation" />
      <Route element={<RedirectPage targetKey="smarthome-config" />} path="/redirect/smarthome-config" />
      <Route element={<RedirectPage targetKey="smarthome-vis" />} path="/redirect/smarthome-vis" />
      <Route element={<Navigate replace to="/installer" />} path="*" />
    </Routes>
  );
}
