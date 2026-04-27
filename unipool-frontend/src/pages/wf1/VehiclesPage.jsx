import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import EmptyState from '../../components/common/EmptyState/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import hondaCivic from '../../assets/images/honda_civic.png';
import toyotaCorolla from '../../assets/images/toyota_corolla.png';
import noVehiclesIllustration from '../../assets/images/no_vehicles_illustration.png';
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
          icon={
            <div className="empty-state__icon-wrapper">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 13.1V16c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" />
              </svg>
            </div>
          }
          title="No vehicles yet"
          description="Add your first vehicle to start offering rides and sharing journeys."
          action={
            <button className="add-car-footer-btn" onClick={() => navigate('/vehicles/new')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Your First Car
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
                      <div className="header-actions">
                        {isSelected && (
                          <div className="selection-check active">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="car-sub-details">{vehicle.color} • {vehicle.registrationNumber}</p>

                    <div className="car-meta-row">
                      <div className="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        <span>4 seats</span>
                      </div>
                      <div className="meta-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span>Insured</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="selected-pill">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                        <span>Selected</span>
                      </div>
                    )}
                  </div>

                  <div className="selection-edit-btn" onClick={(e) => handleEditClick(e, vId)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
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
