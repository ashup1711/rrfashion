import { useState, useEffect } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import type { SiteReminder, CreateSiteReminderData, UpdateSiteReminderData } from '../../../types/reminder';

interface ReminderFormProps {
  editingReminder: SiteReminder | null;
  onSave: (data: CreateSiteReminderData | UpdateSiteReminderData) => Promise<void>;
  onCancel: () => void;
}

const ReminderForm = ({ editingReminder, onSave, onCancel }: ReminderFormProps) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title);
      setMessage(editingReminder.message);
      setLinkUrl(editingReminder.linkUrl || '');
      setStartDate(
        editingReminder.startDate
          ? new Date(editingReminder.startDate).toISOString().slice(0, 16)
          : '',
      );
      setEndDate(
        editingReminder.endDate
          ? new Date(editingReminder.endDate).toISOString().slice(0, 16)
          : '',
      );
      setIsActive(editingReminder.isActive);
    } else {
      setTitle('');
      setMessage('');
      setLinkUrl('');
      setStartDate('');
      setEndDate('');
      setIsActive(true);
    }
    setFormError('');
  }, [editingReminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!message.trim()) {
      setFormError('Message is required');
      return;
    }
    if (!startDate) {
      setFormError('Start date is required');
      return;
    }
    if (!endDate) {
      setFormError('End date is required');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setFormError('End date must be after start date');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const data: CreateSiteReminderData | UpdateSiteReminderData = {
        title: title.trim(),
        message: message.trim(),
        linkUrl: linkUrl.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        isActive,
      };
      await onSave(data);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save reminder',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {formError}
        </div>
      )}

      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        placeholder="e.g. Summer Sale!"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          required
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-400"
          placeholder="Get 20% off on all kurtis..."
        />
      </div>

      <Input
        label="Link URL (optional)"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="/shop?category=womens-kurtis"
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600" />
        </label>
        <span className="text-sm text-gray-700">Active</span>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={saving}>
          {editingReminder ? 'Update Reminder' : 'Create Reminder'}
        </Button>
      </div>
    </form>
  );
};

export default ReminderForm;
