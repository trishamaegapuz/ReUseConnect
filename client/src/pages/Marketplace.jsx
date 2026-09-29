import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/api';

const Marketplace = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="temporary-dashboard">
      <h1>ReUse Connect Marketplace</h1>

      <p>
        Welcome, {user?.first_name} {user?.last_name}
      </p>

      <p>
        Role: {user?.role}
      </p>

      <button onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
};

export default Marketplace;