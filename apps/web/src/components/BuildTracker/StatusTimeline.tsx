'use client';

import { BuildStatus } from '@app-builder/shared';

interface StatusTimelineProps {
  currentStatus: BuildStatus;
}

const STATUSES: { key: BuildStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'generating', label: 'Generating Code' },
  { key: 'queued', label: 'Queued for Build' },
  { key: 'building', label: 'Building' },
  { key: 'success', label: 'Success' },
];

const STATUS_ORDER: Record<BuildStatus, number> = {
  pending: 0,
  generating: 1,
  queued: 2,
  building: 3,
  success: 4,
  failed: -1,
};

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = STATUS_ORDER[currentStatus];
  const isFailed = currentStatus === 'failed';

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        {STATUSES.map((status, index) => {
          const isCompleted = !isFailed && currentIndex > index;
          const isCurrent = currentStatus === status.key;

          return (
            <div key={status.key} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={'flex-1 h-1 ' + (isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-200')}
                  />
                )}
                <div
                  className={
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ' +
                    (isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-blue-500 text-white animate-pulse'
                      : isFailed && index === 0
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-500')
                  }
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STATUSES.length - 1 && (
                  <div
                    className={'flex-1 h-1 ' + (isCompleted ? 'bg-green-500' : 'bg-gray-200')}
                  />
                )}
              </div>
              <span
                className={
                  'mt-2 text-xs text-center ' +
                  (isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600 font-medium' : 'text-gray-500')
                }
              >
                {status.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {isFailed && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Build failed. Check the logs below for details.
        </div>
      )}
    </div>
  );
}
