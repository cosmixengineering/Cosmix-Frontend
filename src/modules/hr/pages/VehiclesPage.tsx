import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/forms/TextInput';
import { SelectInput } from '@/components/forms/SelectInput';
import { Denied, QueryState, ActionMessage } from '../components/Feedback';
import { RecordView } from '../components/RecordView';
import {
  FinanceNotice,
  FinanceStatus,
  FinanceTabs,
  HasMorePager,
  TextAreaField,
} from '../components/finance/FinanceChrome';
import {
  approvalStateOptions,
  journeyPurposeOptions,
  serviceKindOptions,
} from '../components/finance/labels';
import { useFinanceAccess } from '../hooks/use-finance-access';
import { useFinanceAction, useFinanceQuery } from '../hooks/use-finance-queries';
import { queryString } from '../api/hr-finance-api';
import { labelDate } from '../utils/messages';
import {
  commuteDistance,
  custodyList,
  fuelClaim,
  fuelClaimPage,
  vehicle,
  vehicleCustody,
  vehicleIncident,
  vehicleIncidentPage,
  vehicleList,
  vehicleService,
  vehicleServicePage,
  vehicleTrip,
  vehicleTripPage,
  type Vehicle,
  type VehicleCustody,
} from '../schemas/finance';

const permissions = {
  self: 'attendance.vehicle.self',
  manage: 'attendance.vehicle.manage',
  custody: 'attendance.vehicle.custody.manage',
  trips: 'attendance.vehicle.trips.manage',
  fuel: 'attendance.vehicle.fuel.manage',
  maintenance: 'attendance.vehicle.maintenance.manage',
  incident: 'attendance.vehicle.incident.manage',
  commute: 'attendance.vehicle.commute.manage',
};

export function VehiclesPage() {
  const access = useFinanceAccess();
  const tabs = [
    { id: 'trips', label: 'Trips' },
    { id: 'fuel', label: 'Fuel claims' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'custody', label: 'Custody' },
    { id: 'incidents', label: 'Incidents' },
  ];
  const [tab, setTab] = useState('trips');
  const canSelf = access.canSelf(permissions.self);
  const canTrips = access.can(permissions.trips);
  const canFuel = access.can(permissions.fuel);
  const canMaintenance = access.can(permissions.maintenance);
  const canCustody = access.can(permissions.custody);
  const canIncident = access.can(permissions.incident);
  const canManage = access.can(permissions.manage);
  const canCommute = access.can(permissions.commute);
  if (
    !canSelf &&
    !canTrips &&
    !canFuel &&
    !canMaintenance &&
    !canCustody &&
    !canIncident &&
    !canManage &&
    !canCommute
  )
    return <Denied />;
  return (
    <section aria-label="Vehicles and fuel">
      <div className="hr-page-heading">
        <p className="hr-kicker">HR &bull; Attendance money</p>
        <h1>Vehicles and fuel</h1>
      </div>
      <FinanceTabs tabs={tabs} active={tab} onChange={setTab} label="Vehicle views" />
      {tab === 'trips' && (
        <VehicleTrips canSelf={canSelf} canManage={canTrips} canVehicles={canManage} />
      )}
      {tab === 'fuel' && (
        <VehicleFuel
          canSelf={canSelf}
          canManage={canFuel}
          canCommute={canCommute}
          canVehicles={canManage}
        />
      )}
      {tab === 'maintenance' && (
        <VehicleMaintenance canSelf={canSelf} canManage={canMaintenance} canVehicles={canManage} />
      )}
      {tab === 'custody' && (
        <VehicleCustodyPanel canSelf={canSelf} canManage={canCustody} canVehicles={canManage} />
      )}
      {tab === 'incidents' && <VehicleIncidents canSelf={canSelf} canManage={canIncident} />}
    </section>
  );
}

function useMyCustody(enabled: boolean) {
  return useFinanceQuery('/me/vehicles/custody', custodyList, enabled);
}

