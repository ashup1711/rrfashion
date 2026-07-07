import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileForm from './components/ProfileForm';
import AddressList from './components/AddressList';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { useProfile } from '../../hooks/useProfile';
import { useAuthStore } from '../../store/authStore';
import { deleteAccount } from '../../api/profile';

const Profile = () => {
  const storeUser = useAuthStore((state) => state.user);
  const { data: profile, isLoading, error } = useProfile();
  const user = profile || storeUser;
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password to confirm.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      await deleteAccount({
        password: deletePassword,
        reason: deleteReason || undefined,
      });
      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete account. Please contact support.',
      );
    } finally {
      setIsDeleting(false);
    }
  }, [deletePassword, deleteReason, logout, navigate]);

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
        <LoadingSpinner label="Loading profile..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
        <EmptyState
          title="Could not load profile"
          description="Something went wrong. Please try again."
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        {/* Sidebar Info */}
        <div>
          <Card>
            <div className="text-center">
              {user?.profilePhoto ? (
                <div className="w-20 h-20 rounded-full overflow-hidden mx-auto">
                  <img
                    src={user.profilePhoto}
                    alt={user.firstName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-2xl font-bold text-primary-600">
                    {user?.firstName?.[0] ?? 'U'}
                  </span>
                </div>
              )}
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {user?.firstName ? `${user.firstName} ${user.lastName}` : 'User Name'}
              </h2>
              <p className="text-sm text-gray-500">{user?.email ?? 'user@example.com'}</p>
              <p className="mt-1 text-xs text-gray-400 capitalize">
                Role: {user?.role?.toLowerCase() ?? 'customer'}
              </p>
            </div>
          </Card>
        </div>

        {/* Profile & Addresses */}
        <div className="mt-8 lg:mt-0 lg:col-span-2 space-y-8">
          <ProfileForm profile={user} />
          <AddressList />
        </div>
      </div>

      {/* Danger Zone — Delete Account */}
      <div className="mt-8 border-t border-red-200 pt-6">
        <h3 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button
          variant="danger"
          onClick={() => setShowDeleteModal(true)}
        >
          Delete My Account
        </Button>
      </div>

      {/* Delete Account Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
          setDeleteReason('');
          setDeleteError('');
        }}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">
              <strong>Warning:</strong> This action is permanent and cannot be undone.
              All your data, including orders, addresses, and personal information,
              will be permanently deleted.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{deleteError}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="delete-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Enter your password to confirm
            </label>
            <input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => {
                setDeletePassword(e.target.value);
                setDeleteError('');
              }}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Your password"
              aria-invalid={!!deleteError}
              aria-describedby={deleteError ? 'delete-error' : undefined}
            />
          </div>

          <div>
            <label
              htmlFor="delete-reason"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reason for leaving (optional)
            </label>
            <textarea
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
              placeholder="Tell us why you're leaving..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletePassword('');
                setDeleteReason('');
                setDeleteError('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              isLoading={isDeleting}
              disabled={!deletePassword}
            >
              I understand, delete my account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
