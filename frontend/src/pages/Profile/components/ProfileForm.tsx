import { useState, useRef } from 'react';
import { toast } from 'sonner';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { useUpdateProfile } from '../../../hooks/useProfile';
import { useProfilePhoto } from '../../../hooks/useProfilePhoto';
import type { User } from '../../../types/user';

interface ProfileFormProps {
  profile?: User | null;
}

const ProfileForm = ({ profile }: ProfileFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateProfileMutation = useUpdateProfile();
  const photoMutation = useProfilePhoto();

  const [formData, setFormData] = useState({
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    email: profile?.email ?? '',
    phone: profile?.phone ?? '',
  });

  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccessMessage('');
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await photoMutation.mutateAsync(file);
      setSuccessMessage('Profile photo updated!');
    } catch (err) {
      console.error('[ProfilePhoto] Upload failed:', err);
      toast.error('Failed to upload profile photo. Please try again.');
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
      setSuccessMessage('Profile updated successfully!');
    } catch {
      toast.error('Failed to update profile. Please try again.');
    }
  };

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Edit Profile</h3>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">
          {successMessage}
        </div>
      )}

      {/* Profile Photo Section */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-3">Profile Photo</p>
        <div className="flex items-center gap-4">
          {profile?.profilePhoto ? (
            <div className="w-16 h-16 rounded-full overflow-hidden">
              <img
                src={profile.profilePhoto}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-primary-600">
                {formData.firstName?.[0] ?? 'U'}
              </span>
            </div>
          )}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              aria-label="Upload profile photo"
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              isLoading={photoMutation.isPending}
            >
              Upload Photo
            </Button>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG or WEBP. Max 2MB.</p>
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
