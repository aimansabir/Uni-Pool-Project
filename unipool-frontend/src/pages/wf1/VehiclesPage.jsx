import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import hondaCivic from '../../assets/images/honda_civic.png';
import toyotaCorolla from '../../assets/images/toyota_corolla.png';
import './VehiclesPage.css';

export default function VehiclesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Initialize selection from state if coming back from Publish page
  const [selectedVehicleId, setSelectedVehicleId] = useState(location.state?.vehicleId || null);

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

  const handleSelect = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setTimeout(() => {
      navigate('/rides/publish', { state: { vehicleId } });
    }, 450);
  };

  const handleEditClick = (e, vehicleId) => {
    e.stopPropagation(); // Don't trigger selection
    navigate(`/vehicles/${vehicleId}/edit`);
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
      {/* ── Section Header ── */}
      <div className="vehicles-section-header">
        <h1 className="vehicles-section-title">Choose Your Car</h1>
        <p className="vehicles-section-subtitle">Select a vehicle to continue</p>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon="🚗"
          title="No vehicles yet"
          description="Add your first vehicle to start offering rides"
          action={
            <button className="add-car-footer-btn" onClick={() => navigate('/vehicles/new')}>
              Add Car
            </button>
          }
        />
      ) : (
        <div className="vehicles-content-area">
          <div className="vehicles-grid">
            {vehicles.map((vehicle) => {
              const vId = vehicle.id || vehicle._id;
              const isSelected = selectedVehicleId === vId;
              const isHonda = vehicle.make?.toLowerCase().includes('honda');
              const isToyota = vehicle.make?.toLowerCase().includes('toyota');

              return (
                <div 
                  key={vId} 
                  className={`vehicle-selection-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(vId)}
                >
                  <div className="selection-card__left">
                    <div className="car-image-box">
                      <div className="brand-logo-pill">
                        {isHonda && <span className="brand-icon">H</span>}
                        {isToyota && <span className="brand-icon">T</span>}
                        {!isHonda && !isToyota && <span className="brand-icon">🚗</span>}
                      </div>
                      <img 
                        src={vehicle.imageUrl || (isHonda ? hondaCivic : toyotaCorolla)} 
                        alt={`${vehicle.make} ${vehicle.model}`} 
                        className="car-selection-img"
                      />
                    </div>
                  </div>

                  <div className="selection-card__right">
                    <div className="selection-card__header">
                      <h3 className="car-main-title">{vehicle.make} {vehicle.model}</h3>
                      {isSelected ? (
                        <div className="selection-check active">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                          </svg>
                        </div>
                      ) : (
                        <div className="selection-chevron" onClick={(e) => handleEditClick(e, vId)}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <p className="car-sub-details">{vehicle.color} • {vehicle.registrationNumber}</p>
                    
                    <div className="car-meta-row">
                      <div className="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>4 seats</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="selected-pill">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                        <span>Selected</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="vehicles-footer">
            <button
              className="add-car-footer-btn"
              onClick={() => navigate('/vehicles/new')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
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
