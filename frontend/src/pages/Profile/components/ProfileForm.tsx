import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { useUpdateProfile } from '../../../hooks/useProfile';
import { uploadProfilePhotoAsync } from '../../../api/profile';
import { useUploadProgress } from '../../../components/common/UploadProgressTracker';
import { QUERY_KEYS } from '../../../utils/constants';
import type { User } from '../../../types/user';

interface ProfileFormProps {
  profile?: User | null;
}

const ProfileForm = ({ profile }: ProfileFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const updateProfileMutation = useUpdateProfile();

  const [formData, setFormData] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadComplete = useCallback(() => {
    setUploading(false);
    setUploadId(null);
    setPreviewUrl(null);
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.profile] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.me] });
    toast.success('Profile photo updated!');
  }, [queryClient]);

  const handleUploadError = useCallback((error: string) => {
    setUploading(false);
    setUploadId(null);
    toast.error(error);
  }, []);

  const { progress } = useUploadProgress(uploadId, handleUploadComplete, handleUploadError);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please use JPEG, PNG, or WebP.');
      return;
    }

    // Show preview before upload
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Start async upload
    setUploading(true);
    try {
      const result = await uploadProfilePhotoAsync(file);
      setUploadId(result.uploadId);
    } catch (err) {
      setUploading(false);
      toast.error('Failed to start upload. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      });
      toast.success('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const displayPhoto = previewUrl || profile?.profilePhoto;

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit Profile</h3>

      {/* Profile Photo Section */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Profile Photo</p>
        <div className="flex items-start gap-4">
          {displayPhoto ? (
            <div className="w-16 h-16 rounded-full overflow-hidden relative shrink-0">
              <img
                src={displayPhoto}
                alt="Profile"
                className="w-full h-full object-cover"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <span className="text-white text-xs font-bold">{progress?.progress ?? 0}%</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary-600">
                {formData.firstName?.[0] ?? 'U'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
              aria-label="Upload profile photo"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Processing...' : 'Upload Photo'}
            </Button>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or WEBP. Max 5MB.</p>

            {uploadId && progress && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">{progress.message || 'Processing...'}</span>
                  <span className="text-xs text-gray-500">{progress.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled
        />
        <Input
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+91 98765 43210"
        />

        <div className="pt-4">
          <Button
            type="submit"
            isLoading={updateProfileMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ProfileForm;
