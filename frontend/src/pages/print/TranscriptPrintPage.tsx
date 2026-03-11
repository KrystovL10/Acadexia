import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useGenerateTranscript } from '../../hooks/teacher';
import { useAuthStore } from '../../store/auth.store';
import { getRoleHome } from '../../hooks/useAuth';
import TranscriptView from '../../components/pdf/TranscriptView';
import Spinner from '../../components/ui/Spinner';

export default function TranscriptPrintPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const user = useAuthStore((s) => s.user);
  const id = studentId ? Number(studentId) : null;
  const { data: transcript, isLoading } = useGenerateTranscript(id);

  const dashboardPath = user ? getRoleHome(user.role) : '/login';

  useEffect(() => {
    if (!transcript) return;
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, [transcript]);

  if (isLoading || !transcript) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="text-primary" />
          <p className="mt-3 text-sm text-gray-500">Loading transcript...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Action bar — hidden during print */}
      <div className="no-print sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[595px] items-center justify-between">
          <Link
            to={dashboardPath}
            className="text-sm font-medium text-primary hover:underline"
          >
            &larr; Return to Dashboard
          </Link>
          <button
            onClick={() => window.print()}
            className="print-keep rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light"
          >
            Print Transcript
          </button>
        </div>
      </div>

      {/* Transcript content */}
      <div className="mx-auto max-w-[595px] py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <TranscriptView transcript={transcript} />
        </div>
      </div>
    </div>
  );
}
