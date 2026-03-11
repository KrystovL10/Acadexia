import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function ManageClasses() {
  return (
    <div>
      <PageHeader
        title="Manage Classes"
        subtitle="View and manage class groups"
        action={<Button>Create Class</Button>}
      />
      <Card>
        <p className="text-sm text-gray-500">Class management will be implemented in Phase 2.</p>
      </Card>
    </div>
  );
}
