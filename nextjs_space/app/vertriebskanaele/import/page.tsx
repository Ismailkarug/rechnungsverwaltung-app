
import { Suspense } from 'react';
import { Sidebar } from '@/components/sidebar';
import PlatformImportClient from './_components/platform-import-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PlatformImportPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64">
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Lade Import-Modul...</p>
            </div>
          </div>
        }>
          <PlatformImportClient />
        </Suspense>
      </main>
    </div>
  );
}
