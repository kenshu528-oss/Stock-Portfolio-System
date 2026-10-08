import React from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { VERSION } from '../constants/version';
import { CHANGELOG, getLatestChangelog, getVersionTypeText, getVersionTypeColor } from '../constants/changelog';

interface VersionInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ isOpen, onClose }) => {
  const latestChangelog = getLatestChangelog();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="版本資訊"
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* 當前版本資訊 */}
        <div className="bg-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">當前版本</h3>
            <span className="text-2xl font-bold text-blue-400">{VERSION.DISPLAY}</span>
          </div>
          
          {latestChangelog && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${getVersionTypeColor(latestChangelog.type)}`}>
                  {getVersionTypeText(latestChangelog.type)}
                </span>
                <span className="text-slate-400 text-sm">•</span>
                <span className="text-slate-400 text-sm">{latestChangelog.date}</span>
              </div>
              <h4 className="text-white font-medium">{latestChangelog.title}</h4>
              <p className="text-slate-300 text-sm">{latestChangelog.description}</p>
            </div>
          )}
        </div>

        {/* 最新更新內容 */}
        {latestChangelog && (
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-white font-medium mb-4">最新更新內容</h3>
            
            {/* 新增功能 */}
            {latestChangelog.changes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-green-400 font-medium mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  新增功能
                </h4>
                <ul className="space-y-1">
                  {latestChangelog.changes.map((change, index) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <span className="text-green-400 mr-2">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 問題修復 */}
            {latestChangelog.fixes && latestChangelog.fixes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-blue-400 font-medium mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  問題修復
                </h4>
                <ul className="space-y-1">
                  {latestChangelog.fixes.map((fix, index) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>{fix}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 重大變更 */}
            {latestChangelog.breaking && latestChangelog.breaking.length > 0 && (
              <div className="mb-4">
                <h4 className="text-red-400 font-medium mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  重大變更
                </h4>
                <ul className="space-y-1">
                  {latestChangelog.breaking.map((breaking, index) => (
                    <li key={index} className="text-slate-300 text-sm flex items-start">
                      <span className="text-red-400 mr-2">•</span>
                      <span>{breaking}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 版本歷史 */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-white font-medium mb-4">版本歷史</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {CHANGELOG.map((entry, index) => (
              <div key={entry.version} className="border-l-2 border-slate-600 pl-4 pb-3">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-white font-medium">{entry.version}</span>
                  <span className={`text-xs px-2 py-1 rounded ${getVersionTypeColor(entry.type)} bg-slate-700`}>
                    {getVersionTypeText(entry.type)}
                  </span>
                  <span className="text-slate-400 text-sm">{entry.date}</span>
                </div>
                <h4 className="text-slate-200 text-sm font-medium mb-1">{entry.title}</h4>
                <p className="text-slate-400 text-xs">{entry.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 系統資訊 */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">系統資訊</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">建置環境:</span>
              <span className="text-white ml-2">{process.env.NODE_ENV || 'development'}</span>
            </div>
            <div>
              <span className="text-slate-400">React 版本:</span>
              <span className="text-white ml-2">18.2.0</span>
            </div>
            <div>
              <span className="text-slate-400">TypeScript:</span>
              <span className="text-white ml-2">5.0.2</span>
            </div>
            <div>
              <span className="text-slate-400">Vite:</span>
              <span className="text-white ml-2">4.4.5</span>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <Button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>關閉</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};