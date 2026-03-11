import { useState, useEffect } from 'react';
import { Save, School, Phone, Mail, MapPin, User, Quote } from 'lucide-react';

import Card from '../../components/common/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';

import { useAdminContext, useGetSchoolProfile, useUpdateSchoolProfile } from '../../hooks/admin/useAcademic';
import type { UpdateSchoolRequest } from '../../types/admin.types';

// ==================== MAIN PAGE ====================

export default function Settings() {
  const { toast } = useToast();
  const { data: context, isLoading: contextLoading } = useAdminContext();
  const schoolId = context?.schoolId ?? 0;

  const { data: school, isLoading: schoolLoading } = useGetSchoolProfile(schoolId);
  const updateMutation = useUpdateSchoolProfile();

  const [form, setForm] = useState<UpdateSchoolRequest>({
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
    motto: '',
    headmasterName: '',
    logoUrl: '',
  });

  // Populate form when school data loads
  useEffect(() => {
    if (school) {
      setForm({
        name: school.name ?? '',
        address: school.address ?? '',
        phoneNumber: school.phoneNumber ?? '',
        email: school.email ?? '',
        motto: school.motto ?? '',
        headmasterName: school.headmasterName ?? '',
        logoUrl: school.logoUrl ?? '',
      });
    }
  }, [school]);

  function handleChange(field: keyof UpdateSchoolRequest, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    updateMutation.mutate(
      { schoolId, data: form },
      {
        onSuccess: () => {
          toast({ title: 'Settings saved', description: 'School settings updated successfully', variant: 'success' });
        },
        onError: () => {
          toast({ title: 'Error', description: 'Failed to save settings. Please try again.', variant: 'danger' });
        },
      },
    );
  }

  const isLoading = contextLoading || schoolLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure school information and system preferences.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* School Info Card */}
          <Card>
            <div className="border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-gray-900">School Information</h2>
              </div>
            </div>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  label="School Name"
                  value={form.name ?? ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Kumasi Senior High School"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  School Code
                </label>
                <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                  {school?.schoolCode ?? '—'}
                  <span className="ml-2 text-xs text-gray-400">(read-only)</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-7 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1">
                  <Input
                    label="Address"
                    value={form.address ?? ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="School address"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-7 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1">
                  <Input
                    label="Phone Number"
                    value={form.phoneNumber ?? ''}
                    onChange={(e) => handleChange('phoneNumber', e.target.value)}
                    placeholder="+233 XX XXX XXXX"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-7 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1">
                  <Input
                    label="Email Address"
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="school@example.com"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="mt-7 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1">
                  <Input
                    label="Headmaster Name"
                    value={form.headmasterName ?? ''}
                    onChange={(e) => handleChange('headmasterName', e.target.value)}
                    placeholder="Full name of the headmaster"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 sm:col-span-2">
                <Quote className="mt-7 h-4 w-4 flex-shrink-0 text-gray-400" />
                <div className="flex-1">
                  <Input
                    label="School Motto"
                    value={form.motto ?? ''}
                    onChange={(e) => handleChange('motto', e.target.value)}
                    placeholder="e.g. Excellence in All Things"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="Logo URL"
                  value={form.logoUrl ?? ''}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="https://..."
                />
                {form.logoUrl && (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={form.logoUrl}
                      alt="School logo preview"
                      className="h-12 w-12 rounded-lg border border-gray-200 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-xs text-gray-500">Logo preview</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Read-only info */}
          {school && (
            <Card>
              <div className="border-b border-gray-100 px-6 py-4">
                <h2 className="font-semibold text-gray-900">System Information</h2>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Region</div>
                  <div className="mt-1 text-sm text-gray-700">{school.region || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-400">District</div>
                  <div className="mt-1 text-sm text-gray-700">{school.district || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Status</div>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${school.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {school.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Save button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending || !schoolId}>
              {updateMutation.isPending ? (
                <>
                  <Spinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
