'use client';

import { useState } from 'react';
import {
  Camera,
  Upload,
  X,
  Eye,
  Download,
  Calendar,
  Tag,
  Image,
  FileImage,
  Receipt,
  Hammer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Filter
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { ProjectPhoto, PhotoType } from '@/lib/services/project-tracking-service';

interface ProjectPhotoGalleryProps {
  projectId: string;
  photos: ProjectPhoto[];
  onRefresh: () => void;
}

export function ProjectPhotoGallery({
  projectId,
  photos,
  onRefresh,
}: ProjectPhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<ProjectPhoto | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<PhotoType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'order'>('date');

  // Filter and sort photos
  const filteredPhotos = photos.filter(photo =>
    filterType === 'all' || photo.photo_type === filterType
  );

  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.taken_date).getTime() - new Date(a.taken_date).getTime();
      case 'type':
        return a.photo_type.localeCompare(b.photo_type);
      case 'order':
        return a.display_order - b.display_order;
      default:
        return 0;
    }
  });

  // Group photos by type for statistics
  const photosByType = photos.reduce((acc, photo) => {
    acc[photo.photo_type] = (acc[photo.photo_type] || 0) + 1;
    return acc;
  }, {} as Record<PhotoType, number>);

  const getPhotoTypeIcon = (type: PhotoType) => {
    switch (type) {
      case 'before': return <Camera className="w-4 h-4" />;
      case 'during': return <Hammer className="w-4 h-4" />;
      case 'after': return <Image className="w-4 h-4" />;
      case 'progress': return <FileImage className="w-4 h-4" />;
      case 'receipt': return <Receipt className="w-4 h-4" />;
      case 'damage': return <AlertTriangle className="w-4 h-4" />;
      default: return <Camera className="w-4 h-4" />;
    }
  };

  const getPhotoTypeColor = (type: PhotoType) => {
    switch (type) {
      case 'before': return 'bg-blue-900/30 text-blue-300';
      case 'during': return 'bg-orange-900/30 text-orange-300';
      case 'after': return 'bg-green-900/30 text-green-300';
      case 'progress': return 'bg-purple-900/30 text-purple-300';
      case 'receipt': return 'bg-yellow-900/30 text-yellow-300';
      case 'damage': return 'bg-red-900/30 text-red-300';
      default: return 'bg-gray-900/30 text-gray-300';
    }
  };

  const handlePhotoClick = (photo: ProjectPhoto) => {
    setSelectedPhoto(photo);
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = sortedPhotos.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedPhotos.length - 1;
    setSelectedPhoto(sortedPhotos[prevIndex]);
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = sortedPhotos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = currentIndex < sortedPhotos.length - 1 ? currentIndex + 1 : 0;
    setSelectedPhoto(sortedPhotos[nextIndex]);
  };

  return (
    <div className="space-y-6">
      {/* Photo Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(photosByType).map(([type, count]) => (
          <div
            key={type}
            className={`p-3 rounded-lg border ${getPhotoTypeColor(type as PhotoType)} cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => setFilterType(type as PhotoType)}
          >
            <div className="flex items-center gap-2 mb-1">
              {getPhotoTypeIcon(type as PhotoType)}
              <span className="text-sm font-medium capitalize">
                {type.replace('-', ' ')}
              </span>
            </div>
            <p className="text-lg font-bold">{count}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as PhotoType | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm"
          >
            <option value="all">All Photos</option>
            <option value="before">Before</option>
            <option value="during">During</option>
            <option value="after">After</option>
            <option value="progress">Progress</option>
            <option value="receipt">Receipts</option>
            <option value="damage">Damage</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="type">Sort by Type</option>
            <option value="order">Sort by Order</option>
          </select>

          <div className="flex items-center bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-gray-600 shadow-sm'
                  : 'hover:bg-gray-600'
              } transition-colors`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-gray-600 shadow-sm'
                  : 'hover:bg-gray-600'
              } transition-colors`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors font-medium"
        >
          <Upload className="w-4 h-4" />
          Upload Photos
        </button>
      </div>

      {/* Photo Gallery */}
      {sortedPhotos.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 border border-gray-700 rounded-xl">
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">
            {filterType === 'all' ? 'No photos uploaded yet' : `No ${filterType} photos`}
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors"
          >
            Upload First Photo
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-gray-800 border border-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-all"
              onClick={() => handlePhotoClick(photo)}
            >
              <div className="aspect-square bg-gray-700 flex items-center justify-center">
                {/* Placeholder for actual image */}
                <div className="w-full h-full bg-gradient-to-br from-gray-200 from-gray-600 to-gray-700 flex items-center justify-center">
                  <Image className="w-8 h-8 text-gray-400" />
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPhotoTypeColor(photo.photo_type)}`}>
                    {getPhotoTypeIcon(photo.photo_type)}
                    {photo.photo_type}
                  </span>
                </div>

                {photo.title && (
                  <h4 className="font-medium text-white text-sm mb-1 truncate">
                    {photo.title}
                  </h4>
                )}

                <p className="text-xs text-gray-400">
                  {format(parseISO(photo.taken_date), 'MMM d, yyyy')}
                </p>
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl divide-y divide-gray-700">
          {sortedPhotos.map((photo) => (
            <div
              key={photo.id}
              className="p-4 hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => handlePhotoClick(photo)}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Image className="w-6 h-6 text-gray-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPhotoTypeColor(photo.photo_type)}`}>
                      {getPhotoTypeIcon(photo.photo_type)}
                      {photo.photo_type}
                    </span>
                    <span className="text-sm text-gray-400">
                      {format(parseISO(photo.taken_date), 'MMM d, yyyy')}
                    </span>
                  </div>

                  {photo.title && (
                    <h4 className="font-medium text-white mb-1">
                      {photo.title}
                    </h4>
                  )}

                  {photo.description && (
                    <p className="text-sm text-gray-400 truncate">
                      {photo.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Implement download
                    }}
                    className="p-2 text-gray-400 hover:bg-gray-600 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePhotoClick(photo);
                    }}
                    className="p-2 text-amber-400 hover:bg-amber-900/30 rounded-lg transition-colors"
                    title="View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <>
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={() => setSelectedPhoto(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPhotoTypeColor(selectedPhoto.photo_type)}`}>
                    {getPhotoTypeIcon(selectedPhoto.photo_type)}
                    {selectedPhoto.photo_type}
                  </span>
                  <span className="text-sm text-gray-400">
                    {format(parseISO(selectedPhoto.taken_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image */}
              <div className="relative bg-gray-700 aspect-video flex items-center justify-center">
                {/* Placeholder for actual image */}
                <div className="w-full h-full bg-gradient-to-br from-gray-200 from-gray-600 to-gray-700 flex items-center justify-center">
                  <Image className="w-16 h-16 text-gray-400" />
                </div>

                {/* Navigation */}
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Details */}
              <div className="p-4">
                {selectedPhoto.title && (
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {selectedPhoto.title}
                  </h3>
                )}
                {selectedPhoto.description && (
                  <p className="text-gray-400 mb-4">
                    {selectedPhoto.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>
                    Photo {sortedPhotos.findIndex(p => p.id === selectedPhoto.id) + 1} of {sortedPhotos.length}
                  </span>
                  <button
                    onClick={() => {
                      // TODO: Implement download
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload Modal Placeholder */}
      {showUpload && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setShowUpload(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Upload Photos
                </h3>
              </div>
              <div className="p-4">
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">
                    Drop photos here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports JPG, PNG, WebP up to 10MB
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors">
                  Upload
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}