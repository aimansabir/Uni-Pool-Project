import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/common/Button/Button';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import hondaCivic from '../../assets/images/honda_civic.png';
import toyotaCorolla from '../../assets/images/toyota_corolla.png';
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
      <div className="vehicles-page__banner">
        <h2 className="vehicles-page__banner-title">Choose Your Car</h2>
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
        <div className="vehicles-page__content">
          <div className="vehicles-page__list">
            {vehicles.map((vehicle, idx) => (
              <div key={vehicle.id} className="vehicle-card" onClick={() => navigate('/rides/publish', { state: { vehicleId: vehicle.id } })}>
                <div className="vehicle-card__image-container">
                  <img 
                    src={vehicle.imageUrl || (idx % 2 === 0 ? hondaCivic : toyotaCorolla)} 
                    alt={`${vehicle.make} ${vehicle.model}`} 
                    className="vehicle-card__img"
                  />
                </div>
                <div className="vehicle-card__details">
                  <div className="vehicle-detail"><span className="label">Make :</span> {vehicle.make}</div>
                  <div className="vehicle-detail"><span className="label">Model :</span> {vehicle.model}</div>
                  <div className="vehicle-detail"><span className="label">Color :</span> {vehicle.color}</div>
                  <div className="vehicle-detail"><span className="label">Reg No :</span> {vehicle.registrationNumber}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="vehicles-page__action-footer">
            <button
              className="add-car-btn"
              onClick={() => navigate('/vehicles/new')}
            >
              Add Car
            </button>
          </div>
        </div>
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
