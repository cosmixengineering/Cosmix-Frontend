import { useState } from 'react';
import {
  Compass,
  ExternalLink,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { TextInput } from '@/components/forms/TextInput';
import { SelectInput } from '@/components/forms/SelectInput';
import { DataTable } from '@/components/data-display/DataTable';
import { useHrAccess } from '../../hooks/use-hr-access';
import { useHrAction, useHrQuery } from '../../hooks/use-hr-queries';
import { employeeTrackingSchema, type PunchLocation } from '../../schemas/tracking';
import { Denied, QueryState } from '../Feedback';
import { labelDate } from '../../utils/messages';

export function EmployeeMapTracking({ employeeId }: { employeeId: string }) {
  const access = useHrAccess();
  const action = useHrAction();
  const [selectedPunch, setSelectedPunch] = useState<PunchLocation | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simLat, setSimLat] = useState('24.8607');
  const [simLon, setSimLon] = useState('67.0011');
  const [simAccuracy, setSimAccuracy] = useState('10');
  const [simAction, setSimAction] = useState('CheckIn');
  const [simOffline, setSimOffline] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const query = useHrQuery(
    `employees/${employeeId}/tracking`,
    employeeTrackingSchema,
    ['hr.employees.read'],
  );

  if (!access.can('hr.employees.read')) return <Denied />;

  const data = query.data;
  const currentPunch = selectedPunch ?? data?.latestCheckIn ?? data?.checkInHistory?.[0] ?? null;

  const mapLat = currentPunch?.latitude ?? data?.assignedLocation?.latitude ?? 24.8607;
  const mapLon = currentPunch?.longitude ?? data?.assignedLocation?.longitude ?? 67.0011;
  const hasCoordinates =
    (currentPunch?.latitude !== null && currentPunch?.latitude !== undefined) ||
    (data?.assignedLocation?.latitude !== null && data?.assignedLocation?.latitude !== undefined);

  // Bounding box for OpenStreetMap iframe (approx ~1km around point)
  const delta = 0.006;
  const bbox = `${mapLon - delta}%2C${mapLat - delta * 0.7}%2C${mapLon + delta}%2C${mapLat + delta * 0.7}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${mapLat}%2C${mapLon}`;

  const handleUseCurrentLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSimLat(position.coords.latitude.toFixed(6));
        setSimLon(position.coords.longitude.toFixed(6));
        setSimAccuracy(Math.round(position.coords.accuracy).toString());
      },
      (err) => {
        setGeoError(`Unable to retrieve location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleRecordCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(simLat);
    const lon = parseFloat(simLon);
    const acc = parseFloat(simAccuracy) || 10;
    if (isNaN(lat) || isNaN(lon)) return;

    const result = await action.run(
      `employees/${employeeId}/tracking/record-checkin`,
      {
        latitude: lat,
        longitude: lon,
        accuracyMeters: acc,
        action: simAction,
        isOffline: simOffline,
      },
      'POST',
      employeeTrackingSchema,
    );

    if (result) {
      setSimulatorOpen(false);
      setSelectedPunch(result.latestCheckIn ?? null);
      void query.refetch();
    }
  };

  return (
    <section className="hr-form-section" style={{ maxWidth: '100%' }}>
      {/* Header bar */}
      <div className="hr-repeat-heading" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2>Live Map & Check-in Tracking</h2>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Real-time GPS capture, geofence verification, and employee check-in location on the map.
          </p>
        </div>
        <div className="hr-inline" style={{ gap: '8px' }}>
          <Button
            variant="ghost"
            title="Refresh tracking data"
            aria-label="Refresh tracking data"
            disabled={query.isFetching || action.pending}
            onClick={() => void query.refetch()}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
          <Button
            variant="primary"
            disabled={action.pending}
            onClick={() => {
              if (data?.assignedLocation?.latitude && data?.assignedLocation?.longitude) {
                setSimLat(data.assignedLocation.latitude.toString());
                setSimLon(data.assignedLocation.longitude.toString());
              }
              setSimulatorOpen(true);
            }}
          >
            <Navigation size={16} />
            Record / Test check-in
          </Button>
        </div>
      </div>

      <QueryState query={query}>
        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
            {/* Quick status summary cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px',
              }}
            >
              {/* Check-in status card */}
              <div
                style={{
                  background: 'white',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e3e7ec',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#657080' }}>
                    LATEST CHECK-IN
                  </span>
                  {currentPunch ? (
                    <span
                      className={`badge ${currentPunch.action === 'CheckIn' ? 'badge--positive' : 'badge--warning'}`}
                    >
                      <Radio size={12} style={{ marginRight: '4px' }} />
                      {currentPunch.action}
                    </span>
                  ) : (
                    <span className="badge badge--neutral">No punches yet</span>
                  )}
                </div>
                <div style={{ marginTop: '10px' }}>
                  {currentPunch ? (
                    <>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a202c' }}>
                        {currentPunch.latitude?.toFixed(5)}°, {currentPunch.longitude?.toFixed(5)}°
                      </div>
                      <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                        Captured: {labelDate(currentPunch.receivedAtUtc)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#718096' }}>
                      No check-in recorded today.
                    </div>
                  )}
                </div>
              </div>

              {/* Geofence & Boundary Card */}
              <div
                style={{
                  background: 'white',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e3e7ec',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#657080' }}>
                    GEOFENCE STATUS
                  </span>
                  {currentPunch?.insideGeofence !== null && currentPunch?.insideGeofence !== undefined ? (
                    currentPunch.insideGeofence ? (
                      <span className="badge badge--positive">
                        <ShieldCheck size={12} style={{ marginRight: '4px' }} />
                        Inside Geofence
                      </span>
                    ) : (
                      <span className="badge badge--warning">
                        <ShieldAlert size={12} style={{ marginRight: '4px' }} />
                        Outside Perimeter
                      </span>
                    )
                  ) : (
                    <span className="badge badge--neutral">Not assessed</span>
                  )}
                </div>
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a202c' }}>
                    {currentPunch?.distanceMeters !== null && currentPunch?.distanceMeters !== undefined
                      ? `${currentPunch.distanceMeters} m from site`
                      : data.assignedLocation
                        ? `${data.assignedLocation.siteName ?? data.assignedLocation.branchName ?? 'Assigned location'}`
                        : 'No site assigned'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                    Accuracy: ±{currentPunch?.accuracyMeters ?? 10} m &middot; Radius:{' '}
                    {data.assignedLocation?.radiusMeters ?? 100} m
                  </div>
                </div>
              </div>

              {/* Assigned Work Location Card */}
              <div
                style={{
                  background: 'white',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  border: '1px solid #e3e7ec',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#657080' }}>
                    ASSIGNED SITE / BRANCH
                  </span>
                  <MapPin size={16} color="#176d59" />
                </div>
                <div style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a202c' }}>
                    {data.assignedLocation?.siteName ??
                      data.assignedLocation?.branchName ??
                      'Unassigned'}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#718096',
                      marginTop: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {data.assignedLocation?.address ?? 'No physical address configured'}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Map Box */}
            <div
              style={{
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #d5dae2',
                overflow: 'hidden',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}
            >
              {/* Map toolbar */}
              <div
                style={{
                  padding: '12px 18px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#dc2626" />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                    {currentPunch
                      ? `Employee Location: ${currentPunch.action} (${currentPunch.latitude?.toFixed(5)}, ${currentPunch.longitude?.toFixed(5)})`
                      : hasCoordinates
                        ? `Assigned Site Location (${mapLat.toFixed(5)}, ${mapLon.toFixed(5)})`
                        : 'Location Preview'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${mapLat},${mapLon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--secondary"
                    style={{ fontSize: '12px', padding: '6px 10px', minHeight: '30px' }}
                  >
                    <ExternalLink size={13} />
                    Google Maps
                  </a>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${mapLat}&mlon=${mapLon}#map=17/${mapLat}/${mapLon}`}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--secondary"
                    style={{ fontSize: '12px', padding: '6px 10px', minHeight: '30px' }}
                  >
                    <Compass size={13} />
                    OpenStreetMap
                  </a>
                </div>
              </div>

              {/* Map View */}
              {hasCoordinates ? (
                <div style={{ position: 'relative', width: '100%', height: '480px', background: '#e5e7eb' }}>
                  <iframe
                    title="Employee Check-in Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={osmEmbedUrl}
                    style={{ border: 0 }}
                  />
                  {/* Floating Legend / Quick Details overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '16px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(4px)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: '1px solid #e2e8f0',
                      maxWidth: '320px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                      📍 {data.employeeName ?? 'Employee'}
                    </div>
                    <div style={{ color: '#475569' }}>
                      Status:{' '}
                      <strong style={{ color: currentPunch?.action === 'CheckIn' ? '#16a34a' : '#d97706' }}>
                        {currentPunch?.action ?? 'Not Checked In'}
                      </strong>
                    </div>
                    {currentPunch && (
                      <div style={{ color: '#64748b', marginTop: '2px' }}>
                        Time: {labelDate(currentPunch.receivedAtUtc)}
                      </div>
                    )}
                    {currentPunch?.distanceMeters !== null && currentPunch?.distanceMeters !== undefined && (
                      <div style={{ color: '#64748b', marginTop: '2px' }}>
                        Distance to Site: <strong>{currentPunch.distanceMeters} m</strong>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
                  <MapPin size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#334155' }}>No GPS check-in recorded yet</h3>
                  <p style={{ maxWidth: '420px', margin: '8px auto 16px', fontSize: '14px' }}>
                    When this employee checks in from their mobile device or workstation, their
                    live location coordinates will appear here on the map.
                  </p>
                  <Button variant="primary" onClick={() => setSimulatorOpen(true)}>
                    <Navigation size={16} />
                    Record a test check-in now
                  </Button>
                </div>
              )}
            </div>

            {/* Check-in History Table */}
            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e3e7ec', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Recent Check-in & Punch History</h3>
                <span className="muted" style={{ fontSize: '13px' }}>
                  {data.checkInHistory.length} recorded events
                </span>
              </div>

              {data.checkInHistory.length > 0 ? (
                <DataTable
                  caption="Employee check-in history"
                  rows={data.checkInHistory}
                  rowKey={(r) => r.id}
                  columns={[
                    {
                      id: 'action',
                      header: 'ACTION',
                      cell: (r) => (
                        <span
                          className={`badge ${r.action === 'CheckIn' ? 'badge--positive' : 'badge--warning'}`}
                        >
                          {r.action}
                        </span>
                      ),
                    },
                    {
                      id: 'time',
                      header: 'TIME (UTC/LOCAL)',
                      cell: (r) => labelDate(r.receivedAtUtc),
                    },
                    {
                      id: 'coords',
                      header: 'COORDINATES',
                      cell: (r) =>
                        r.latitude !== null && r.longitude !== null
                          ? `${r.latitude.toFixed(5)}°, ${r.longitude.toFixed(5)}°`
                          : 'No GPS',
                    },
                    {
                      id: 'geofence',
                      header: 'GEOFENCE',
                      cell: (r) =>
                        r.insideGeofence !== null ? (
                          r.insideGeofence ? (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Inside ({r.distanceMeters}m)</span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ Outside ({r.distanceMeters}m)</span>
                          )
                        ) : (
                          <span className="muted">—</span>
                        ),
                    },
                    {
                      id: 'accuracy',
                      header: 'ACCURACY',
                      cell: (r) => (r.accuracyMeters ? `±${r.accuracyMeters}m` : '—'),
                    },
                    {
                      id: 'view',
                      header: '',
                      cell: (r) => (
                        <Button
                          variant="ghost"
                          style={{ fontSize: '12px', padding: '4px 8px' }}
                          onClick={() => {
                            setSelectedPunch(r);
                            window.scrollTo({ top: 120, behavior: 'smooth' });
                          }}
                        >
                          <MapPin size={14} />
                          View on map
                        </Button>
                      ),
                    },
                  ]}
                />
              ) : (
                <p className="hr-notice">No check-in history recorded yet for this employee.</p>
              )}
            </div>
          </div>
        )}
      </QueryState>

      {/* Simulator / Live Check-In Modal */}
      {simulatorOpen && (
        <Dialog
          open
          title="Record / Simulate Check-In Location"
          description="Test and record live GPS check-in evidence for this employee."
          onOpenChange={(open) => {
            if (!open && !action.pending) setSimulatorOpen(false);
          }}
        >
          <form onSubmit={handleRecordCheckIn}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  padding: '12px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#166534',
                }}
              >
                <strong>Quick Test Helper:</strong> You can fetch your real current browser location or select a preset city location to test how the map shows the employee pin!
              </div>

              {geoError && (
                <p className="hr-message hr-message--error" role="alert">
                  {geoError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleUseCurrentLocation}
                >
                  <Navigation size={14} />
                  Detect My Current GPS
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSimLat('24.8607');
                    setSimLon('67.0011');
                  }}
                >
                  Karachi (HQ)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSimLat('31.5204');
                    setSimLon('74.3587');
                  }}
                >
                  Lahore Site
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSimLat('33.6844');
                    setSimLon('73.0479');
                  }}
                >
                  Islamabad Branch
                </Button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <TextInput
                  label="Latitude"
                  type="number"
                  step="0.000001"
                  required
                  value={simLat}
                  onChange={(e) => setSimLat(e.target.value)}
                />
                <TextInput
                  label="Longitude"
                  type="number"
                  step="0.000001"
                  required
                  value={simLon}
                  onChange={(e) => setSimLon(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <SelectInput
                  label="Punch Action"
                  value={simAction}
                  onChange={(e) => setSimAction(e.target.value)}
                  options={[
                    { value: 'CheckIn', label: 'Check In' },
                    { value: 'CheckOut', label: 'Check Out' },
                  ]}
                />
                <TextInput
                  label="Accuracy (meters)"
                  type="number"
                  min="1"
                  max="500"
                  value={simAccuracy}
                  onChange={(e) => setSimAccuracy(e.target.value)}
                />
              </div>

              <label className="hr-check" style={{ marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={simOffline}
                  onChange={(e) => setSimOffline(e.target.checked)}
                />
                Record as Offline Device Sync
              </label>

              {action.error && (
                <p className="hr-message hr-message--error" role="alert">
                  {action.error}
                </p>
              )}

              <div className="hr-actions" style={{ marginTop: '10px' }}>
                <Button type="submit" disabled={action.pending}>
                  <MapPin size={16} />
                  {action.pending ? 'Recording...' : 'Save & Show On Map'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={action.pending}
                  onClick={() => setSimulatorOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
