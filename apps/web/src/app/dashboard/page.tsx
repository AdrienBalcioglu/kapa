'use client';

import Link from 'next/link';
import { useAppList } from '@/hooks/useAppConfig';
import { Button, Card, CardContent } from '@/components/ui';
import { AppConfig } from '@app-builder/shared';

export default function DashboardPage() {
  const { apps, isLoading, error } = useAppList();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes applications</h1>
          <p className="text-gray-600 mt-1">Gerez vos applications mobiles</p>
        </div>
        <Link href="/create">
          <Button>Nouvelle app</Button>
        </Link>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && apps.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune application</h3>
            <p className="text-gray-500 mb-4">Commencez par creer votre premiere app mobile.</p>
            <Link href="/create">
              <Button>Creer ma premiere app</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && apps.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      )}
    </div>
  );
}

function AppCard({ app }: { app: AppConfig }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
            {app.appName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{app.appName}</h3>
            <p className="text-sm text-gray-500 truncate">{app.url}</p>
            <div className="flex gap-2 mt-2">
              {app.platforms.map((platform) => (
                <span
                  key={platform}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                >
                  {platform.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {new Date(app.createdAt).toLocaleDateString()}
          </span>
          <Link href={'/create?appId=' + app.id}>
            <Button variant="outline" size="sm">Nouveau build</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
