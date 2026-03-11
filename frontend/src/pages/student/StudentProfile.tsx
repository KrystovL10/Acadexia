import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  GraduationCap,
  Shield,
  Edit3,
  X,
  Check,
  Camera,
  Mail,
  Phone,
  MapPin,
  Home,
  Users,
  Calendar,
  BookOpen,
  Award,
  CheckCircle,
  AlertCircle,
  Link,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import Input from '../../components/ui/Input';
import { useMyProfile, useUpdateProfile } from '../../hooks/student';
import { useAuthStore } from '../../store/auth.store';
import type { StudentProfileDto } from '../../types/student.types';

/* ─── Zod schema for editable fields ─── */

const editSchema = z.object({
  residentialAddress: z.string().min(5, 'Address must be at least 5 characters'),
  profilePhotoUrl: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

/* ─── Helpers ─── */

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-gray-800 break-words">{value ?? '—'}</p>
      </div>
    </div>
  );
}

/* ─── Profile completion ─── */

function completionFields(profile: StudentProfileDto): { label: string; done: boolean }[] {
  return [
    { label: 'First & last name', done: !!(profile.firstName && profile.lastName) },
    { label: 'Email address', done: !!profile.email },
    { label: 'Date of birth', done: !!profile.dateOfBirth },
    { label: 'Residential address', done: !!profile.residentialAddress },
    { label: 'Guardian details', done: !!(profile.guardianName && profile.guardianPhone) },
    { label: 'Profile photo', done: !!profile.profilePhotoUrl },
    { label: 'BECE results', done: profile.beceAggregate !== null },
  ];
}

