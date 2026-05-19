'use client';

import { createContext, useContext, ReactNode } from 'react';

const AdminPathContext = createContext<string>('');

export function AdminPathProvider({
  adminPath,
  children,
}: {
  adminPath: string;
  children: ReactNode;
}) {
  return (
    <AdminPathContext.Provider value={adminPath}>
      {children}
    </AdminPathContext.Provider>
  );
}

export function useAdminPath(): string {
  return useContext(AdminPathContext);
}