function VehicleTrips({
  canSelf,
  canManage,
  canVehicles,
}: {
  canSelf: boolean;
  canManage: boolean;
  canVehicles: boolean;
}) {
  const custody = useMyCustody(canSelf);
  const [form, setForm] = useState({
    vehicleId: '',
    purpose: '1',
    startedAt: '',
    endedAt: '',
    originLabel: '',
    destinationLabel: '',
    odometerStartKm: '',
    odometerEndKm: '',
    mapDistanceKm: '',
    routeEvidenceReference: '',
    workReference: '',
  });
  const [page, setPage] = useState(1);
  const [state, setState] = useState('0');
  const [employeeId, setEmployeeId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const action = useFinanceAction();

  const trips = useFinanceQuery(
    '/hr/vehicles/trips' +
      queryString({
        employeeId: employeeId.trim() || undefined,
        vehicleId: vehicleId.trim() || undefined,
        state: state === '' ? undefined : Number(state),
        page,
        pageSize: 20,
      }),
    vehicleTripPage,
    canManage,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      '/me/vehicles/trips',
      {
        vehicleId: form.vehicleId,
        purpose: Number(form.purpose),
        startedAt: new Date(form.startedAt).toISOString(),
        endedAt: new Date(form.endedAt).toISOString(),
        originLabel: form.originLabel,
        destinationLabel: form.destinationLabel,
        odometerStartKm: Number(form.odometerStartKm),
        odometerEndKm: Number(form.odometerEndKm),
        mapDistanceKm: Number(form.mapDistanceKm),
        routeEvidenceReference: form.routeEvidenceReference,
        workReference: form.workReference,
      },
      'POST',
      vehicleTrip,
    );
    if (result) {
      setForm({
        ...form,
        originLabel: '',
        destinationLabel: '',
        routeEvidenceReference: '',
        workReference: '',
      });
    }
  }

  async function approve(tripId: string) {
    if (!window.confirm('Approve this trip?')) return;
    const result = await action.run(
      `/hr/vehicles/trips/${tripId}/approve`,
      null,
      'POST',
      vehicleTrip,
    );
    if (result) void trips.refetch();
  }

  return (
    <>
      {canSelf && (
        <section className="hr-form-section">
          <h2>Submit a trip</h2>
          <QueryState query={custody}>
            <form className="hr-form-grid" onSubmit={(event) => void submit(event)}>
              <SelectInput
                label="Vehicle"
                required
                value={form.vehicleId}
                options={[
                  { value: '', label: 'Choose a vehicle in your custody' },
                  ...(custody.data ?? []).map((item) => ({
                    value: item.vehicleId,
                    label: item.registrationNumber,
                  })),
                ]}
                onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}
              />
              <SelectInput
                label="Purpose"
                value={form.purpose}
                options={journeyPurposeOptions}
                onChange={(event) => setForm({ ...form, purpose: event.target.value })}
              />
              <TextInput
                label="Started at"
                required
                type="datetime-local"
                value={form.startedAt}
                onChange={(event) => setForm({ ...form, startedAt: event.target.value })}
              />
              <TextInput
                label="Ended at"
                required
                type="datetime-local"
                value={form.endedAt}
                onChange={(event) => setForm({ ...form, endedAt: event.target.value })}
              />
              <TextInput
                label="Origin"
                required
                maxLength={200}
                value={form.originLabel}
                onChange={(event) => setForm({ ...form, originLabel: event.target.value })}
              />
              <TextInput
                label="Destination"
                required
                maxLength={200}
                value={form.destinationLabel}
                onChange={(event) => setForm({ ...form, destinationLabel: event.target.value })}
              />
              <TextInput
                label="Odometer start (km)"
                required
                type="number"
                min={0}
                step="0.1"
                value={form.odometerStartKm}
                onChange={(event) => setForm({ ...form, odometerStartKm: event.target.value })}
              />
              <TextInput
                label="Odometer end (km)"
                required
                type="number"
                min={0}
                step="0.1"
                value={form.odometerEndKm}
                onChange={(event) => setForm({ ...form, odometerEndKm: event.target.value })}
              />
              <TextInput
                label="Map distance (km)"
                required
                type="number"
                min={0}
                max={50_000}
                step="0.1"
                value={form.mapDistanceKm}
                onChange={(event) => setForm({ ...form, mapDistanceKm: event.target.value })}
              />
              <TextInput
                label="Route evidence reference"
                required
                maxLength={500}
                value={form.routeEvidenceReference}
                onChange={(event) =>
                  setForm({ ...form, routeEvidenceReference: event.target.value })
                }
              />
              <TextInput
                label="Work reference"
                required
                maxLength={150}
                value={form.workReference}
                onChange={(event) => setForm({ ...form, workReference: event.target.value })}
              />
              <div className="hr-actions wide">
                <Button type="submit" disabled={action.pending}>
                  Submit trip
                </Button>
              </div>
            </form>
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}

      {canManage && (
        <section className="hr-form-section">
          <h2>Trip queue</h2>
          <div className="hr-toolbar">
            <SelectInput
              label="State"
              value={state}
              options={approvalStateOptions}
              onChange={(event) => {
                setState(event.target.value);
                setPage(1);
              }}
            />
            <TextInput
              label="Employee id"
              value={employeeId}
              placeholder="All employees"
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setPage(1);
              }}
            />
            <TextInput
              label="Vehicle id"
              value={vehicleId}
              placeholder="All vehicles"
              onChange={(event) => {
                setVehicleId(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <QueryState query={trips}>
            {!trips.data?.items.length && (
              <FinanceNotice>No trips match this filter.</FinanceNotice>
            )}
            {trips.data?.items.map((trip) => (
              <article className="hr-repeat" key={trip.id}>
                <div className="hr-repeat-heading">
                  <h3>
                    {trip.registrationNumber} &middot;{' '}
                    {journeyPurposeOptions[trip.purpose - 1]?.label ?? trip.purpose} &middot;{' '}
                    <FinanceStatus value={trip.approvalState} />
                  </h3>
                  <div className="hr-actions">
                    {trip.approvalState === 'Pending' && (
                      <Button variant="success" onClick={() => void approve(trip.id)}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
                <RecordView
                  value={{
                    tripReference: trip.id,
                    employee: trip.employeeName,
                    origin: trip.originLabel,
                    destination: trip.destinationLabel,
                    startedAt: labelDate(trip.startedAt),
                    endedAt: labelDate(trip.endedAt),
                    odometerStartKm: trip.odometerStartKm,
                    odometerEndKm: trip.odometerEndKm,
                    tripDistanceKm: trip.tripDistanceKm,
                    mapDistanceKm: trip.mapDistanceKm,
                    routeEvidence: trip.routeEvidenceReference,
                    workReference: trip.workReference,
                    createdAt: labelDate(trip.createdAt),
                  }}
                />
              </article>
            ))}
            {trips.data && (
              <HasMorePager
                page={page}
                hasMore={trips.data.hasMore}
                busy={trips.isFetching}
                onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                onNext={() => setPage((value) => value + 1)}
              />
            )}
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}
      {!canVehicles && (
        <p className="muted">
          Vehicle registration and custody administration need the vehicle management permission.
        </p>
      )}
    </>
  );
}

function VehicleFuel({
  canSelf,
  canManage,
  canCommute,
  canVehicles,
}: {
  canSelf: boolean;
  canManage: boolean;
  canCommute: boolean;
  canVehicles: boolean;
}) {
  const custody = useMyCustody(canSelf);
  const vehicles = useFinanceQuery('/hr/vehicles', vehicleList, canVehicles);
  const [fuelForm, setFuelForm] = useState({
    vehicleTripId: '',
    currency: 'PKR',
    receiptReference: '',
  });
  const [commuteForm, setCommuteForm] = useState({
    employeeId: '',
    effectiveFrom: '',
    effectiveTo: '',
    oneWayKm: '',
    dailyRoundTripKm: '',
    routeReference: '',
  });
  const [page, setPage] = useState(1);
  const [state, setState] = useState('0');
  const [employeeId, setEmployeeId] = useState('');
  const action = useFinanceAction();

  const claims = useFinanceQuery(
    '/hr/vehicles/fuel-claims' +
      queryString({
        employeeId: employeeId.trim() || undefined,
        state: state === '' ? undefined : Number(state),
        page,
        pageSize: 20,
      }),
    fuelClaimPage,
    canManage,
  );

  async function submitFuel(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      '/me/vehicles/fuel-claims',
      {
        vehicleTripId: fuelForm.vehicleTripId,
        currency: fuelForm.currency.trim().toUpperCase(),
        receiptReference: fuelForm.receiptReference || null,
      },
      'POST',
      fuelClaim,
    );
    if (result) setFuelForm({ ...fuelForm, vehicleTripId: '', receiptReference: '' });
  }

  async function approveClaim(claimId: string) {
    if (!window.confirm('Approve this fuel claim for payroll settlement?')) return;
    const result = await action.run(
      `/hr/vehicles/fuel-claims/${claimId}/approve`,
      null,
      'POST',
      fuelClaim,
    );
    if (result) void claims.refetch();
  }

  async function submitCommute(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      '/hr/vehicles/commute',
      {
        employeeId: commuteForm.employeeId,
        effectiveFrom: commuteForm.effectiveFrom,
        effectiveTo: commuteForm.effectiveTo || null,
        oneWayKm: Number(commuteForm.oneWayKm),
        dailyRoundTripKm: Number(commuteForm.dailyRoundTripKm),
        routeReference: commuteForm.routeReference,
      },
      'POST',
      commuteDistance,
    );
    if (result)
      setCommuteForm({
        ...commuteForm,
        employeeId: '',
        oneWayKm: '',
        dailyRoundTripKm: '',
        routeReference: '',
      });
  }

  return (
    <>
      {canSelf && (
        <section className="hr-form-section">
          <h2>Submit a fuel claim</h2>
          <p className="muted">
            Enter the id of the approved trip this claim belongs to. A fuel claim needs an approved
            trip, and only one claim can exist per trip.
          </p>
          <QueryState query={custody}>
            <form className="hr-form-grid" onSubmit={(event) => void submitFuel(event)}>
              <TextInput
                label="Approved trip id"
                required
                value={fuelForm.vehicleTripId}
                onChange={(event) =>
                  setFuelForm({ ...fuelForm, vehicleTripId: event.target.value })
                }
              />
              <TextInput
                label="Currency"
                required
                maxLength={3}
                value={fuelForm.currency}
                onChange={(event) => setFuelForm({ ...fuelForm, currency: event.target.value })}
              />
              <TextInput
                label="Receipt reference"
                maxLength={500}
                value={fuelForm.receiptReference}
                onChange={(event) =>
                  setFuelForm({ ...fuelForm, receiptReference: event.target.value })
                }
              />
              <div className="hr-actions wide">
                <Button type="submit" disabled={action.pending || !fuelForm.vehicleTripId.trim()}>
                  Submit fuel claim
                </Button>
              </div>
            </form>
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}

      {canCommute && (
        <section className="hr-form-section">
          <h2>Baseline commute distance</h2>
          <p className="muted">
            The baseline commute distance is excluded from every fuel claim calculation for this
            employee.
          </p>
          <form className="hr-form-grid" onSubmit={(event) => void submitCommute(event)}>
            <TextInput
              label="Employee id"
              required
              value={commuteForm.employeeId}
              onChange={(event) =>
                setCommuteForm({ ...commuteForm, employeeId: event.target.value })
              }
            />
            <TextInput
              label="Effective from"
              required
              type="date"
              value={commuteForm.effectiveFrom}
              onChange={(event) =>
                setCommuteForm({ ...commuteForm, effectiveFrom: event.target.value })
              }
            />
            <TextInput
              label="Effective to"
              type="date"
              value={commuteForm.effectiveTo}
              onChange={(event) =>
                setCommuteForm({ ...commuteForm, effectiveTo: event.target.value })
              }
            />
            <TextInput
              label="One way (km)"
              required
              type="number"
              min={0}
              max={500}
              step="0.1"
              value={commuteForm.oneWayKm}
              onChange={(event) => setCommuteForm({ ...commuteForm, oneWayKm: event.target.value })}
            />
            <TextInput
              label="Daily round trip (km)"
              required
              type="number"
              min={0}
              max={1000}
              step="0.1"
              value={commuteForm.dailyRoundTripKm}
              onChange={(event) =>
                setCommuteForm({ ...commuteForm, dailyRoundTripKm: event.target.value })
              }
            />
            <TextInput
              label="Route reference"
              required
              maxLength={500}
              value={commuteForm.routeReference}
              onChange={(event) =>
                setCommuteForm({ ...commuteForm, routeReference: event.target.value })
              }
            />
            <div className="hr-actions wide">
              <Button
                type="submit"
                disabled={
                  action.pending ||
                  !commuteForm.employeeId.trim() ||
                  !commuteForm.effectiveFrom ||
                  !commuteForm.oneWayKm ||
                  !commuteForm.dailyRoundTripKm ||
                  !commuteForm.routeReference.trim()
                }
              >
                Save commute distance
              </Button>
            </div>
          </form>
          <ActionMessage action={action} />
        </section>
      )}

      {canManage && (
        <section className="hr-form-section">
          <h2>Fuel claim queue</h2>
          <div className="hr-toolbar">
            <SelectInput
              label="State"
              value={state}
              options={approvalStateOptions}
              onChange={(event) => {
                setState(event.target.value);
                setPage(1);
              }}
            />
            <TextInput
              label="Employee id"
              value={employeeId}
              placeholder="All employees"
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <QueryState query={claims}>
            {!claims.data?.items.length && (
              <FinanceNotice>No fuel claims match this filter.</FinanceNotice>
            )}
            {claims.data?.items.map((claim) => (
              <article className="hr-repeat" key={claim.id}>
                <div className="hr-repeat-heading">
                  <h3>
                    {claim.employeeName} &middot; <FinanceStatus value={claim.approvalState} />
                  </h3>
                  <div className="hr-actions">
                    {claim.approvalState === 'Pending' && (
                      <Button variant="success" onClick={() => void approveClaim(claim.id)}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
                <RecordView
                  value={{
                    claimReference: claim.id,
                    employeeReference: claim.employeeId,
                    trip: claim.vehicleTripId,
                    eligibleDistanceKm: claim.eligibleDistanceKm,
                    excludedCommuteKm: claim.excludedCommuteKm,
                    fuelLiters: claim.fuelLiters,
                    claimedAmount: claim.claimedAmount,
                    currency: claim.currency,
                    calculation: claim.calculationReference,
                    receipt: claim.receiptReference,
                    createdAt: labelDate(claim.createdAt),
                  }}
                />
              </article>
            ))}
            {claims.data && (
              <HasMorePager
                page={page}
                hasMore={claims.data.hasMore}
                busy={claims.isFetching}
                onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                onNext={() => setPage((value) => value + 1)}
              />
            )}
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}
      {vehicles.data && !vehicles.data.length && (
        <p className="muted">No company vehicles are registered yet.</p>
      )}
    </>
  );
}

function VehicleMaintenance({
  canSelf,
  canManage,
  canVehicles,
}: {
  canSelf: boolean;
  canManage: boolean;
  canVehicles: boolean;
}) {
  const custody = useMyCustody(canSelf);
  const [form, setForm] = useState({
    vehicleId: '',
    serviceKind: '1',
    serviceDate: new Date().toISOString().slice(0, 10),
    odometerKm: '',
    approvedOutstationKm: '',
    authorizedWorkshopReference: '',
    evidenceReference: '',
    claimedAmount: '',
    currency: 'PKR',
  });
  const [page, setPage] = useState(1);
  const [state, setState] = useState('0');
  const [employeeId, setEmployeeId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const action = useFinanceAction();

  const records = useFinanceQuery(
    '/hr/vehicles/maintenance' +
      queryString({
        vehicleId: vehicleId.trim() || undefined,
        employeeId: employeeId.trim() || undefined,
        state: state === '' ? undefined : Number(state),
        page,
        pageSize: 20,
      }),
    vehicleServicePage,
    canManage,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      '/me/vehicles/maintenance',
      {
        vehicleId: form.vehicleId,
        serviceKind: Number(form.serviceKind),
        serviceDate: form.serviceDate,
        odometerKm: Number(form.odometerKm),
        approvedOutstationKm: Number(form.approvedOutstationKm),
        authorizedWorkshopReference: form.authorizedWorkshopReference,
        evidenceReference: form.evidenceReference,
        claimedAmount: Number(form.claimedAmount),
        currency: form.currency.trim().toUpperCase(),
      },
      'POST',
      vehicleService,
    );
    if (result)
      setForm({
        ...form,
        odometerKm: '',
        authorizedWorkshopReference: '',
        evidenceReference: '',
        claimedAmount: '',
      });
  }

  async function approve(recordId: string) {
    if (!window.confirm('Approve this maintenance reimbursement?')) return;
    const result = await action.run(
      `/hr/vehicles/maintenance/${recordId}/approve`,
      null,
      'POST',
      vehicleService,
    );
    if (result) void records.refetch();
  }

  return (
    <>
      {canSelf && (
        <section className="hr-form-section">
          <h2>Submit a maintenance milestone</h2>
          <QueryState query={custody}>
            <form className="hr-form-grid" onSubmit={(event) => void submit(event)}>
              <SelectInput
                label="Vehicle"
                required
                value={form.vehicleId}
                options={[
                  { value: '', label: 'Choose a vehicle in your custody' },
                  ...(custody.data ?? []).map((item: VehicleCustody) => ({
                    value: item.vehicleId,
                    label: item.registrationNumber,
                  })),
                ]}
                onChange={(event) => setForm({ ...form, vehicleId: event.target.value })}
              />
              <SelectInput
                label="Service kind"
                value={form.serviceKind}
                options={serviceKindOptions}
                onChange={(event) => setForm({ ...form, serviceKind: event.target.value })}
              />
              <TextInput
                label="Service date"
                required
                type="date"
                value={form.serviceDate}
                onChange={(event) => setForm({ ...form, serviceDate: event.target.value })}
              />
              <TextInput
                label="Odometer (km)"
                required
                type="number"
                min={0}
                step="0.1"
                value={form.odometerKm}
                onChange={(event) => setForm({ ...form, odometerKm: event.target.value })}
              />
              <TextInput
                label="Approved outstation (km)"
                required
                type="number"
                min={0}
                max={50_000}
                step="0.1"
                value={form.approvedOutstationKm}
                onChange={(event) => setForm({ ...form, approvedOutstationKm: event.target.value })}
              />
              <TextInput
                label="Authorized workshop reference"
                required
                maxLength={200}
                value={form.authorizedWorkshopReference}
                onChange={(event) =>
                  setForm({ ...form, authorizedWorkshopReference: event.target.value })
                }
              />
              <TextInput
                label="Evidence reference"
                required
                maxLength={500}
                value={form.evidenceReference}
                onChange={(event) => setForm({ ...form, evidenceReference: event.target.value })}
              />
              <TextInput
                label="Claimed amount"
                required
                type="number"
                min={0}
                step="0.01"
                value={form.claimedAmount}
                onChange={(event) => setForm({ ...form, claimedAmount: event.target.value })}
              />
              <TextInput
                label="Currency"
                required
                maxLength={3}
                value={form.currency}
                onChange={(event) => setForm({ ...form, currency: event.target.value })}
              />
              <div className="hr-actions wide">
                <Button type="submit" disabled={action.pending}>
                  Submit maintenance
                </Button>
              </div>
            </form>
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}

      {canManage && (
        <section className="hr-form-section">
          <h2>Maintenance queue</h2>
          <div className="hr-toolbar">
            <SelectInput
              label="State"
              value={state}
              options={approvalStateOptions}
              onChange={(event) => {
                setState(event.target.value);
                setPage(1);
              }}
            />
            <TextInput
              label="Employee id"
              value={employeeId}
              placeholder="All employees"
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setPage(1);
              }}
            />
            <TextInput
              label="Vehicle id"
              value={vehicleId}
              placeholder="All vehicles"
              onChange={(event) => {
                setVehicleId(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <QueryState query={records}>
            {!records.data?.items.length && (
              <FinanceNotice>No maintenance records match this filter.</FinanceNotice>
            )}
            {records.data?.items.map((record) => (
              <article className="hr-repeat" key={record.id}>
                <div className="hr-repeat-heading">
                  <h3>
                    {record.registrationNumber} &middot;{' '}
                    {serviceKindOptions[record.serviceKind - 1]?.label ?? record.serviceKind}{' '}
                    &middot; <FinanceStatus value={record.approvalState} />
                  </h3>
                  <div className="hr-actions">
                    {record.approvalState === 'Pending' && (
                      <Button variant="success" onClick={() => void approve(record.id)}>
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
                <RecordView
                  value={{
                    recordReference: record.id,
                    employee: record.employeeName,
                    serviceDate: record.serviceDate,
                    odometerKm: record.odometerKm,
                    approvedOutstationKm: record.approvedOutstationKm,
                    workshop: record.authorizedWorkshopReference,
                    evidence: record.evidenceReference,
                    claimedAmount: record.claimedAmount,
                    currency: record.currency,
                    createdAt: labelDate(record.createdAt),
                  }}
                />
              </article>
            ))}
            {records.data && (
              <HasMorePager
                page={page}
                hasMore={records.data.hasMore}
                busy={records.isFetching}
                onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                onNext={() => setPage((value) => value + 1)}
              />
            )}
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}
      {canVehicles && <p className="muted">Vehicle directory is managed in the custody tab.</p>}
    </>
  );
}

function VehicleCustodyPanel({
  canSelf,
  canManage,
  canVehicles,
}: {
  canSelf: boolean;
  canManage: boolean;
  canVehicles: boolean;
}) {
  const custody = useMyCustody(canSelf);
  const vehicles = useFinanceQuery('/hr/vehicles', vehicleList, canVehicles);
  const [vehicleId, setVehicleId] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [createForm, setCreateForm] = useState({
    registrationNumber: '',
    vehicleType: '',
    makeModel: '',
    assetReference: '',
  });
  const [issueForm, setIssueForm] = useState({
    vehicleId: '',
    employeeId: '',
    issuedAt: '',
    issueOdometerKm: '',
    issueConditionReference: '',
  });
  const [returning, setReturning] = useState<VehicleCustody | null>(null);
  const [returnForm, setReturnForm] = useState({
    returnedAt: '',
    returnOdometerKm: '',
    returnConditionReference: '',
  });
  const action = useFinanceAction();
  const history = useFinanceQuery(
    '/hr/vehicles/custody/history' +
      queryString({
        vehicleId: vehicleId.trim() || undefined,
        employeeId: employeeFilter.trim() || undefined,
      }),
    custodyList,
    canManage,
  );

  async function createVehicle(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      '/hr/vehicles',
      {
        registrationNumber: createForm.registrationNumber,
        vehicleType: createForm.vehicleType,
        makeModel: createForm.makeModel,
        assetReference: createForm.assetReference || null,
      },
      'POST',
      vehicle,
    );
    if (result) {
      setCreateForm({ registrationNumber: '', vehicleType: '', makeModel: '', assetReference: '' });
      void vehicles.refetch();
    }
  }

  async function issue(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      '/hr/vehicles/custody/issue',
      {
        vehicleId: issueForm.vehicleId,
        employeeId: issueForm.employeeId,
        issuedAt: new Date(issueForm.issuedAt).toISOString(),
        issueOdometerKm: Number(issueForm.issueOdometerKm),
        issueConditionReference: issueForm.issueConditionReference,
      },
      'POST',
      vehicleCustody,
    );
    if (result) {
      setIssueForm({
        vehicleId: '',
        employeeId: '',
        issuedAt: '',
        issueOdometerKm: '',
        issueConditionReference: '',
      });
      void history.refetch();
    }
  }

  async function recordReturn(event: FormEvent) {
    event.preventDefault();
    if (!returning) return;
    const result = await action.run(
      `/hr/vehicles/custody/${returning.id}/return`,
      {
        returnedAt: new Date(returnForm.returnedAt).toISOString(),
        returnOdometerKm: Number(returnForm.returnOdometerKm),
        returnConditionReference: returnForm.returnConditionReference,
      },
      'POST',
      vehicleCustody,
    );
    if (result) {
      setReturning(null);
      setReturnForm({ returnedAt: '', returnOdometerKm: '', returnConditionReference: '' });
      void history.refetch();
      void custody.refetch();
    }
  }

  return (
    <>
      {canSelf && (
        <section className="hr-form-section">
          <h2>My vehicle custody</h2>
          <QueryState query={custody}>
            {!custody.data?.length && <FinanceNotice>No vehicle custody history.</FinanceNotice>}
            {custody.data?.map((item) => (
              <RecordView
                key={item.id}
                value={{
                  custodyReference: item.id,
                  registrationNumber: item.registrationNumber,
                  issuedAt: labelDate(item.issuedAt),
                  issueOdometerKm: item.issueOdometerKm,
                  issuedCondition: item.issueConditionReference,
                  returnedAt: labelDate(item.returnedAt),
                  returnOdometerKm: item.returnOdometerKm,
                  returnCondition: item.returnConditionReference,
                  active: item.isActive,
                }}
              />
            ))}
          </QueryState>
        </section>
      )}

      {canManage && (
        <section className="hr-form-section">
          <h2>Custody history</h2>
          <div className="hr-toolbar">
            <TextInput
              label="Vehicle id"
              value={vehicleId}
              placeholder="All vehicles"
              onChange={(event) => setVehicleId(event.target.value)}
            />
            <TextInput
              label="Employee id"
              value={employeeFilter}
              placeholder="All employees"
              onChange={(event) => setEmployeeFilter(event.target.value)}
            />
          </div>
          <QueryState query={history}>
            {!history.data?.length && <FinanceNotice>No custody records found.</FinanceNotice>}
            {history.data?.map((item) => (
              <article className="hr-repeat" key={item.id}>
                <div className="hr-repeat-heading">
                  <h3>
                    {item.registrationNumber} &middot; {item.employeeName} &middot;{' '}
                    <FinanceStatus value={item.isActive ? 'active' : 'returned'} />
                  </h3>
                  <div className="hr-actions">
                    {item.isActive && (
                      <Button variant="secondary" onClick={() => setReturning(item)}>
                        Record return
                      </Button>
                    )}
                  </div>
                </div>
                <RecordView
                  value={{
                    custodyReference: item.id,
                    employeeReference: item.employeeId,
                    issuedAt: labelDate(item.issuedAt),
                    issueOdometerKm: item.issueOdometerKm,
                    issuedCondition: item.issueConditionReference,
                    returnedAt: labelDate(item.returnedAt),
                    returnOdometerKm: item.returnOdometerKm,
                    returnCondition: item.returnConditionReference,
                  }}
                />
                {returning?.id === item.id && (
                  <form className="hr-form-grid" onSubmit={(event) => void recordReturn(event)}>
                    <TextInput
                      label="Returned at"
                      required
                      type="datetime-local"
                      value={returnForm.returnedAt}
                      onChange={(event) =>
                        setReturnForm({ ...returnForm, returnedAt: event.target.value })
                      }
                    />
                    <TextInput
                      label="Return odometer (km)"
                      required
                      type="number"
                      min={0}
                      step="0.1"
                      value={returnForm.returnOdometerKm}
                      onChange={(event) =>
                        setReturnForm({ ...returnForm, returnOdometerKm: event.target.value })
                      }
                    />
                    <TextAreaField
                      label="Return condition reference"
                      required
                      value={returnForm.returnConditionReference}
                      onChange={(value) =>
                        setReturnForm({ ...returnForm, returnConditionReference: value })
                      }
                      disabled={action.pending}
                    />
                    <div className="hr-actions wide">
                      <Button type="submit" disabled={action.pending || !returnForm.returnedAt}>
                        Record return
                      </Button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}

      {canManage && (
        <section className="hr-form-section">
          <h2>Issue custody</h2>
          <form className="hr-form-grid" onSubmit={(event) => void issue(event)}>
            <SelectInput
              label="Vehicle"
              required
              value={issueForm.vehicleId}
              options={[
                { value: '', label: 'Choose a vehicle' },
                ...(vehicles.data ?? []).map((item: Vehicle) => ({
                  value: item.id,
                  label: `${item.registrationNumber} (${item.makeModel})`,
                })),
              ]}
              onChange={(event) => setIssueForm({ ...issueForm, vehicleId: event.target.value })}
            />
            <TextInput
              label="Employee id"
              required
              value={issueForm.employeeId}
              onChange={(event) => setIssueForm({ ...issueForm, employeeId: event.target.value })}
            />
            <TextInput
              label="Issued at"
              required
              type="datetime-local"
              value={issueForm.issuedAt}
              onChange={(event) => setIssueForm({ ...issueForm, issuedAt: event.target.value })}
            />
            <TextInput
              label="Issue odometer (km)"
              required
              type="number"
              min={0}
              step="0.1"
              value={issueForm.issueOdometerKm}
              onChange={(event) =>
                setIssueForm({ ...issueForm, issueOdometerKm: event.target.value })
              }
            />
            <TextAreaField
              label="Issue condition reference"
              required
              value={issueForm.issueConditionReference}
              onChange={(value) => setIssueForm({ ...issueForm, issueConditionReference: value })}
              disabled={action.pending}
            />
            <div className="hr-actions wide">
              <Button
                type="submit"
                disabled={
                  action.pending ||
                  !issueForm.vehicleId ||
                  !issueForm.employeeId.trim() ||
                  !issueForm.issuedAt
                }
              >
                Issue custody
              </Button>
            </div>
          </form>
          <ActionMessage action={action} />
        </section>
      )}

      {canVehicles && (
        <section className="hr-form-section">
          <h2>Register a vehicle</h2>
          <form className="hr-form-grid" onSubmit={(event) => void createVehicle(event)}>
            <TextInput
              label="Registration number"
              required
              maxLength={40}
              value={createForm.registrationNumber}
              onChange={(event) =>
                setCreateForm({ ...createForm, registrationNumber: event.target.value })
              }
            />
            <TextInput
              label="Vehicle type"
              required
              maxLength={60}
              value={createForm.vehicleType}
              onChange={(event) =>
                setCreateForm({ ...createForm, vehicleType: event.target.value })
              }
            />
            <TextInput
              label="Make and model"
              required
              maxLength={150}
              value={createForm.makeModel}
              onChange={(event) => setCreateForm({ ...createForm, makeModel: event.target.value })}
            />
            <TextInput
              label="Asset reference"
              maxLength={100}
              value={createForm.assetReference}
              onChange={(event) =>
                setCreateForm({ ...createForm, assetReference: event.target.value })
              }
            />
            <div className="hr-actions wide">
              <Button
                type="submit"
                disabled={
                  action.pending ||
                  !createForm.registrationNumber.trim() ||
                  !createForm.vehicleType.trim() ||
                  !createForm.makeModel.trim()
                }
              >
                Register vehicle
              </Button>
            </div>
          </form>
          {vehicles.data && (
            <>
              <h3>Vehicles</h3>
              {!vehicles.data.length && <p className="muted">No vehicles registered yet.</p>}
              {vehicles.data.map((item) => (
                <RecordView
                  key={item.id}
                  value={{
                    registrationNumber: item.registrationNumber,
                    vehicleType: item.vehicleType,
                    makeModel: item.makeModel,
                    assetReference: item.assetReference,
                    active: item.isActive,
                  }}
                />
              ))}
            </>
          )}
          <ActionMessage action={action} />
        </section>
      )}
    </>
  );
}

function VehicleIncidents({ canSelf, canManage }: { canSelf: boolean; canManage: boolean }) {
  const custody = useMyCustody(canSelf);
  const [form, setForm] = useState({
    vehicleCustodyId: '',
    occurredAt: '',
    incidentEvidenceReference: '',
    thirdPartyDetailsReference: '',
    insuranceClaimReference: '',
    proposedEmployeeLiability: '',
    currency: 'PKR',
  });
  const [page, setPage] = useState(1);
  const [state, setState] = useState('');
  const [custodyId, setCustodyId] = useState('');
  const action = useFinanceAction();

  const incidents = useFinanceQuery(
    '/hr/vehicles/incidents' +
      queryString({
        custodyId: custodyId.trim() || undefined,
        state: state === '' ? undefined : Number(state),
        page,
        pageSize: 20,
      }),
    vehicleIncidentPage,
    canManage,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await action.run(
      '/me/vehicles/incidents',
      {
        vehicleCustodyId: form.vehicleCustodyId,
        occurredAt: new Date(form.occurredAt).toISOString(),
        incidentEvidenceReference: form.incidentEvidenceReference,
        thirdPartyDetailsReference: form.thirdPartyDetailsReference || null,
        insuranceClaimReference: form.insuranceClaimReference || null,
        proposedEmployeeLiability: form.proposedEmployeeLiability
          ? Number(form.proposedEmployeeLiability)
          : null,
        currency: form.currency.trim().toUpperCase() || null,
      },
      'POST',
      vehicleIncident,
    );
    if (result)
      setForm({
        ...form,
        vehicleCustodyId: '',
        incidentEvidenceReference: '',
        thirdPartyDetailsReference: '',
        insuranceClaimReference: '',
        proposedEmployeeLiability: '',
      });
  }

  return (
    <>
      {canSelf && (
        <section className="hr-form-section">
          <h2>Report an incident</h2>
          <p className="muted">
            Incidents are recorded for review. The backend does not expose an incident decision
            endpoint, so reports stay read-only after submission.
          </p>
          <QueryState query={custody}>
            <form className="hr-form-grid" onSubmit={(event) => void submit(event)}>
              <SelectInput
                label="Custody record"
                required
                value={form.vehicleCustodyId}
                options={[
                  { value: '', label: 'Choose an active custody record' },
                  ...(custody.data ?? [])
                    .filter((item) => item.isActive)
                    .map((item) => ({
                      value: item.id,
                      label: `${item.registrationNumber} issued ${labelDate(item.issuedAt)}`,
                    })),
                ]}
                onChange={(event) => setForm({ ...form, vehicleCustodyId: event.target.value })}
              />
              <TextInput
                label="Occurred at"
                required
                type="datetime-local"
                value={form.occurredAt}
                onChange={(event) => setForm({ ...form, occurredAt: event.target.value })}
              />
              <TextInput
                label="Incident evidence reference"
                required
                maxLength={500}
                value={form.incidentEvidenceReference}
                onChange={(event) =>
                  setForm({ ...form, incidentEvidenceReference: event.target.value })
                }
              />
              <TextInput
                label="Third party details reference"
                maxLength={500}
                value={form.thirdPartyDetailsReference}
                onChange={(event) =>
                  setForm({ ...form, thirdPartyDetailsReference: event.target.value })
                }
              />
              <TextInput
                label="Insurance claim reference"
                maxLength={200}
                value={form.insuranceClaimReference}
                onChange={(event) =>
                  setForm({ ...form, insuranceClaimReference: event.target.value })
                }
              />
              <TextInput
                label="Proposed employee liability"
                type="number"
                min={0}
                step="0.01"
                value={form.proposedEmployeeLiability}
                onChange={(event) =>
                  setForm({ ...form, proposedEmployeeLiability: event.target.value })
                }
              />
              <TextInput
                label="Currency"
                maxLength={3}
                value={form.currency}
                onChange={(event) => setForm({ ...form, currency: event.target.value })}
              />
              <div className="hr-actions wide">
                <Button type="submit" disabled={action.pending}>
                  Report incident
                </Button>
              </div>
            </form>
          </QueryState>
          <ActionMessage action={action} />
        </section>
      )}

      {canManage && (
        <section className="hr-form-section">
          <h2>Incident reports</h2>
          <div className="hr-toolbar">
            <SelectInput
              label="State"
              value={state}
              options={approvalStateOptions}
              onChange={(event) => {
                setState(event.target.value);
                setPage(1);
              }}
            />
            <TextInput
              label="Custody id"
              value={custodyId}
              placeholder="All custody records"
              onChange={(event) => {
                setCustodyId(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <p className="muted">
            Incidents have no decide endpoint, so this queue is read-only evidence for review.
          </p>
          <QueryState query={incidents}>
            {!incidents.data?.items.length && (
              <FinanceNotice>No incident reports match this filter.</FinanceNotice>
            )}
            {incidents.data?.items.map((incident) => (
              <article className="hr-repeat" key={incident.id}>
                <div className="hr-repeat-heading">
                  <h3>
                    {incident.vehicleCustodyId} &middot;{' '}
                    <FinanceStatus value={incident.approvalState} />
                  </h3>
                </div>
                <RecordView
                  value={{
                    incidentReference: incident.id,
                    occurredAt: labelDate(incident.occurredAt),
                    evidence: incident.incidentEvidenceReference,
                    thirdPartyDetails: incident.thirdPartyDetailsReference,
                    insuranceClaim: incident.insuranceClaimReference,
                    proposedLiability: incident.proposedEmployeeLiability,
                    currency: incident.currency,
                    createdAt: labelDate(incident.createdAt),
                  }}
                />
              </article>
            ))}
            {incidents.data && (
              <HasMorePager
                page={page}
                hasMore={incidents.data.hasMore}
                busy={incidents.isFetching}
                onPrevious={() => setPage((value) => Math.max(1, value - 1))}
                onNext={() => setPage((value) => value + 1)}
              />
            )}
          </QueryState>
        </section>
      )}
    </>
  );
}
