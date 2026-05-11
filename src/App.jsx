import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Onboarding from './components/Onboarding';
import Dashboard from './pages/Dashboard';
import AddSubscription from './pages/AddSubscription';
import SubscriptionDetail from './pages/SubscriptionDetail';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem('onboardingComplete') === 'true'
  );

  useEffect(() => {
    const handler = () => setOnboardingDone(false);
    window.addEventListener('onboarding-reset', handler);
    return () => window.removeEventListener('onboarding-reset', handler);
  }, []);

  return (
    <div className="app-shell">
      {!onboardingDone && (
        <Onboarding onComplete={() => setOnboardingDone(true)} />
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/add" element={<AddSubscription />} />
        <Route path="/subscription/:id" element={<SubscriptionDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/statistics" element={<Statistics />} />
      </Routes>
    </div>
  );
}
