import React, { useState, useEffect } from 'react';
import { FaCalendarAlt } from 'react-icons/fa';
import './TodayBookingsCard.css';

const TodayBookingsCard = () => {
  const [bookingCount, setBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodayBookings = async () => {
      try {
        const response = await fetch('/api/bookings/today/count');
        const data = await response.json();
        setBookingCount(data.count);
      } catch (error) {
        console.error('Error fetching today\'s bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayBookings();
  }, []);

  return (
    <div className="today-bookings-card">
      <div className="card-header">
        <FaCalendarAlt className="calendar-icon" />
        <span className="card-label">Today's Bookings</span>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="booking-count">{bookingCount}</div>
        )}
      </div>
    </div>
  );
};

export default TodayBookingsCard;
