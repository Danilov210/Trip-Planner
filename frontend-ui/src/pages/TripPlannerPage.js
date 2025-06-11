// src/pages/TripPlannerPage.js
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { submitTrip, getStatus, getHistory, findUserTrip } from '../api';
import { format } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './TripPlannerPage.css';

// fix default icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
    iconUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
    shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});

const INTEREST_OPTIONS = [
    "Nature",
    "Culture",
    "Food",
    "Adventure",
    "History",
    "Shopping"
];

export default function TripPlannerPage({ user, setUser }) {
    // form state
    const [showInterestDropdown, setShowInterestDropdown] = useState(false);
    const [showTrips, setShowTrips] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const today = new Date();
    const [startLocation, setStartLocation] = useState('');
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [interests, setInterests] = useState('');
    const [requestId, setRequestId] = useState(null);
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedInterests, setSelectedInterests] = useState([]);
    const interestRef = useRef();
    const [open, setOpen] = useState(false);
    const ref = useRef();
    const [history, setHistory] = useState([]);

    // poll for status
    useEffect(() => {
        if (!requestId) return;
        setLoading(true);
        const interval = setInterval(async () => {
            try {
                const res = await getStatus(requestId);
                console.log("Polling getStatus response:", res);
                if (res.status === 'done' || res.days) {
                    clearInterval(interval);
                    setPlan(res);
                    setLoading(false);
                    // Fetch history now, after trip is saved
                    const historyData = await getHistory(user.token);
                    setHistory(historyData.history || []);
                }
            } catch (e) {
                clearInterval(interval);
                setLoading(false);
                alert("Failed to fetch trip status. Please try again.");
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [requestId]);

    // Close dropdown if clicked outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (interestRef.current && !interestRef.current.contains(event.target)) {
                setShowInterestDropdown(false);
            }
        }
        if (showInterestDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showInterestDropdown]);

    // Fetch history on mount or when user changes
    useEffect(() => {
        if (user?.token) {
            getHistory(user.token).then(data => {
                setHistory(data.history || []);
            });
        }
    }, [user]);

    function toggleDarkMode() {
        setDarkMode((prev) => !prev);
        document.body.classList.toggle('dark-mode', !darkMode);
    }
    function handleSubmit(e) {
        e.preventDefault();
        const list = selectedInterests;
        const formattedStart = startDate ? format(startDate, "yyyy-MM-dd") : "";
        const formattedEnd = endDate ? format(endDate, "yyyy-MM-dd") : "";
        setLoading(true);
        submitTrip({
            start_location: startLocation,
            start_date: formattedStart,
            end_date: formattedEnd,
            interests: list,
        }, user.token).then(async (res) => {
            console.log("submitTrip response:", res); // <-- Add this line

            if (res.status === "done" && res.trip) {
                // Trip already exists, show it immediately
                setPlan(res.trip);
                setLoading(false);
                // Refresh history
                const historyData = await getHistory(user.token);
                setHistory(historyData.history || []);
            } else if (res.status === "submitted" && res.request_id) {
                setRequestId(res.request_id);
                // The polling effect will handle plan/history update
            } else {
                setLoading(false);
                // Optionally show an error
            }
        });
    }

    function formatDisplayDate(date) {
        if (!date) return "—";
        try {
            return format(new Date(date), "d MMM yyyy");
        } catch {
            return date;
        }
    }
    // map center: if we have days, center first day's coord; else world view
    const center = plan?.days?.[0]?.coords
        ? [plan.days[0].coords.lat, plan.days[0].coords.lng]
        : [20, 0]; // lat,lng for a “world” view

    return (
        <div className={`tp-container${darkMode ? " dark-mode" : ""}`}>
            <div
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1em"
                }}
            >
                {/* Left: User + My Trips */}
                <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                        style={{
                            padding: "0.5em 1.5em",
                            borderRadius: "24px",
                            border: darkMode ? "2px solid #fff" : "2px solid #23272f",
                            background: darkMode ? "#23272f" : "#f4f8ff",
                            color: darkMode ? "#fff" : "#23272f",
                            cursor: "pointer",
                            fontWeight: "bold",
                            fontSize: "1.1em",
                            boxShadow: darkMode
                                ? "0 0 8px 2px #4f8cff55"
                                : "0 2px 8px rgba(79,140,255,0.15)",
                            marginRight: "0.5em"
                        }}
                        disabled
                    >
                        {user ? user.name : "User"}
                    </button>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", position: "relative" }}>
                        <button
                            style={{
                                padding: "0.5em 1.5em",
                                borderRadius: "24px",
                                border: darkMode ? "2px solid #fff" : "2px solid #23272f",
                                background: darkMode ? "#23272f" : "#f4f8ff",
                                color: darkMode ? "#fff" : "#23272f",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "1.1em",
                                boxShadow: darkMode
                                    ? "0 0 8px 2px #4f8cff55"
                                    : "0 2px 8px rgba(79,140,255,0.15)"
                            }}
                            onClick={() => setShowTrips((v) => !v)}
                        >
                            My Trips
                        </button>
                        {showTrips && (
                            <div style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                marginTop: "0.5em",
                                minWidth: 250,
                                background: darkMode ? "#23272f" : "#fff",
                                border: "1px solid #4f8cff",
                                borderRadius: "12px",
                                boxShadow: "0 2px 8px rgba(79,140,255,0.10)",
                                padding: "1em",
                                zIndex: 10
                            }}>
                                <table style={{ width: "100%", color: darkMode ? "#fff" : "#23272f" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ textAlign: "left" }}>Country</th>
                                            <th style={{ textAlign: "left" }}>Dates</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((trip, idx) => (
                                            <tr
                                                key={trip.trip_id || idx}
                                                style={{ cursor: "pointer" }}
                                                onClick={async () => {
                                                    setLoading(true);
                                                    try {
                                                        const req = {
                                                            start_location: trip.destination,
                                                            start_date: trip.start_date,
                                                            end_date: trip.end_date,
                                                            interests: trip.interests,
                                                        };
                                                        const res = await findUserTrip(req, user.token);
                                                        setPlan(res.raw_plan);
                                                    } catch (e) {
                                                        alert("Could not load trip details.");
                                                    }
                                                    setLoading(false);
                                                }}
                                            >
                                                <td>{trip.destination}</td>
                                                <td>
                                                    {formatDisplayDate(trip.start_date)}
                                                    {trip.end_date ? <>–{formatDisplayDate(trip.end_date)}</> : ""}
                                                </td>
                                                <td>{trip.interests && trip.interests.join(", ")}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                {/* Right: Dark Mode */}
                <button
                    onClick={toggleDarkMode}
                    style={{
                        padding: "0.5em 1.5em",
                        borderRadius: "24px",
                        border: darkMode ? "2px solid #fff" : "2px solid #23272f",
                        background: darkMode ? "#23272f" : "#f4f8ff",
                        color: darkMode ? "#fff" : "#23272f",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "1.1em",
                        boxShadow: darkMode
                            ? "0 0 8px 2px #4f8cff55"
                            : "0 2px 8px rgba(79,140,255,0.15)"
                    }}
                >
                    {darkMode ? "Light Mode" : "Dark Mode"}
                </button>
            </div>
            {/* Trip Planner Title */}
            <h1 className="tp-header-title">
                Trip Planner
                <span className="plane-icon" role="img" aria-label="plane">✈️</span>
            </h1>
            {/* header bar shows your inputs once submitted */}
            {requestId && (
                <div className="tp-header">
                    <span>📍 {startLocation}</span>
                    <span>
                        📅 {formatDisplayDate(startDate)}
                        {endDate ? <>&nbsp;–&nbsp;{formatDisplayDate(endDate)}</> : ""}
                    </span>
                    <span>🎯 {interests || '—'}</span>
                </div>
            )}

            {/* the form overlay */}
            {!requestId && (
                <form className={`tp-form${darkMode ? " dark-mode" : ""}`} onSubmit={handleSubmit}>
                    <label>
                        📍 Where are you going?
                        <input
                            type="text"
                            value={startLocation}
                            onChange={(e) => setStartLocation(e.target.value)}
                            placeholder="e.g. Israel"
                            required
                        />
                    </label>
                    <label>
                        📅 When is your trip?
                        <DatePicker
                            selectsRange
                            startDate={startDate}
                            endDate={endDate}
                            onChange={(update) => {
                                setDateRange(update);
                                if (update[0] && update[1]) {
                                    setTimeout(() => document.activeElement.blur(), 0); // closes calendar after 2nd date
                                }
                            }}
                            shouldCloseOnSelect={true}
                            isClearable={true}
                            required
                            placeholderText="Select trip dates"
                            dateFormat="dd-MM"
                            minDate={today}
                            withPortal
                        />
                    </label>
                    <div style={{ position: "relative", width: "100%" }}>
                        {/* Field label */}
                        <label
                            style={{
                                display: "block",
                                marginBottom: "0.5em",
                                fontSize: "1em",
                            }}
                        >
                            🎯 What are you into?
                        </label>

                        {/* The “input‐looking” div you click to open/close */}
                        <div
                            ref={interestRef}
                            onClick={e => {
                                if (e.target === e.currentTarget) setShowInterestDropdown(v => !v);
                            }}
                            tabIndex={0}
                            style={{
                                width: "100%",
                                height: "40px",
                                borderRadius: "8px",
                                border: "1px solid #ccc",
                                padding: "0 0.75em",
                                fontSize: "1em",
                                background: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                boxSizing: "border-box",
                                color: selectedInterests.length === 0 ? "#888" : "#23272f",
                            }}
                        >
                            {selectedInterests.length === 0
                                ? <span style={{ color: "#888" }}>Select your interests</span>
                                : selectedInterests.join(", ")}
                            <span style={{ marginLeft: "auto", color: "#bbb" }}>▼</span>
                        </div>

                        {/* The dropdown itself */}
                        {showInterestDropdown && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    width: "100%",
                                    background: "#fff",
                                    border: "1px solid #4f8cff",
                                    borderRadius: "8px",
                                    boxShadow: "0 2px 8px rgba(79,140,255,0.10)",
                                    zIndex: 20,
                                    marginTop: "0.25em",
                                    padding: "0.5em 0",
                                }}
                                onClick={e => e.stopPropagation()} // prevent clicks here from closing
                            >
                                {INTEREST_OPTIONS.map(option => {
                                    const id = `interest-${option}`;
                                    return (
                                        <div
                                            key={option}
                                            style={{
                                                display: "flex",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                padding: "0.25em 1em",
                                                gap: "0.5em",
                                                cursor:
                                                    selectedInterests.length === 6 && !selectedInterests.includes(option)
                                                        ? "not-allowed"
                                                        : "pointer",
                                            }}
                                        >
                                            {/* actual checkbox */}
                                            <input
                                                id={id}
                                                type="checkbox"
                                                checked={selectedInterests.includes(option)}
                                                disabled={
                                                    selectedInterests.length === 6 && !selectedInterests.includes(option)
                                                }
                                                onChange={e => {
                                                    if (e.target.checked) {
                                                        setSelectedInterests(prev =>
                                                            prev.length < 6 ? [...prev, option] : prev
                                                        );
                                                    } else {
                                                        setSelectedInterests(prev =>
                                                            prev.filter(i => i !== option)
                                                        );
                                                    }
                                                }}
                                                style={{
                                                    margin: 0,
                                                    marginRight: "0.5em",
                                                }}
                                            />
                                            {/* label linked to checkbox */}
                                            <label
                                                htmlFor={id}
                                                style={{ userSelect: "none" }}
                                            >
                                                {option}
                                            </label>
                                        </div>
                                    );
                                })}
                                {selectedInterests.length === 6 && (
                                    <div style={{ color: "#4f8cff", fontSize: "0.95em", padding: "0.5em 1em" }}>
                                        You can select up to 6 interests.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button type="submit" className="tp-search-btn">Search</button>
                </form>
            )}

            {/* leaflet map */}
            <div className="tp-map-wrapper">
                <MapContainer
                    center={center}
                    zoom={plan ? 12 : 2}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://osm.org/">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {plan?.days?.map((d, i) => (
                        <Marker
                            key={i}
                            position={[d.coords.lat, d.coords.lng]}
                        >
                            <Popup>
                                <strong>Day {i + 1}</strong><br />
                                {d.description}
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* loading overlay */}
                {loading && (
                    <div className="tp-loading-overlay">
                        <div className="tp-spinner" />
                    </div>
                )}
            </div>


            {/* schedule & images */}
            {
                plan?.days && (
                    <div className="tp-schedule">
                        {plan.days.map((day, i) => (
                            <div key={i} className="tp-day">
                                <h2>Day {i + 1}</h2>
                                <img src={day.image_url} alt={`Day ${i + 1}`} />
                                <p>{day.description}</p>
                            </div>
                        ))}
                    </div>
                )
            }
            {plan && (
                <div>
                    <h2>Trip Plan</h2>
                    {/* Render your plan details here, for example: */}
                    <pre>{JSON.stringify(plan, null, 2)}</pre>
                </div>
            )}
        </div >
    );
}
