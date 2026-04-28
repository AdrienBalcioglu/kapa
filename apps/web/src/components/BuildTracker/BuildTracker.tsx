'use client';

import { BuildJob } from '@app-builder/shared';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { StatusTimeline } from './StatusTimeline';
import { LogViewer } from './LogViewer';

interface BuildTrackerProps {
  build: BuildJob;
  isLoading?: boolean;
}

export function BuildTracker({ build }: BuildTrackerProps) {
  const isComplete = build.status === 'success' || build.status === 'failed';

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Build Status</h2>
            <p className="text-sm text-gray-500 mt-1">
              Platform: {build.platform.toUpperCase()} | Build ID: {build.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isComplete && (
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <StatusTimeline currentStatus={build.status} />

        {build.status === 'success' && build.downloadUrl && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-800">Build Complete!</h3>
                <p className="text-sm text-green-600 mt-1">
                  Your {build.platform.toUpperCase()} app is ready for download.
                </p>
              </div>
              <a
                href={build.downloadUrl}
                download
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download .{build.platform === 'ios' ? 'ipa' : 'apk'}
              </a>
            </div>
          </div>
        )}

        {build.status === 'failed' && build.errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-medium text-red-800">Build Failed</h3>
            <p className="text-sm text-red-600 mt-1">{build.errorMessage}</p>
          </div>
        )}

        <LogViewer logs={build.logs} isLoading={!isComplete} />

        {build.startedAt && (
          <div className="text-sm text-gray-500">
            Started: {new Date(build.startedAt).toLocaleString()}
            {build.completedAt && (
              <span className="ml-4">
                Completed: {new Date(build.completedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
