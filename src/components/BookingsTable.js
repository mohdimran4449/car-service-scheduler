import React, { useState, useEffect } from 'react';
import './BookingsTable.css';

const BookingsTable = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayBookings();
  }, []);

  const fetchTodayBookings = async () => {
    try {
      const response = await fetch('/api/bookings/today');
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (bookingId) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        await fetchTodayBookings();
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
    }
  };

  const handleReschedule = async (bookingId) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        await fetchTodayBookings();
      }
    } catch (error) {
      console.error('Error rescheduling booking:', error);
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        await fetchTodayBookings();
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
    }
  };

  if (loading) {
    return (
      <div className="bookings-table-container">
        <div className="loading">Loading bookings...</div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bookings-table-container">
        <div className="no-bookings">No bookings today</div>
      </div>
    );
  }

  return (
    <div className="bookings-table-container">
      <h3>Today's Service Bookings</h3>
      <table className="bookings-table">
        <thead>
          <tr>
            <th>Customer Name</th>
            <th>Phone Number</th>
            <th>Car Details</th>
            <th>Service Date/Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking._id}>
              <td>{booking.name}</td>
              <td>{booking.contactNumber}</td>
              <td>
                {booking.carDetails.make} {booking.carDetails.model} ({booking.carDetails.year})
              </td>
              <td>
                {new Date(booking.preferredTimeSlot).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                })}
              </td>
              <td>
                <span className={`status-badge status-${booking.status.toLowerCase()}`}>
                  {booking.status}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  {booking.status === 'pending' && (
                    <button
                      className="action-button btn-confirm"
                      onClick={() => handleConfirm(booking._id)}
                    >
                      Confirm
                    </button>
                  )}
                  {booking.status !== 'cancelled' && (
                    <button
                      className="action-button btn-reschedule"
                      onClick={() => handleReschedule(booking._id)}
                    >
                      Reschedule
                    </button>
                  )}
                  {booking.status !== 'cancelled' && (
                    <button
                      className="action-button btn-cancel"
                      onClick={() => handleCancel(booking._id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BookingsTable;
