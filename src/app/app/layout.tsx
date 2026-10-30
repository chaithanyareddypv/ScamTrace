import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  return <AppShell user={user}>{children}</AppShell>;
}

