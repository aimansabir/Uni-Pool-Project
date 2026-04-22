import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import { validateVehicleForm, hasErrors } from '../../utils/validators';
import Input from '../../components/common/Input/Input';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
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
    registrationNumber: '',
    color: '',
    imageUrl: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      const fetchVehicle = async () => {
        try {
          const res = await vehiclesApi.getById(id);
          const v = res.data;
          setForm({
            ownerFullName: v.ownerFullName || '',
            make: v.make || '',
            model: v.model || '',
            registrationNumber: v.registrationNumber || '',
            color: v.color || '',
            imageUrl: v.imageUrl || '',
          });
        } catch (err) {
          showError('Failed to load vehicle.');
          navigate('/vehicles');
        } finally {
          setFetching(false);
        }
      };
      fetchVehicle();
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  // Faux native file upload using Base64 encoding
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({ ...prev, imageUrl: event.target.result }));
      if (errors.imageUrl) {
        setErrors((errs) => ({ ...errs, imageUrl: '' }));
      }
    };
    reader.onerror = () => {
      showError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateVehicleForm(form);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await vehiclesApi.update(id, form);
        showSuccess('Vehicle updated!');
      } else {
        await vehiclesApi.create(form);
        showSuccess('Vehicle added!');
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

  if (fetching) return <FullPageSpinner />;

  return (
    <div className="premium-vehicle-page fade-in">
      {/* Absolute Header Banner */}
      <div className="premium-vehicle-banner">
        <button 
          type="button" 
          className="premium-vehicle-banner__back" 
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="premium-vehicle-banner__title">Vehicle Details</h1>
      </div>

      {/* Main Form Content */}
      <div className="premium-vehicle-content">
        <form className="premium-form" onSubmit={handleSubmit}>
          
          <Input
            name="ownerFullName"
            placeholder="Owner Full Name"
            value={form.ownerFullName}
            onChange={handleChange}
            error={errors.ownerFullName}
            className="premium-input-box"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            }
          />

          <Input
            name="make"
            placeholder="Car Make"
            value={form.make}
            onChange={handleChange}
            error={errors.make}
            className="premium-input-box"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            }
          />

          <Input
            name="model"
            placeholder="Car Model"
            value={form.model}
            onChange={handleChange}
            error={errors.model}
            className="premium-input-box"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            }
          />

          <Input
            name="registrationNumber"
            placeholder="Car Registration Number"
            value={form.registrationNumber}
            onChange={handleChange}
            error={errors.registrationNumber}
            disabled={isEdit}
            className="premium-input-box"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                <circle cx="9" cy="10" r="2"></circle>
                <line x1="15" y1="8" x2="19" y2="8"></line>
                <line x1="15" y1="12" x2="19" y2="12"></line>
                <line x1="7" y1="16" x2="19" y2="16"></line>
              </svg>
            }
          />

          {/* Color Input - No Icon */}
          <Input
            name="color"
            placeholder="Car Color"
            value={form.color}
            onChange={handleChange}
            error={errors.color}
            className="premium-input-box premium-input-box--no-icon"
          />

          {/* Custom File Upload Box aligned with wireframe */}
          <div className="premium-upload-wrapper">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            <div 
              className={`premium-upload-box ${errors.imageUrl ? 'premium-upload-box--error' : ''}`}
              onClick={() => fileInputRef.current.click()}
            >
              <span className="premium-upload-box__text">
                {form.imageUrl && form.imageUrl.startsWith('data:image') 
                  ? 'Picture selected' 
                  : form.imageUrl 
                    ? 'Picture stored' 
                    : 'Upload Car Picture'}
              </span>
              <div className="premium-upload-box__icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="premium-submit-btn mt-md"
            disabled={loading}
          >
            {loading ? <div className="btn__spinner" style={{ margin: '0 auto' }}></div> : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
