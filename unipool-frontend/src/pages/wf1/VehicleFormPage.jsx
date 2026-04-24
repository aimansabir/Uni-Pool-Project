import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import ConfirmDialog from '../../components/common/ConfirmDialog/ConfirmDialog';
import './VehicleFormPage.css';

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    ownerFullName: '',
    make: '',
    model: '',
    color: '',
    registrationNumber: '',
    imageUrl: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      fetchVehicle();
    }
  }, [id]);

  const fetchVehicle = async () => {
    try {
      const res = await vehiclesApi.getById(id);
      const data = res.data;
      
      // Normalize owner name field if backend uses a different naming convention
      const normalizedData = {
        ...data,
        ownerFullName: data.ownerFullName || data.ownerName || data.owner || ''
      };
      
      setForm(normalizedData);
    } catch (err) {
      showError('Failed to load vehicle details');
      navigate('/vehicles');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'registrationNumber') {
      newValue = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      if (/^[A-Z]+[0-9]+$/.test(newValue)) {
        newValue = newValue.replace(/^([A-Z]+)([0-9]+)$/, '$1-$2');
      } else if (/^[0-9]+[A-Z]+$/.test(newValue)) {
        newValue = newValue.replace(/^([0-9]+)([A-Z]+)$/, '$1-$2');
      }
    } 
    else if (['ownerFullName', 'make', 'model', 'color'].includes(name)) {
      // Title Case: Capitalize first letter of each word
      newValue = value.split(' ').map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
      }).join(' ');
    }

    setForm(f => ({ ...f, [name]: newValue }));
    if (errors[name]) setErrors(errs => ({ ...errs, [name]: '' }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, imageUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!form.imageUrl) {
      showError('Please upload a vehicle photo');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await vehiclesApi.update(id, form);
        showSuccess('Vehicle updated successfully!');
      } else {
        await vehiclesApi.create(form);
        showSuccess('Vehicle added successfully!');
      }
      navigate('/vehicles');
    } catch (err) {
      showError(err.message);
      const msg = err.message?.toLowerCase() || '';
      if (msg.includes('registration')) {
        setErrors({ registrationNumber: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const PRESET_COLORS = [
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Black', hex: '#000000' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Grey', hex: '#808080' },
    { name: 'Red', hex: '#EF4444' },
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Navy', hex: '#1E3A8A' },
  ];

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper to check if a string is a valid CSS color
  const isValidColor = (str) => {
    const s = new Option().style;
    s.color = str;
    return s.color !== '';
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await vehiclesApi.delete(id);
      showSuccess('Vehicle deleted successfully.');
      navigate('/vehicles');
    } catch (err) {
      showError(err.message || 'Failed to delete vehicle.');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  if (fetching) return <FullPageSpinner />;

  return (
    <div className="premium-vehicle-page fade-in">
      {/* ── Section Header ── */}
      <div className="vehicle-section-header">
        <h1 className="vehicle-section-title">
          {isEdit ? 'Edit Vehicle' : 'Vehicle Details'}
        </h1>
        <p className="vehicle-section-subtitle">
          {isEdit ? 'Update your vehicle information' : 'Enter your vehicle information below'}
        </p>
      </div>

      <div className="premium-vehicle-content">
        <form className="premium-form" onSubmit={handleSubmit}>
          
          {/* Owner Full Name */}
          <div className="field-group">
            <label className="field-label">Owner Full Name</label>
            <div className={`vehicle-input-card ${errors.ownerFullName ? 'error' : ''}`}>
              <div className="input-card__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFB946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <input
                name="ownerFullName"
                placeholder="Enter owner full name"
                value={form.ownerFullName}
                onChange={handleChange}
                className="input-card__field"
              />
            </div>
          </div>

          {/* Car Brand */}
          <div className="field-group">
            <label className="field-label">Car Brand</label>
            <div className={`vehicle-input-card ${errors.make ? 'error' : ''}`}>
              <div className="input-card__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFB946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"></path>
                  <circle cx="7" cy="17" r="2"></circle>
                  <path d="M9 17h6"></path>
                  <circle cx="17" cy="17" r="2"></circle>
                </svg>
              </div>
              <input
                name="make"
                placeholder="e.g. Toyota"
                value={form.make}
                onChange={handleChange}
                className="input-card__field"
              />
            </div>
          </div>

          {/* Car Model */}
          <div className="field-group">
            <label className="field-label">Car Model</label>
            <div className={`vehicle-input-card ${errors.model ? 'error' : ''}`}>
              <div className="input-card__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFB946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="10" width="18" height="10" rx="2" ry="2"></rect>
                  <path d="M7 10l2-6h6l2 6"></path>
                </svg>
              </div>
              <input
                name="model"
                placeholder="e.g. Corolla"
                value={form.model}
                onChange={handleChange}
                className="input-card__field"
              />
            </div>
          </div>

          {/* Registration Number */}
          <div className="field-group">
            <label className="field-label">Registration Number</label>
            <div className={`vehicle-input-card ${errors.registrationNumber ? 'error' : ''}`}>
              <div className="input-card__icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFB946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                  <path d="M7 10h10"></path>
                </svg>
              </div>
              <input
                name="registrationNumber"
                placeholder="e.g. ABC-123"
                value={form.registrationNumber}
                onChange={handleChange}
                className="input-card__field"
              />
            </div>
          </div>

          {/* Car Color */}
          <div className="field-group">
            <label className="field-label">Car Color</label>
            <div className="color-picker-relative-group">
              <div className={`vehicle-input-card ${errors.color ? 'error' : ''}`}>
                <div className="input-card__icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFB946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                  </svg>
                </div>
                <input
                  name="color"
                  placeholder="Select color"
                  value={form.color}
                  onChange={handleChange}
                  className="input-card__field"
                />
                <div className="color-preview-box" onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}>
                  <div 
                    className="color-dot" 
                    style={{ 
                      backgroundColor: isValidColor(form.color) ? form.color : '#E5E7EB',
                      boxShadow: form.color?.toLowerCase() === 'white' ? 'inset 0 0 0 1px #E5E7EB' : 'none'
                    }} 
                  />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isColorPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>

              {isColorPickerOpen && (
                <div className="color-dropdown-menu fade-in">
                  {PRESET_COLORS.map((c, i) => (
                    <button
                      key={`${c.name}-${i}`}
                      type="button"
                      className="color-option-btn"
                      onClick={() => {
                        setForm(f => ({ ...f, color: c.name }));
                        setIsColorPickerOpen(false);
                      }}
                    >
                      <div className="color-option-dot" style={{ backgroundColor: c.hex }} />
                      <span className="color-option-name">{c.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upload Section */}
          <div className={`vehicle-upload-card ${errors.imageUrl ? 'error' : ''}`}>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <div className="upload-card__content" onClick={() => fileInputRef.current.click()}>
              <div className="upload-card__icon-box">
                {form.imageUrl ? (
                  <img 
                    src={form.imageUrl} 
                    alt="Vehicle Preview" 
                    className="upload-preview-img"
                  />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFB946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.6-2-2.4-3.5-4.4-3.5h-1.2C15.5 4.8 12.5 3 9.5 3.1 6.5 3.3 4 5.9 4 9v1.1C2.3 11 1 12.7 1 14.7 1 17 2.8 18.9 5 19h11.2c2.2 0 4-1.8 4-4v0z"></path>
                    <polyline points="9 12 12 9 15 12"></polyline>
                    <line x1="12" y1="9" x2="12" y2="17"></line>
                  </svg>
                )}
              </div>
              <div className="upload-card__text-box">
                <span className="upload-card__title">
                  {form.imageUrl ? 'Vehicle Photo Uploaded' : 'Tap to upload vehicle photo'}
                </span>
                <span className="upload-card__subtitle">
                  {form.imageUrl ? 'Tap to change photo' : 'PNG, JPG up to 5 MB'}
                </span>
              </div>
            </div>
          </div>

          <div className="form-actions-stack">
            <button
              type="submit"
              className="vehicle-save-btn"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Vehicle'}
            </button>

            {isEdit && (
              <button
                type="button"
                className="vehicle-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
              >
                Delete Vehicle
              </button>
            )}
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Vehicle?"
        message="Are you sure you want to remove this vehicle? This action cannot be undone."
        confirmText="Delete"
        loading={loading}
      />
    </div>
  );
}
