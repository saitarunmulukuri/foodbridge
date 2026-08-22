/**
 * Logo.jsx — Reusable FoodBridge Logo component with role-aware smart navigation.
 * Click destination:
 * - Logged out: /login
 * - DONOR: /donor
 * - NGO: /ngo
 * - VOLUNTEER: /volunteer
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UtensilsCrossed } from 'lucide-react';
import './Logo.css';

export const Logo = ({ className = '', showText = true, size = 'default' }) => {
  const { isAuthenticated, role } = useAuth();

  const getDestination = () => {
    if (!isAuthenticated) return '/login';
    switch (role) {
      case 'DONOR':     return '/donor';
      case 'NGO':       return '/ngo';
      case 'VOLUNTEER': return '/volunteer';
      default:          return '/login';
    }
  };

  const to = getDestination();

  return (
    <Link to={to} className={`fb-logo ${size} ${className}`} aria-label="FoodBridge Home">
      <div className="fb-logo-icon">
        <UtensilsCrossed size={16} strokeWidth={2.4} />
      </div>
      {showText && <span className="fb-logo-text">FoodBridge</span>}
    </Link>
  );
};

export default Logo;
