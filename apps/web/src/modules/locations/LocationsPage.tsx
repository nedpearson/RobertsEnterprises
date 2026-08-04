import { LocationsModule } from '../../LocationsModule';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api';

export default function LocationsPage() {
  return (
    <div className="fade-in">
      <LocationsModule API_BASE={API_BASE} />
    </div>
  );
}
