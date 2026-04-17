import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vehiclesApi } from '../../api/vehicles.api';
import { useToast } from '../../context/ToastContext';
import { validateVehicleForm, hasErrors } from '../../utils/validators';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import { FullPageSpinner } from '../../components/common/Spinner/Spinner';
import './VehicleFormPage.css';

export default function VehicleFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState({
    make: '',
    model: '',
    color: '',
    registrationNumber: '',
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
            make: v.make || '',
            model: v.model || '',
            color: v.color || '',
            registrationNumber: v.registrationNumber || '',
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
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
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
    <div className="vehicle-form-page fade-in">
      <h2 className="vehicle-form-page__title">
        <span className="vehicle-form-page__back" onClick={() => navigate(-1)}>←</span>
        Vehicle Details
      </h2>

      <form className="vehicle-form" onSubmit={handleSubmit}>
        <Input
          name="make"
          label="Car Make"
          placeholder="e.g. Toyota"
          value={form.make}
          onChange={handleChange}
          error={errors.make}
          icon={<span>🏭</span>}
        />

        <Input
          name="model"
          label="Car Model"
          placeholder="e.g. Corolla"
          value={form.model}
          onChange={handleChange}
          error={errors.model}
          icon={<span>🚙</span>}
        />

        <Input
          name="registrationNumber"
          label="Car Registration Number"
          placeholder="e.g. ABC-1234"
          value={form.registrationNumber}
          onChange={handleChange}
          error={errors.registrationNumber}
          disabled={isEdit}
          icon={<span>🔢</span>}
        />

        <Input
          name="color"
          label="Car Color"
          placeholder="e.g. White"
          value={form.color}
          onChange={handleChange}
          error={errors.color}
          icon={<span>🎨</span>}
        />

        <Input
          name="imageUrl"
          label="Upload Car Picture (URL)"
          placeholder="https://example.com/car.jpg"
          value={form.imageUrl}
          onChange={handleChange}
          icon={<span>📷</span>}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          className="mt-md"
        >
          {isEdit ? 'Update' : 'Submit'}
        </Button>
      </form>
    </div>
  );
}
