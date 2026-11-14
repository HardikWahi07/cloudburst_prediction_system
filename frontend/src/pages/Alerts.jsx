import { Bell, ShieldCheck } from 'lucide-react';
import EmptyState from '../components/common/EmptyState.jsx';

export default function Alerts() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <Bell size={24} />
          Alerts & Emergency Notifications
        </h1>
        <p>
          Verified disaster management early warnings and critical meteorological advisories
        </p>
      </div>

      <div className="card">
        <EmptyState
          icon={ShieldCheck}
          title="No verified alerts are currently connected."
          description="Official emergency alert feeds (such as NDMA / SDMA CAP feeds or IMD Nowcast alerts) are not currently linked to this system. No automated public emergency notifications will be dispatched."
        />
      </div>
    </div>
  );
}
