import React, { useState } from 'react';
import TripPlannerPage from './pages/TripPlannerPage';
import LoginPage from './pages/LoginPage';

function App() {
    const [user, setUser] = useState(null);

    if (!user) {
        return <LoginPage setUser={setUser} />;
    }

    return <TripPlannerPage user={user} setUser={setUser} />;
}

export default App;