function ProfileCompletion({ profile }: { profile: StudentProfileDto }) {
  const fields = completionFields(profile);
  const done = fields.filter((f) => f.done).length;
  const pct = Math.round((done / fields.length) * 100);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Profile Completion</h3>
        <span
          className={`text-sm font-bold ${
            pct === 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'
          }`}
        >
          {pct}%
        </span>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {fields.map(({ label, done }) => (
          <li key={label} className="flex items-center gap-2 text-xs">
            {done ? (
              <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            )}
            <span className={done ? 'text-gray-600' : 'text-gray-400'}>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Photo URL modal ─── */

function PhotoModal({
  open,
  currentUrl,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  currentUrl: string;
  onClose: () => void;
  onSave: (url: string) => void;
  saving: boolean;
}) {
  const [url, setUrl] = useState(currentUrl);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Update Profile Photo</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {url && (
          <div className="mb-4 flex justify-center">
            <img
              src={url}
              alt="Preview"
              className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          </div>
        )}

        <div className="mb-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <Link className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
          />
        </div>
        <p className="mb-4 text-[11px] text-gray-400">Paste a direct image URL (JPG, PNG, or WebP)</p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(url)}
            disabled={saving || !url.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Personal Info Tab ─── */

function PersonalInfoTab({
  profile,
  isEditing,
  form,
}: {
  profile: StudentProfileDto;
  isEditing: boolean;
  form: ReturnType<typeof useForm<EditFormValues>>;
}) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4">
      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Basic Information</h3>
        </div>
        <div className="px-5">
          <InfoRow icon={User} label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
          <InfoRow icon={Mail} label="Email Address" value={profile.email} />
          <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
          <InfoRow icon={User} label="Gender" value={profile.gender} />
          <InfoRow icon={MapPin} label="Hometown" value={profile.hometown} />
        </div>
      </div>

      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</h3>
        </div>
        <div className="px-5">
          {isEditing ? (
            <div className="py-3">
              <Input
                {...register('residentialAddress')}
                id="residentialAddress"
                label="Residential Address"
                error={errors.residentialAddress?.message}
                placeholder="Enter your current address"
              />
            </div>
          ) : (
            <InfoRow icon={Home} label="Residential Address" value={profile.residentialAddress} />
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Guardian / Parent</h3>
        </div>
        <div className="px-5">
          <InfoRow icon={Users} label="Guardian Name" value={profile.guardianName} />
          <InfoRow icon={Phone} label="Guardian Phone" value={profile.guardianPhone} />
          <InfoRow icon={Users} label="Relationship" value={profile.guardianRelationship} />
        </div>
      </div>
    </div>
  );
}

/* ─── Academic Info Tab ─── */

function AcademicInfoTab({ profile }: { profile: StudentProfileDto }) {
  return (
    <div className="space-y-4">
      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Enrollment</h3>
        </div>
        <div className="px-5">
          <InfoRow icon={BookOpen} label="Student Index" value={profile.studentIndex} />
          <InfoRow icon={Calendar} label="Admission Date" value={formatDate(profile.admissionDate)} />
          <InfoRow icon={BookOpen} label="Program" value={profile.currentProgramName} />
          <InfoRow icon={GraduationCap} label="Year Group" value={profile.currentYearGroup} />
          <InfoRow icon={Users} label="Current Class" value={profile.currentClassName} />
        </div>
      </div>

      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">BECE Results</h3>
        </div>
        <div className="px-5">
          <InfoRow icon={Award} label="BECE Year" value={profile.beceYear ?? 'Not recorded'} />
          <InfoRow
            icon={Award}
            label="BECE Aggregate"
            value={
              profile.beceAggregate !== null ? (
                <span className="font-bold text-primary">{profile.beceAggregate}</span>
              ) : (
                'Not recorded'
              )
            }
          />
        </div>
      </div>

      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</h3>
        </div>
        <div className="px-5">
          <InfoRow
            icon={CheckCircle}
            label="Account Status"
            value={
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  profile.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {profile.isActive ? 'Active' : 'Inactive'}
              </span>
            }
          />
          <InfoRow
            icon={GraduationCap}
            label="Graduation"
            value={
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  profile.hasGraduated ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                }`}
              >
                {profile.hasGraduated ? 'Graduated' : 'Currently enrolled'}
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Account Tab ─── */

function AccountTab({ profile }: { profile: StudentProfileDto }) {
  return (
    <div className="space-y-4">
      <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-5 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Login Credentials</h3>
        </div>
        <div className="px-5">
          <InfoRow icon={Mail} label="Email / Username" value={profile.email} />
          <InfoRow
            icon={Shield}
            label="Password"
            value={
              <span className="text-sm text-gray-400">••••••••••</span>
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
        <div className="flex gap-3">
          <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Password Changes</p>
            <p className="mt-1 text-xs text-amber-700">
              To change your password, please contact your class teacher or school administrator. For security
              reasons, students cannot change passwords directly.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Security Tips</h3>
        <ul className="space-y-2 text-xs text-gray-500">
          {[
            'Never share your login credentials with anyone',
            'Log out from shared computers after use',
            'Report suspicious activity to your administrator',
            'Do not use your school email for personal accounts',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-400" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export default function StudentProfile() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      residentialAddress: profile?.residentialAddress ?? '',
      profilePhotoUrl: profile?.profilePhotoUrl ?? '',
    },
  });

  /* Reset form whenever profile loads/changes */
  const resetForm = (p: StudentProfileDto) => {
    form.reset({
      residentialAddress: p.residentialAddress ?? '',
      profilePhotoUrl: p.profilePhotoUrl ?? '',
    });
  };

  function handleEditToggle() {
    if (profile) resetForm(profile);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (profile) resetForm(profile);
    setIsEditing(false);
  }

  async function handleSubmit(values: EditFormValues) {
    await updateProfile.mutateAsync({
      residentialAddress: values.residentialAddress,
      profilePhotoUrl: values.profilePhotoUrl || undefined,
    });
    setIsEditing(false);
  }

  async function handlePhotoSave(url: string) {
    await updateProfile.mutateAsync({ profilePhotoUrl: url });
    setPhotoModalOpen(false);
  }

  /* ─── Loading skeleton ─── */
  if (isLoading) {
    return (
      <div className="space-y-6 pb-10">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <User className="mb-3 h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Unable to load profile. Please try again.</p>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="space-y-6 pb-10">
      {/* ─── Hero section ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-6 shadow-md">
        {/* Decorative rings */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              {/* Custom size avatar */}
              <div className="h-20 w-20 overflow-hidden rounded-full ring-4 ring-white/30">
                {profile.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/20 text-2xl font-bold text-white">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => setPhotoModalOpen(true)}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-primary shadow-md transition-transform hover:scale-105"
                title="Change photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">{fullName}</h1>
              <p className="mt-0.5 text-sm text-white/70">{profile.studentIndex}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                  {profile.currentProgramName}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                  {profile.currentYearGroup}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white">
                  {profile.currentClassName}
                </span>
              </div>
            </div>
          </div>

          {/* Edit button */}
          <div className="flex gap-2 sm:flex-col sm:items-end">
            {isEditing ? (
              <>
                <button
                  onClick={form.handleSubmit(handleSubmit)}
                  disabled={updateProfile.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-accent-dark disabled:opacity-60"
                >
                  {updateProfile.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleEditToggle}
                className="flex items-center gap-1.5 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Edit notice ─── */}
      {isEditing && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Edit3 className="h-4 w-4 flex-shrink-0" />
          <span>
            Edit mode — only your <strong>residential address</strong> can be updated. Contact your administrator
            to change other details.
          </span>
        </div>
      )}

      {/* ─── Main content grid ─── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tabs — main column */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="personal">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="personal">
                <User className="mr-1.5 h-3.5 w-3.5" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="academic">
                <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                Academic
              </TabsTrigger>
              <TabsTrigger value="account">
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal">
              <PersonalInfoTab profile={profile} isEditing={isEditing} form={form} />
            </TabsContent>

            <TabsContent value="academic">
              <AcademicInfoTab profile={profile} />
            </TabsContent>

            <TabsContent value="account">
              <AccountTab profile={profile} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <ProfileCompletion profile={profile} />

          {/* Quick facts card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Quick Facts</h3>
            <dl className="space-y-2">
              {[
                { label: 'Role', value: user?.role?.replace(/_/g, ' ') ?? 'Student' },
                {
                  label: 'Enrolled',
                  value: formatDate(profile.admissionDate),
                },
                {
                  label: 'BECE Aggregate',
                  value: profile.beceAggregate !== null ? String(profile.beceAggregate) : 'N/A',
                },
                {
                  label: 'Status',
                  value: profile.hasGraduated ? 'Graduated' : profile.isActive ? 'Active' : 'Inactive',
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <dt className="text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-700">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* ─── Photo modal ─── */}
      <PhotoModal
        open={photoModalOpen}
        currentUrl={profile.profilePhotoUrl ?? ''}
        onClose={() => setPhotoModalOpen(false)}
        onSave={handlePhotoSave}
        saving={updateProfile.isPending}
      />
    </div>
  );
}
