import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL as API_BASE } from '../../../services/api';

const API_URL = API_BASE;

export const useUserProfile = () => {
  const [userProfile, setUserProfile] = useState(null);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Profile data loaded:', response.data.data);
      setUserProfile(response.data.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  return { userProfile, fetchUserProfile };
};
