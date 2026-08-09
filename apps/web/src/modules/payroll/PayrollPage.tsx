import { PayrollModule } from '../../PayrollModule';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api';

export default function PayrollPage() {
  return (
    <div className="fade-in">
      <PayrollModule API_BASE={API_BASE} />
    </div>
  );
}
