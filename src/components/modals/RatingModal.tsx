import React, { useState } from 'react';
import { StarIcon, XIcon, ThumbsUpIcon, SmileIcon, PackageIcon } from 'lucide-react';
interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (rating: any) => void;
  shipperName: string;
  shipperAvatar: string;
  readOnly?: boolean;
  rating?: number;
  comment?: string;
  tags?: string[];
  images?: string[];
}
const RatingModal = ({
  isOpen,
  onClose,
  onSubmit,
  shipperName,
  shipperAvatar,
  readOnly = false,
  rating,
  comment,
  tags,
  images
}: RatingModalProps) => {
  const [ratings, setRatings] = useState({
    overall: 0,
    attitude: 0,
    speed: 0,
    care: 0
  });
  const [tempRating, setTempRating] = useState<string | null>(null);
  const [commentState, setComment] = useState('');
  const [tagsState, setTags] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const availableTags = ['Thái độ tận thiện', 'Giao hàng đúng giờ', 'Cẩn thận với hàng hóa', 'Tận tình hướng dẫn', 'Chuyên nghiệp'];
  if (!isOpen) return null;
  const handleRatingChange = (category: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
  };
  const handleTagToggle = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setSelectedFiles(files);
    setPreviewUrls(files.map(file => URL.createObjectURL(file)));
    console.log('Files selected:', files); // DEBUG
  };
  // Upload lên Cloudinary demo (bạn cần thay YOUR_UPLOAD_PRESET và YOUR_CLOUD_NAME)
  async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'unsigned_preset');
    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/devd5nupq/image/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      console.log('Cloudinary upload result:', data); // DEBUG
      return data.secure_url;
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      return '';
    }
  }
  const handleSubmit = async () => {
    if (ratings.overall === 0) return;
    setUploading(true);
    let imageUrls: string[] = [];
    if (selectedFiles.length > 0) {
      imageUrls = await Promise.all(selectedFiles.map(uploadToCloudinary));
    } else {
      alert('Bạn chưa chọn ảnh hoặc file không hợp lệ!');
    }
    setUploading(false);
    console.log('Image URLs gửi lên:', imageUrls); // DEBUG
    if (selectedFiles.length > 0 && imageUrls.filter(Boolean).length === 0) {
      alert('Upload ảnh lên Cloudinary thất bại!');
    }
    onSubmit && onSubmit({
      ratings,
      comment: commentState,
      tags: tagsState,
      images: imageUrls
    });
    onClose();
  };
  const renderStars = (category: string, value: number, disabled = false) => <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" disabled={disabled} onMouseEnter={() => !disabled && setTempRating(`${category}-${star}`)} onMouseLeave={() => !disabled && setTempRating(null)} onClick={() => !disabled && handleRatingChange(category, star)} className="p-1">
          <StarIcon className={`h-6 w-6 ${star <= (tempRating === `${category}-${star}` ? star : value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>)}
    </div>;
  // Nếu chỉ xem đánh giá
  if (readOnly) {
    return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Đánh giá của bạn</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <XIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
          <img src={shipperAvatar} alt={shipperName} className="w-16 h-16 rounded-full" />
          <div>
            <h3 className="font-medium">{shipperName}</h3>
            <p className="text-sm text-gray-600">Tài xế giao hàng</p>
          </div>
        </div>
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="font-medium">Đánh giá chung:</span>
            {rating ? (
              <span className="flex items-center gap-1 text-yellow-500 font-bold">{rating} <StarIcon className="h-5 w-5 fill-yellow-400 text-yellow-400" /></span>
            ) : <span className="text-gray-400">Chưa đánh giá</span>}
          </div>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-sm">{tag}</span>)}
            </div>
          )}
          {comment ? (
            <div className="text-gray-700 mt-2">{comment}</div>
          ) : (
            <div className="text-gray-400 mt-2">Bạn chưa để lại nhận xét chi tiết.</div>
          )}
          {images && images.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {images.map((url, idx) => (
                <img key={idx} src={url} alt="review" className="w-20 h-20 object-cover rounded border" />
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>;
  }
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-6">
          {/* Shipper Info */}
          <h2 className="text-lg font-medium">
            Đánh giá trải nghiệm giao hàng
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <XIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {/* Shipper Info */}
        <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-lg">
          <img src={shipperAvatar} alt={shipperName} className="w-16 h-16 rounded-full" />
          <div>
            <h3 className="font-medium">{shipperName}</h3>
            <p className="text-sm text-gray-600">Tài xế giao hàng</p>
          </div>
        </div>
        {/* Rating Categories */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Đánh giá chung</span>
            {renderStars('overall', ratings.overall)}
          </div>
          <div className="flex justify-between items-center">
            <span>Thái độ phục vụ</span>
            {renderStars('attitude', ratings.attitude)}
          </div>
          <div className="flex justify-between items-center">
            <span>Tốc độ giao hàng</span>
            {renderStars('speed', ratings.speed)}
          </div>
          <div className="flex justify-between items-center">
            <span>Bảo quản hàng hóa</span>
            {renderStars('care', ratings.care)}
          </div>
        </div>
        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Đánh giá chi tiết
          </label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => <button key={tag} onClick={() => handleTagToggle(tag)} className={`px-3 py-1 rounded-full text-sm ${tagsState.includes(tag) ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                {tag}
              </button>)}
          </div>
        </div>
        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nhận xét thêm
          </label>
          <textarea value={commentState} onChange={e => setComment(e.target.value)} rows={3} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Chia sẻ thêm về trải nghiệm của bạn..." />
        </div>
        {/* Upload Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ảnh minh họa (tối đa 5 ảnh)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="mb-2"
            disabled={uploading}
          />
          <div className="flex gap-2 flex-wrap">
            {previewUrls.map((url, idx) => (
              <img key={idx} src={url} alt="preview" className="w-20 h-20 object-cover rounded border" />
            ))}
          </div>
        </div>
        {/* Submit Button */}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Hủy
          </button>
          <button onClick={handleSubmit} disabled={ratings.overall === 0 || uploading} className={`px-4 py-2 rounded-lg text-white ${ratings.overall > 0 && !uploading ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-300 cursor-not-allowed'}`}>
            {uploading ? 'Đang tải ảnh...' : 'Gửi đánh giá'}
          </button>
        </div>
      </div>
    </div>;
};
export default RatingModal;