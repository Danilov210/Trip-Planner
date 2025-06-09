import React, { useState } from "react";
import { submitTrip } from "./api";
import TaskPoller from "./components/TaskPoller";
import DayPlan from "./components/DayPlan";
import MapView from "./components/MapView";

function App() {
    const [tripData, setTripData] = useState(null);
    const [requestId, setRequestId] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const body = {
            destination: form.destination.value,
            dates: form.dates.value,
            interests: form.interests.value,
        };
        const res = await submitTrip(body);
        setRequestId(res.request_id);
    };

    return (
        <div>
            <h1>Trip Planner</h1>
            <form onSubmit={handleSubmit}>
                <input name="destination" placeholder="Destination" required />
                <input name="dates" placeholder="Dates" required />
                <input name="interests" placeholder="Interests" required />
                <button type="submit">Plan Trip</button>
            </form>

            {requestId && !tripData && <TaskPoller requestId={requestId} onResult={setTripData} />}
            {tripData && (
                <div>
                    <MapView coordinates={tripData.coordinates} />
                    {tripData.days.map((day, i) => (
                        <DayPlan key={i} day={day} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
