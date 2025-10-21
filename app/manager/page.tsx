"use client";

import { useState, useRef, useEffect } from "react";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: Date;
  mimeType?: string;
  url?: string;
}

interface FolderItem {
  id: string;
  name: string;
  slug: string;
  path: string;
  parentId?: string;
  isRoot: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function MediaManager() {
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ID utilisateur de test - en production, cela viendrait de l'authentification
  const TEST_USER_ID = "68f6914dfac6d73b4751e944";

  // Fonction utilitaire pour obtenir l'URL de base
  const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  };

  // Fonctions utilitaires pour construire les URLs complètes
  const getThumbnailUrl = (url: string | undefined, fileName: string, size: string) => {
    if (!url) return '/placeholder.jpg';
    const fileId = url.split('/').pop()?.split('.')[0];
    return `${window.location.origin}/api/uploads/users/${TEST_USER_ID}/thumbs/${fileId}-${size}.jpg`;
  };

  const getFileUrl = (url: string | undefined, fileName: string) => {
    if (!url) return '';
    return `${window.location.origin}${url}`;
  };

  const copyToClipboard = async (file: FileItem) => {
    try {
      const url = getFileUrl(file.url || '', file.name);
      await navigator.clipboard.writeText(url);
      // Optionnel: afficher une notification de succès
      alert('URL copiée dans le presse-papier !');
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      // Fallback pour les navigateurs qui ne supportent pas l'API clipboard
      const textArea = document.createElement('textarea');
      textArea.value = getFileUrl(file.url || '', file.name);
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert('URL copiée dans le presse-papier !');
      } catch (fallbackErr) {
        console.error('Erreur lors de la copie fallback:', fallbackErr);
        alert('Impossible de copier l\'URL');
      }
      document.body.removeChild(textArea);
    }
  };

  const downloadFile = (file: FileItem) => {
    try {
      const url = getFileUrl(file.url || '', file.name);
      
      // Créer un élément <a> temporaire pour déclencher le téléchargement
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name; // Nom du fichier à télécharger
      link.target = '_blank';
      
      // Ajouter temporairement l'élément au DOM
      document.body.appendChild(link);
      
      // Déclencher le clic pour démarrer le téléchargement
      link.click();
      
      // Nettoyer en supprimant l'élément
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      alert('Impossible de télécharger le fichier');
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !selectedFolder) {
      alert('Veuillez saisir un nom de dossier valide');
      return;
    }

    setCreatingFolder(true);
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: selectedFolder,
          userId: TEST_USER_ID,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      console.log('Dossier créé:', result);
      
      // Recharger les dossiers
      await loadFolders();
      
      // Fermer le dialog et réinitialiser
      setShowNewFolderDialog(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
      alert('Erreur lors de la création du dossier: ' + (error as Error).message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;

    try {
      const response = await fetch(`/api/files/${fileToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Retirer le fichier de la liste
        setFiles(files.filter(f => f.id !== fileToDelete.id));
        // Fermer le panneau de détails si c'est le fichier sélectionné
        if (selectedFile?.id === fileToDelete.id) {
          setSelectedFile(null);
        }
      } else {
        alert('Erreur lors de la suppression: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression du fichier');
    } finally {
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };

  const cancelDeleteFile = () => {
    setShowDeleteConfirm(false);
    setFileToDelete(null);
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder && selectedFolder !== "" && selectedFolder !== "root") {
      loadFolderContents(selectedFolder);
    } else {
      setFiles([]);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      console.log('Chargement des dossiers pour userId:', TEST_USER_ID);
      
      const response = await fetch(`/api/folders?userId=${TEST_USER_ID}`);
      console.log('Status de la réponse:', response.status);
      
      const data = await response.json();
      console.log('Données reçues:', data);
      
      if (data.success && data.data.folders) {
        setFolders(data.data.folders);
        console.log('Dossiers chargés:', data.data.folders.length);
        
        // Sélectionner le dossier racine par défaut
        const rootFolder = data.data.folders.find((f: FolderItem) => f.isRoot);
        if (rootFolder) {
          setSelectedFolder(rootFolder.id);
        }
      } else {
        console.error('Erreur lors du chargement des dossiers:', data.error);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderContents = async (folderId: string) => {
    try {
      const response = await fetch(`/api/files?folderId=${folderId}&userId=${TEST_USER_ID}`);
      const data = await response.json();
      
      if (data.success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFiles(data.data.files.map((file: any) => ({
          id: file.id,
          name: file.originalName,
          type: 'file' as const,
          size: file.size,
          lastModified: new Date(file.createdAt),
          mimeType: file.mimeType,
          url: file.url
        })));
      } else {
        console.error('Erreur lors du chargement des fichiers:', data.error);
      }
    } catch (error) {
      console.error('Erreur réseau lors du chargement des fichiers:', error);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', selectedFolder);
      formData.append('userId', TEST_USER_ID);
      formData.append('isPublic', 'false');

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Fichier uploadé avec succès:', data.data);
        // Recharger les fichiers du dossier
        await loadFolderContents(selectedFolder);
      } else {
        console.error('Erreur lors de l\'upload:', data.error);
        alert('Erreur lors de l\'upload: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur réseau lors de l\'upload:', error);
      alert('Erreur réseau lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

      const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadFiles = event.target.files;
    if (uploadFiles && uploadFiles.length > 0) {
      Array.from(uploadFiles).forEach(file => {
        uploadFile(file);
      });
    }
    // Reset l'input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const uploadFiles = event.dataTransfer.files;
    if (uploadFiles && uploadFiles.length > 0) {
      Array.from(uploadFiles).forEach(file => {
        uploadFile(file);
      });
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const formatFileSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return "📄";
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📋";
    return "📄";
  };

  const isImageFile = (mimeType?: string) => {
    return mimeType?.startsWith('image/') || false;
  };

  const getCurrentFolderName = () => {
    const currentFolder = folders.find(f => f.id === selectedFolder);
    return currentFolder?.name || 'Dossier';
  };

  const renderFolderTree = (folderId: string, level: number = 0) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return null;

    const children = folders.filter(f => f.parentId === folder.id);

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg ${
            selectedFolder === folder.id ? "bg-blue-100 dark:bg-blue-900" : ""
          }`}
          style={{ paddingLeft: `${12 + level * 20}px` }}
          onClick={() => setSelectedFolder(folder.id)}
        >
          <span className="text-yellow-600">📁</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {folder.isRoot ? 'Disque' : folder.name}
          </span>
        </div>
        {children.map(child => renderFolderTree(child.id, level + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des dossiers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Gestionnaire de Médias
            </h1>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>📁</span>
              <span>/</span>
              <span>{getCurrentFolderName()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || selectedFolder === 'root' || selectedFolder === ''}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Upload...
                </>
              ) : (
                <>
                  <span>⬆️</span>
                  Uploader
                </>
              )}
            </button>
            <button 
              onClick={() => setShowNewFolderDialog(true)}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <span>📁</span>
              Nouveau dossier
            </button>
            <button className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors duration-200">
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar - Arborescence des dossiers */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Dossiers
            </h2>
            {folders.filter(f => f.isRoot).map(rootFolder => renderFolderTree(rootFolder.id))}
          </div>
        </div>

        {/* Main Content - Liste des fichiers */}
        <div 
          className={`flex-1 p-6 overflow-y-auto ${isDragOver ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isDragOver && (
            <div className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center text-blue-600 dark:text-blue-400 mb-6">
              <div className="text-4xl mb-2">📤</div>
              <p className="text-lg font-medium">Déposez vos fichiers ici</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className={`bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all duration-200 ${
                  selectedFile?.id === file.id ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="text-center">
                  {isImageFile(file.mimeType) ? (
                    <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={getThumbnailUrl(file.url, file.name || '', 'small')}
                        alt={file.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback vers l'image originale si la miniature n'existe pas
                          const target = e.currentTarget;
                          target.src = getFileUrl(file.url, file.name);
                          target.onerror = () => {
                            const container = target.parentElement!;
                            container.innerHTML = `<span class="text-3xl">${getFileIcon(file.mimeType)}</span>`;
                          };
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-3xl mb-2">{getFileIcon(file.mimeType)}</div>
                  )}
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {file.size ? formatFileSize(file.size) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {files.length === 0 && selectedFolder !== 'root' && selectedFolder !== '' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucun fichier dans ce dossier
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Glissez-déposez des fichiers ici ou utilisez le bouton &ldquo;Uploader&rdquo;
              </p>
            </div>
          )}

          {(selectedFolder === '' || selectedFolder === 'root') && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🗂️</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Sélectionnez un dossier
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choisissez un dossier dans l&apos;arborescence pour voir et uploader des fichiers
              </p>
            </div>
          )}
        </div>

        {/* Right Panel - Détails du fichier */}
        {selectedFile && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Détails du fichier
                </h2>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Aperçu */}
                <div className="text-center">
                  {isImageFile(selectedFile.mimeType) ? (
                    <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={getThumbnailUrl(selectedFile.url, selectedFile.name || '', 'medium')}
                        alt={selectedFile.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback vers l'image originale si la miniature n'existe pas
                          const target = e.currentTarget;
                          target.src = getFileUrl(selectedFile.url, selectedFile.name);
                          target.onerror = () => {
                            const container = target.parentElement!;
                            container.innerHTML = `<span class="text-6xl">${getFileIcon(selectedFile.mimeType)}</span>`;
                          };
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-6xl mb-3">{getFileIcon(selectedFile.mimeType)}</div>
                  )}
                  <h3 className="font-medium text-gray-900 dark:text-white break-words">
                    {selectedFile.name}
                  </h3>
                </div>

                {/* Informations */}
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Type
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedFile.mimeType || "Inconnu"}
                    </p>
                  </div>
                  
                  {selectedFile.size && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Taille
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  )}
                  
                  {selectedFile.lastModified && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Dernière modification
                      </label>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {selectedFile.lastModified.toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      URL
                    </label>
                    <div className="text-sm text-gray-900 dark:text-white break-all">
                      <a 
                        href={getFileUrl(selectedFile.url || '', selectedFile.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200"
                        title="Cliquez pour ouvrir le fichier dans un nouvel onglet"
                      >
                        {getFileUrl(selectedFile.url || '', selectedFile.name)}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button 
                    onClick={() => downloadFile(selectedFile)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Télécharger
                  </button>
                  <button 
                    onClick={() => copyToClipboard(selectedFile)}
                    className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Copier le lien
                  </button>
                  <button 
                    onClick={() => handleDeleteFile(selectedFile)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input caché pour l'upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer le fichier <strong>{fileToDelete.name}</strong> ?
              Cette action est irréversible.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={cancelDeleteFile}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteFile}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création de dossier */}
      {showNewFolderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Créer un nouveau dossier
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Le dossier sera créé dans : <span className="font-medium">{folders.find(f => f.id === selectedFolder)?.name || 'Disque'}</span>
            </p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creatingFolder) {
                  createFolder();
                }
                if (e.key === 'Escape') {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewFolderDialog(false);
                  setNewFolderName('');
                }}
                disabled={creatingFolder}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={createFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creatingFolder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Création...
                  </>
                ) : (
                  'Créer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}