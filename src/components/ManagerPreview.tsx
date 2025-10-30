import React from 'react';

const ManagerPreview: React.FC = () => {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
      {/* Mock browser window */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        {/* Browser header */}
        <div className="bg-gray-200 dark:bg-gray-700 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex-1 bg-white dark:bg-gray-800 rounded px-3 py-1 mx-4">
            <span className="text-xs text-gray-600 dark:text-gray-400">cdn-userv.info/manager</span>
          </div>
        </div>

        {/* Manager interface mock */}
        <div className="bg-gray-50 dark:bg-gray-900 min-h-[400px]">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full relative">
                    <div className="absolute top-0 left-0 w-1 h-1 bg-blue-600 rounded-full"></div>
                    <div className="absolute top-1 right-0 w-1 h-1 bg-blue-600 rounded-full"></div>
                    <div className="absolute bottom-0 left-1 w-1 h-1 bg-blue-600 rounded-full"></div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">CDN-USERV</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">Gestionnaire de Médias</span>
              </div>
              <div className="flex gap-2">
                <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs">Uploader</div>
                <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded text-xs">⚙️</div>
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Dossiers</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded">
                  <span className="text-yellow-600">📁</span>
                  <span className="text-sm font-medium">Disque</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 ml-4">
                  <span className="text-yellow-600">📁</span>
                  <span className="text-sm">Images</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 ml-4">
                  <span className="text-yellow-600">📁</span>
                  <span className="text-sm">Documents</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 ml-4">
                  <span className="text-yellow-600">📁</span>
                  <span className="text-sm">Videos</span>
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 p-6">
              {/* File grid */}
              <div className="grid grid-cols-5 gap-4">
                {/* File items */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
                  <div key={item} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="text-center">
                      {item <= 3 ? (
                        <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs">IMG</span>
                        </div>
                      ) : item <= 6 ? (
                        <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs">DOC</span>
                        </div>
                      ) : (
                        <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-red-400 to-pink-500 rounded-lg flex items-center justify-center">
                          <span className="text-white text-xs">VID</span>
                        </div>
                      )}
                      <div className="text-xs font-medium text-gray-900 dark:text-white">
                        file_{item}.{item <= 3 ? 'jpg' : item <= 6 ? 'pdf' : 'mp4'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item <= 3 ? '2.3 MB' : item <= 6 ? '1.8 MB' : '15.2 MB'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details panel */}
            <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Détails du fichier</span>
                  <span className="text-gray-500">✕</span>
                </div>
                
                {/* File preview */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">IMG</span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">photo_001.jpg</div>
                </div>

                {/* File info */}
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Type</div>
                    <div className="text-gray-900 dark:text-white">image/jpeg</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Taille</div>
                    <div className="text-gray-900 dark:text-white">2.3 MB</div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">URL</div>
                    <div className="text-blue-600 dark:text-blue-400 break-all">cdn-userv.info/files/...</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-2">
                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded text-xs">
                    Télécharger
                  </button>
                  <button className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded text-xs">
                    Copier le lien
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features highlight */}
      {/* <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-2">
            <span className="text-blue-600 dark:text-blue-400">📁</span>
          </div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">Organisation</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Dossiers structurés</div>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-2">
            <span className="text-green-600 dark:text-green-400">⚡</span>
          </div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">Upload rapide</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Glisser-déposer</div>
        </div>
        <div className="text-center">
          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-2">
            <span className="text-purple-600 dark:text-purple-400">🔗</span>
          </div>
          <div className="text-xs font-medium text-gray-900 dark:text-white">Partage facile</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">URLs directes</div>
        </div>
      </div>*/}
      
    </div> 
  );
};

export default ManagerPreview;