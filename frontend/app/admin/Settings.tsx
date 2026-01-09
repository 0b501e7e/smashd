'use client';

import React, { useState } from 'react';
import { API_BASE_URL } from '../../lib/apiConstants'; // Import API_BASE_URL

export default function AdminSettings() {
  const [deliveryRadius, setDeliveryRadius] = useState<number>(5); // Default to 5 km
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings/delivery-radius`, { // Use API_BASE_URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header if your API requires it
        },
        body: JSON.stringify({ radius: deliveryRadius }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to save settings: ${response.statusText}`);
      }

      setSuccessMessage(result.message || 'Delivery radius saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save delivery radius. Please try again.');
      console.error('Failed to save settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
      <h2 className="text-2xl font-semibold mb-6 text-yellow-400">Restaurant Settings</h2>

      {error && <p className="mb-4 text-red-500 bg-red-900 p-3 rounded">{error}</p>}
      {successMessage && <p className="mb-4 text-green-400 bg-green-900 p-3 rounded">{successMessage}</p>}

      <div className="mb-6">
        <label htmlFor="deliveryRadius" className="block text-sm font-medium text-gray-300 mb-1">
          Delivery Radius (km)
        </label>
        <input
          type="number"
          id="deliveryRadius"
          name="deliveryRadius"
          value={deliveryRadius}
          onChange={(e) => setDeliveryRadius(parseFloat(e.target.value))}
          min="1"
          className="w-full md:w-1/3 bg-gray-700 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
          placeholder="Enter delivery radius in km"
        />
        <p className="text-xs text-gray-400 mt-1">Set the maximum distance for deliveries.</p>
      </div>

      {/* TODO: Add more settings here as needed, e.g., opening hours, contact info etc. */}

      <button
        onClick={handleSaveSettings}
        disabled={isLoading}
        className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded transition duration-150 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
} 