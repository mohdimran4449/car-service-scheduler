import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './WeeklyBookingsChart.css';
import { format } from 'date-fns';

const WeeklyBookingsChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWeeklyBookings();
  }, []);

  const fetchWeeklyBookings = async () => {
    try {
      const response = await fetch('/api/bookings/stats/weekly');
      const result = await response.json();

      if (response.ok) {
        setData(result.map(item => ({
          date: format(new Date(item.date), 'MMM d'),
          bookings: item.count
        })));
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="weekly-bookings-chart-container">
        <div className="chart-title">Weekly Bookings</div>
        <div className="loading">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="weekly-bookings-chart-container">
        <div className="chart-title">Weekly Bookings</div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="weekly-bookings-chart-container">
      <div className="chart-title">Weekly Bookings</div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="bookings"
            stroke="#007bff"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyBookingsChart;
