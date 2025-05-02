import React, { useState } from 'react';
import './BookingForm.css';
import { format } from 'date-fns';

const BookingForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    contactNumber: '',
    carMake: '',
    carModel: '',
    carYear: '',
    preferredDate: '',
    preferredTime: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: '',
    text: ''
  });

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.carMake.trim()) {
      newErrors.carMake = 'Car make is required';
    }

    if (!formData.carModel.trim()) {
      newErrors.carModel = 'Car model is required';
    }

    if (!formData.carYear.trim()) {
      newErrors.carYear = 'Car year is required';
    } else if (!/^[0-9]{4}$/.test(formData.carYear)) {
      newErrors.carYear = 'Please enter a valid 4-digit year';
    }

    if (!formData.preferredDate) {
      newErrors.preferredDate = 'Please select a date';
    }

    if (!formData.preferredTime) {
      newErrors.preferredTime = 'Please select a time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          preferredTimeSlot: new Date(
            formData.preferredDate + 'T' + formData.preferredTime + ':00'
          ).toISOString()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Booking created successfully! We will contact you soon to confirm the details.'
        });
        setFormData({
          name: '',
          contactNumber: '',
          carMake: '',
          carModel: '',
          carYear: '',
          preferredDate: '',
          preferredTime: '',
        });
        setErrors({});
      } else {
        throw new Error(data.error || 'Failed to create booking');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-form-container">
      <h2>Book a Car Service Appointment</h2>
      
      {message.text && (
        <div className={`${message.type}-message`}>
          {message.text}
        </div>
      )}

      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="section-title">Personal Information</div>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contactNumber">Phone Number</label>
            <input
              type="tel"
              id="contactNumber"
              name="contactNumber"
              className="form-input"
              value={formData.contactNumber}
              onChange={handleChange}
              placeholder="Enter your phone number"
            />
            {errors.contactNumber && <div className="form-error">{errors.contactNumber}</div>}
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">Car Information</div>
          <div className="form-group">
            <label className="form-label" htmlFor="carMake">Car Make</label>
            <input
              type="text"
              id="carMake"
              name="carMake"
              className="form-input"
              value={formData.carMake}
              onChange={handleChange}
              placeholder="Enter car make (e.g., Honda, Toyota)"
            />
            {errors.carMake && <div className="form-error">{errors.carMake}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="carModel">Car Model</label>
            <input
              type="text"
              id="carModel"
              name="carModel"
              className="form-input"
              value={formData.carModel}
              onChange={handleChange}
              placeholder="Enter car model (e.g., City, Corolla)"
            />
            {errors.carModel && <div className="form-error">{errors.carModel}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="carYear">Car Year</label>
            <input
              type="text"
              id="carYear"
              name="carYear"
              className="form-input"
              value={formData.carYear}
              onChange={handleChange}
              placeholder="Enter car year (e.g., 2022)"
            />
            {errors.carYear && <div className="form-error">{errors.carYear}</div>}
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">Preferred Service Time</div>
          <div className="form-group">
            <label className="form-label" htmlFor="preferredDate">Date</label>
            <input
              type="date"
              id="preferredDate"
              name="preferredDate"
              className="form-input"
              value={formData.preferredDate}
              onChange={handleChange}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.preferredDate && <div className="form-error">{errors.preferredDate}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="preferredTime">Time</label>
            <select
              id="preferredTime"
              name="preferredTime"
              className="form-select"
              value={formData.preferredTime}
              onChange={handleChange}
            >
              <option value="">Select time</option>
              <option value="09:00">09:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="13:00">01:00 PM</option>
              <option value="14:00">02:00 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="16:00">04:00 PM</option>
              <option value="17:00">05:00 PM</option>
            </select>
            {errors.preferredTime && <div className="form-error">{errors.preferredTime}</div>}
          </div>
        </div>

        <button
          type="submit"
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
};

export default BookingForm;
