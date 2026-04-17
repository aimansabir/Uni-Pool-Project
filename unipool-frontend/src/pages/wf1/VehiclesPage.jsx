import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button/Button';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import './VehiclesPage.css';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await vehiclesApi.list();
      setVehicles(res.data || []);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await vehiclesApi.delete(deleteTarget.id);
      setVehicles((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      showSuccess('Vehicle deleted.');
      setDeleteTarget(null);
    } catch (err) {
      showError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <FullPageSpinner />;

  return (
    <div className="vehicles-page fade-in">
      <div className="vehicles-page__header">
        <h2 className="vehicles-page__title">Choose Your Car</h2>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon="🚗"
          title="No vehicles yet"
          description="Add your first vehicle to start offering rides"
          action={
            <Button variant="primary" onClick={() => navigate('/vehicles/new')}>
              Add Car
            </Button>
          }
        />
      ) : (
        <>
          <div className="vehicles-page__list">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="vehicle-card">
                <div className="vehicle-card__image">
                  {vehicle.imageUrl ? (
                    <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} />
                  ) : (
                    <div className="vehicle-card__placeholder">🚗</div>
                  )}
                </div>
                <div className="vehicle-card__info">
                  <h4 className="vehicle-card__name">
                    {vehicle.make} · {vehicle.model}
                  </h4>
                  <p className="vehicle-card__meta">
                    Color: {vehicle.color}
                    <br />
                    Reg No: {vehicle.registrationNumber}
                  </p>
                </div>
                <div className="vehicle-card__actions">
                  <button
                    className="vehicle-card__action-btn"
                    onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
                    aria-label="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="vehicle-card__action-btn vehicle-card__action-btn--danger"
                    onClick={() => setDeleteTarget(vehicle)}
                    aria-label="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="vehicles-page__footer">
            <Button
              variant="primary"
              fullWidth
              onClick={() => navigate('/vehicles/new')}
            >
              Add Car
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Vehicle?"
        message={`Are you sure you want to delete ${deleteTarget?.make} ${deleteTarget?.model}? This cannot be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </div>
  );
}
