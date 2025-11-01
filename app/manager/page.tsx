"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthHeader from "@/src/components/AuthHeader";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  lastModified?: Date;
  mimeType?: string;
  url?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    format?: string;
  } | null;
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
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
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [deleteFolderError, setDeleteFolderError] = useState<string | null>(null);
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false);
  const [folderToRename, setFolderToRename] = useState<FolderItem | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rediriger si pas connecté
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // ID utilisateur authentifié
  const userId = session?.user?.id;

  // Fonction utilitaire pour obtenir l'URL de base
  // const getBaseUrl = () => {
  //   if (typeof window !== 'undefined') {
  //     return window.location.origin;
  //   }
  //   return 'http://localhost:3000';
  // };

  // Fonctions utilitaires pour construire les URLs complètes
  const getThumbnailUrl = (url: string | undefined, fileName: string, size: string) => {
    if (!url || !userId) return '/placeholder.jpg';
    const fileId = url.split('/').pop()?.split('.')[0];
    return `${window.location.origin}/api/uploads/users/${userId}/thumbs/${fileId}-${size}.jpg`;
  };

  const getFileUrl = (url: string | undefined, fileName: string) => {
    if (!url) return '';
    console.log({ fileName });
    return `${window.location.origin}${url}`;
  };

  const copyToClipboard = async (files: FileItem[]) => {
    try {
      const urls = files.map(file => getFileUrl(file.url || '', file.name)).join('\n');
      await navigator.clipboard.writeText(urls);
      // Optionnel: afficher une notification de succès
      alert(`${files.length} URL${files.length > 1 ? 's' : ''} copiée${files.length > 1 ? 's' : ''} dans le presse-papier !`);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      // Fallback pour les navigateurs qui ne supportent pas l'API clipboard
      const urls = files.map(file => getFileUrl(file.url || '', file.name)).join('\n');
      const textArea = document.createElement('textarea');
      textArea.value = urls;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        alert(`${files.length} URL${files.length > 1 ? 's' : ''} copiée${files.length > 1 ? 's' : ''} dans le presse-papier !`);
      } catch (fallbackErr) {
        console.error('Erreur lors de la copie fallback:', fallbackErr);
        alert('Impossible de copier les URLs');
      }
      document.body.removeChild(textArea);
    }
  };

  const downloadFiles = (files: FileItem[]) => {
    try {
      files.forEach(file => {
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
      });
    } catch (err) {
      console.error('Erreur lors du téléchargement:', err);
      alert('Impossible de télécharger les fichiers');
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
          userId: userId,
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

  const handleDeleteFolder = async () => {
    const currentFolder = folders.find(f => f.id === selectedFolder);
    if (!currentFolder || currentFolder.isRoot) {
      return;
    }
    
    setFolderToDelete(currentFolder);
    setDeleteFolderError(null);
    setShowDeleteFolderConfirm(true);
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;

    setDeletingFolder(true);
    setDeleteFolderError(null);
    
    try {
      const response = await fetch(`/api/folders/${folderToDelete.id}?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Sélectionner le dossier parent ou racine
        const parentFolder = folderToDelete.parentId 
          ? folders.find(f => f.id === folderToDelete.parentId)
          : folders.find(f => f.isRoot);
        
        if (parentFolder) {
          setSelectedFolder(parentFolder.id);
        }
        
        // Recharger les dossiers
        await loadFolders();
        
        // Fermer la modal
        setShowDeleteFolderConfirm(false);
        setFolderToDelete(null);
      } else {
        // Afficher l'erreur dans la modal
        setDeleteFolderError(data.error);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du dossier:', error);
      setDeleteFolderError('Erreur lors de la suppression du dossier');
    } finally {
      setDeletingFolder(false);
    }
  };

  const cancelDeleteFolder = () => {
    setShowDeleteFolderConfirm(false);
    setFolderToDelete(null);
    setDeleteFolderError(null);
  };

  const handleRenameFolder = async () => {
    const currentFolder = folders.find(f => f.id === selectedFolder);
    if (!currentFolder || currentFolder.isRoot) {
      return;
    }
    
    setFolderToRename(currentFolder);
    setRenameFolderName(currentFolder.name);
    setShowRenameFolderDialog(true);
  };

  const confirmRenameFolder = async () => {
    if (!folderToRename || !renameFolderName.trim()) return;

    setRenamingFolder(true);
    
    try {
      const response = await fetch(`/api/folders/${folderToRename.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: renameFolderName.trim(),
          userId: userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Recharger les dossiers
        await loadFolders();
        
        // Fermer la modal
        setShowRenameFolderDialog(false);
        setFolderToRename(null);
        setRenameFolderName('');
      } else {
        alert('Erreur lors du renommage: ' + data.error);
      }
    } catch (error) {
      console.error('Erreur lors du renommage du dossier:', error);
      alert('Erreur lors du renommage du dossier');
    } finally {
      setRenamingFolder(false);
    }
  };

  const cancelRenameFolder = () => {
    setShowRenameFolderDialog(false);
    setFolderToRename(null);
    setRenameFolderName('');
  };

  const handleDeleteFile = async (file: FileItem) => {
    setFileToDelete(file);
    setShowDeleteConfirm(true);
  };

  const handleDeleteSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;
    // Pour la suppression multiple, on prend le premier fichier pour l'instant
    // On pourrait améliorer avec une modal spéciale pour la suppression multiple
    setFileToDelete(selectedFiles[0]);
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
        // Retirer le fichier des fichiers sélectionnés
        setSelectedFiles(selectedFiles.filter(f => f.id !== fileToDelete.id));
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
    if (session?.user?.id) {
      loadFolders();
      // Restaurer la sélection de dossier depuis localStorage
      const savedFolderId = localStorage.getItem(`selectedFolder_${session.user.id}`);
      if (savedFolderId) {
        setSelectedFolder(savedFolderId);
      }
    }
  }, [session]);

  useEffect(() => {
    if (selectedFolder && selectedFolder !== "" && selectedFolder !== "root") {
      loadFolderContents(selectedFolder);
      // Sauvegarder la sélection dans localStorage
      if (userId) {
        localStorage.setItem(`selectedFolder_${userId}`, selectedFolder);
      }
    } else {
      setFiles([]);
    }
    // Réinitialiser la sélection de fichiers lors du changement de dossier
    setSelectedFiles([]);
  }, [selectedFolder, userId]);

  const loadFolders = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      console.log('Chargement des dossiers pour userId:', userId);
      
      const response = await fetch(`/api/folders?userId=${userId}`);
      console.log('Status de la réponse:', response.status);
      
      const data = await response.json();
      console.log('Données reçues:', data);
      
      if (data.success && data.data.folders) {
        setFolders(data.data.folders);
        console.log('Dossiers chargés:', data.data.folders.length);
        
        // Sélectionner le dossier racine par défaut seulement si aucun dossier n'est restauré
        const savedFolderId = localStorage.getItem(`selectedFolder_${userId}`);
        if (!savedFolderId) {
          const rootFolder = data.data.folders.find((f: FolderItem) => f.isRoot);
          if (rootFolder) {
            setSelectedFolder(rootFolder.id);
          }
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
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/files?folderId=${folderId}&userId=${userId}`);
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
          url: file.url,
          metadata: file.metadata || null,
        })));
      } else {
        console.error('Erreur lors du chargement des fichiers:', data.error);
      }
    } catch (error) {
      console.error('Erreur réseau lors du chargement des fichiers:', error);
    }
  };

  const uploadFile = async (file: File) => {
    if (!userId) {
      alert('Vous devez être connecté pour uploader des fichiers');
      return;
    }

    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderId', selectedFolder);
      formData.append('userId', userId);
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
    event.stopPropagation();
    setIsDragOver(false);
    
    const uploadFiles = event.dataTransfer.files;
    if (uploadFiles && uploadFiles.length > 0) {
      // Traiter tous les fichiers en parallèle pour éviter les problèmes de navigation
      const fileArray = Array.from(uploadFiles);
      fileArray.forEach(file => {
        uploadFile(file);
      });
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Éviter de redéclencher si déjà en cours
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    // Vérifier que nous quittons vraiment la zone de drop
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
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
    if (mimeType.startsWith("image/") || mimeType === "image/x-icon" || mimeType === "image/vnd.microsoft.icon") return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📋";
    return "📄";
  };

  const isImageFile = (mimeType?: string) => {
    return mimeType?.startsWith('image/') || 
           mimeType === 'image/x-icon' || 
           mimeType === 'image/vnd.microsoft.icon' || false;
  };

  const isIconFile = (mimeType?: string) => {
    return mimeType === 'image/x-icon' || 
           mimeType === 'image/vnd.microsoft.icon' || 
           (mimeType && mimeType.includes('icon'));
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

  if (status === "loading" || loading) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {status === "loading" ? "Vérification de l'authentification..." : "Chargement des dossiers..."}
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Le middleware redirigera automatiquement
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <AuthHeader showManagerLink={false} />
      
      {/* Manager Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
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
              disabled={uploading || selectedFolder === 'root' || selectedFolder === '' || !userId}
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
              onClick={() => router.push('/profile')}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors duration-200"
              title="Mon profil"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar - Arborescence des dossiers */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header du panneau dossiers */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Dossiers
              </h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowNewFolderDialog(true)}
                  title="Nouveau dossier"
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  onClick={handleRenameFolder}
                  title="Renommer le dossier"
                  disabled={!selectedFolder || folders.find(f => f.id === selectedFolder)?.isRoot}
                  className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDeleteFolder}
                  title="Supprimer le dossier"
                  disabled={!selectedFolder || folders.find(f => f.id === selectedFolder)?.isRoot}
                  className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Contenu scrollable des dossiers */}
          <div className="flex-1 overflow-y-auto p-4">
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
                  selectedFiles.some(f => f.id === file.id) ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    // Multi-sélection avec Ctrl/Cmd
                    if (selectedFiles.some(f => f.id === file.id)) {
                      setSelectedFiles(selectedFiles.filter(f => f.id !== file.id));
                    } else {
                      setSelectedFiles([...selectedFiles, file]);
                    }
                  } else if (e.shiftKey && selectedFiles.length > 0) {
                    // Sélection par plage avec Shift
                    const lastSelectedIndex = files.findIndex(f => f.id === selectedFiles[selectedFiles.length - 1].id);
                    const currentIndex = files.findIndex(f => f.id === file.id);
                    const start = Math.min(lastSelectedIndex, currentIndex);
                    const end = Math.max(lastSelectedIndex, currentIndex);
                    const rangeFiles = files.slice(start, end + 1);
                    setSelectedFiles(rangeFiles);
                  } else {
                    // Sélection simple
                    setSelectedFiles([file]);
                  }
                }}
              >
                <div className="text-center">
                  {isIconFile(file.mimeType) ? (
                    <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                      <div className="text-4xl flex items-center justify-center">
                        🎯
                      </div>
                    </div>
                  ) : isImageFile(file.mimeType) ? (
                    <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                      <Image 
                        src={getThumbnailUrl(file.url, file.name || '', 'small')}
                        alt={file.name || 'File thumbnail'}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback vers l'image originale si la miniature n'existe pas
                          const target = e.currentTarget;
                          target.src = getFileUrl(file.url, file.name);
                          target.onerror = () => {
                            const container = target.parentElement;
                            if (container) {
                              container.innerHTML = `<span class="text-3xl">${getFileIcon(file.mimeType)}</span>`;
                            }
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
        {selectedFiles.length > 0 && (
          <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedFiles.length === 1 ? 'Détails du fichier' : `${selectedFiles.length} fichiers sélectionnés`}
                </h2>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {selectedFiles.length === 1 ? (
                  // Affichage pour un seul fichier
                  <>
                    {/* Aperçu */}
                    <div className="text-center">
                      {isIconFile(selectedFiles[0].mimeType) ? (
                        <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                          <div className="text-8xl flex items-center justify-center">
                            🎯
                          </div>
                        </div>
                      ) : isImageFile(selectedFiles[0].mimeType) ? (
                        <div className="w-32 h-32 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                          <Image 
                            src={getThumbnailUrl(selectedFiles[0].url, selectedFiles[0].name || '', 'medium')}
                            alt={selectedFiles[0].name || 'File preview'}
                            width={128}
                            height={128}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback vers l'image originale si la miniature n'existe pas
                              const target = e.currentTarget;
                              target.src = getFileUrl(selectedFiles[0].url, selectedFiles[0].name);
                              target.onerror = () => {
                                const container = target.parentElement;
                                if (container) {
                                  container.innerHTML = `<span class="text-6xl">${getFileIcon(selectedFiles[0].mimeType)}</span>`;
                                }
                              };
                            }}
                          />
                        </div>
                      ) : (
                        <div className="text-6xl mb-3">{getFileIcon(selectedFiles[0].mimeType)}</div>
                      )}
                      <h3 className="font-medium text-gray-900 dark:text-white break-words">
                        {selectedFiles[0].name}
                      </h3>
                    </div>

                    {/* Informations */}
                    <div className="space-y-3">
                      {/* Dimensions pour images */}
                      {isImageFile(selectedFiles[0].mimeType) && selectedFiles[0].metadata?.width && selectedFiles[0].metadata?.height && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Dimensions
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedFiles[0].metadata.width} × {selectedFiles[0].metadata.height} px
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Type
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {selectedFiles[0].mimeType || "Inconnu"}
                        </p>
                      </div>
                      
                      {selectedFiles[0].size && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Taille
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatFileSize(selectedFiles[0].size)}
                          </p>
                        </div>
                      )}
                      
                      {selectedFiles[0].lastModified && (
                        <div>
                          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Dernière modification
                          </label>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {selectedFiles[0].lastModified.toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          URL
                        </label>
                        <div className="text-sm text-gray-900 dark:text-white break-all">
                          <a 
                            href={getFileUrl(selectedFiles[0].url || '', selectedFiles[0].name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline cursor-pointer transition-colors duration-200"
                            title="Cliquez pour ouvrir le fichier dans un nouvel onglet"
                          >
                            {getFileUrl(selectedFiles[0].url || '', selectedFiles[0].name)}
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Affichage pour plusieurs fichiers
                  <>
                    <div className="text-center">
                      <div className="text-6xl mb-3">📑</div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {selectedFiles.length} fichiers sélectionnés
                      </h3>
                    </div>

                    {/* Informations groupées */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Taille totale
                        </label>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {formatFileSize(selectedFiles.reduce((acc, file) => acc + (file.size || 0), 0))}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Fichiers
                        </label>
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                          {selectedFiles.map((file) => (
                            <div key={file.id} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                              <span>{getFileIcon(file.mimeType)}</span>
                              <span className="flex-1 truncate" title={file.name}>{file.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <button 
                    onClick={() => downloadFiles(selectedFiles)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    {selectedFiles.length === 1 ? 'Télécharger' : `Télécharger (${selectedFiles.length})`}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(selectedFiles)}
                    className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    {selectedFiles.length === 1 ? 'Copier le lien' : `Copier les liens (${selectedFiles.length})`}
                  </button>
                  {selectedFiles.length === 1 ? (
                    <button 
                      onClick={() => handleDeleteFile(selectedFiles[0])}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Supprimer
                    </button>
                  ) : (
                    <button 
                      onClick={handleDeleteSelectedFiles}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-200"
                      disabled
                      title="Suppression multiple en cours de développement"
                    >
                      Supprimer ({selectedFiles.length})
                    </button>
                  )}
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

      {/* Modal de confirmation de suppression de dossier */}
      {showDeleteFolderConfirm && folderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmer la suppression du dossier
            </h3>
            
            {deleteFolderError ? (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 dark:text-red-400">⚠️</span>
                  <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                    {deleteFolderError}
                  </p>
                </div>
                {deleteFolderError.includes('n\'est pas vide') && (
                  <p className="text-red-700 dark:text-red-300 text-xs mt-2">
                    {`Veuillez d'abord supprimer tous les fichiers et sous-dossiers contenus dans ce dossier.`}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Êtes-vous sûr de vouloir supprimer le dossier <strong>{folderToDelete.name}</strong> ?
                <br />
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                  {`Cette action est irréversible. Le dossier ne peut être supprimé que s'il est vide.`}
                </span>
              </p>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={cancelDeleteFolder}
                disabled={deletingFolder}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {deleteFolderError ? 'Fermer' : 'Annuler'}
              </button>
              {!deleteFolderError && (
                <button
                  onClick={confirmDeleteFolder}
                  disabled={deletingFolder}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingFolder ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de renommage de dossier */}
      {showRenameFolderDialog && folderToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Renommer le dossier
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Renommer le dossier : <span className="font-medium">{folderToRename.name}</span>
            </p>
            <input
              type="text"
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              placeholder="Nouveau nom du dossier"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !renamingFolder && renameFolderName.trim()) {
                  confirmRenameFolder();
                }
                if (e.key === 'Escape') {
                  cancelRenameFolder();
                }
              }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={cancelRenameFolder}
                disabled={renamingFolder}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmRenameFolder}
                disabled={renamingFolder || !renameFolderName.trim()}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {renamingFolder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Renommage...
                  </>
                ) : (
                  'Renommer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}