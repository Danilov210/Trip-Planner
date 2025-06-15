// src/pages/TripPlannerPage.js
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { submitTrip, getStatus, getHistory, findUserTrip } from '../api';
import { Polyline, useMap } from 'react-leaflet';
import polyline from '@mapbox/polyline';
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
    const [openDay, setOpenDay] = useState(null);
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

    function FitBoundsToPolyline({ points }) {
        const map = useMap();
        useEffect(() => {
            if (points.length > 0) {
                const latLngs = points.map(([lat, lng]) => L.latLng(lat, lng));
                const bounds = L.latLngBounds(latLngs);
                map.fitBounds(bounds);
            }
        }, [points]);
        return null;
    }


    useEffect(() => {
        if (plan?.google_route?.routes?.[0]) {
            const route = plan.google_route.routes[0];
            console.log("🧭 Overview polyline:", route.overview_polyline);
            console.log("🪜 Steps polylines:");
            route.legs?.[0]?.steps?.forEach((step, i) => {
                console.log(`Step ${i + 1}:`, step.polyline?.points);
            });
        }
    }, [plan]);

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
    // accept either `coords` or old‐style `coordinates`
    const validDays = plan?.days?.filter(d => {
        const c = d.coords || d.coordinates;
        return c && c.lat != null;
    }) || [];


    // center on the first valid day (or fallback to world view)
    const center = validDays.length > 0
        ? [
            (validDays[0].coords || validDays[0].coordinates).lat,
            (validDays[0].coords || validDays[0].coordinates).lng
        ]
        : [20, 0];

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
                            open={calendarOpen}
                            onClickOutside={() => setCalendarOpen(true)}
                            onSelect={() => {
                                // every selection moment: if both are chosen, close
                                if (startDate && endDate) {
                                    setCalendarOpen(false);
                                }
                            }}
                            onChange={(update) => {
                                setDateRange(update);
                                const [start, end] = update;
                                // once both dates are set, close the calendar
                                if (start && end) {
                                    setCalendarOpen(false);
                                }
                            }}
                            placeholderText="Select trip dates"
                            dateFormat="dd-MM"
                            minDate={today}
                            isClearable
                            withPortal
                            onInputClick={() => setCalendarOpen(true)}
                        />
                    </label>
                    <label ref={interestRef} style={{ display: "block", width: "100%" }}>
                        🎯 What are you into?
                        <div style={{ display: "flex", justifyContent: "flex-start" }}>
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTimeout(() => setShowInterestDropdown(v => !v), 0);
                                }}
                                style={{
                                    width: "100%", // ✅ Make this match exactly your desired visual width
                                    maxWidth: "300px", // ✅ Add max width to contain it visually
                                    height: "35px",
                                    borderRadius: "8px",
                                    border: "1px solid #ccc",
                                    padding: "0 .75em",
                                    display: "flex",
                                    alignItems: "center",
                                    marginTop: "0.5em",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    background: darkMode ? "#23272f" : "#fff",
                                    color:
                                        selectedInterests.length === 0
                                            ? "#888"
                                            : darkMode
                                                ? "#fff"
                                                : "#23272f",
                                }}
                            >
                                {selectedInterests.length
                                    ? selectedInterests.join(", ")
                                    : "Select your interests"}
                                <span style={{ marginLeft: "auto" }}>▼</span>
                            </div>
                        </div>

                        {showInterestDropdown && (
                            <div
                                style={{
                                    position: "absolute",
                                    width: "21%",
                                    background: darkMode ? "#23272f" : "#fff",
                                    border: "1px solid #4f8cff",
                                    borderRadius: "8px",
                                    boxShadow: "0 2px 8px rgba(79,140,255,0.1)",
                                    zIndex: 20,
                                    marginTop: ".25em",
                                    padding: ".5em 0",
                                }}
                            >
                                {INTEREST_OPTIONS.map(option => {
                                    const id = `interest-${option}`;
                                    const isChecked = selectedInterests.includes(option);
                                    const isDisabled = selectedInterests.length === 6 && !isChecked;

                                    const handleToggle = () => {
                                        if (isDisabled) return;
                                        if (isChecked) {
                                            setSelectedInterests(selectedInterests.filter(i => i !== option));
                                        } else {
                                            setSelectedInterests([...selectedInterests, option]);
                                        }
                                    };

                                    return (
                                        <div
                                            key={option}
                                            style={{
                                                display: "flex",
                                                flexDirection: "row",
                                                alignItems: "center",
                                                padding: "0.25em 1em",
                                                gap: "0.5em",
                                                cursor: isDisabled ? "not-allowed" : "pointer",
                                                backgroundColor: isChecked ? (darkMode ? "#3a3f4a" : "#f0f8ff") : "transparent",
                                                transition: "background-color 0.2s ease",
                                            }}
                                        >
                                            <input
                                                id={id}
                                                type="checkbox"
                                                checked={isChecked}
                                                disabled={isDisabled}
                                                onChange={handleToggle}
                                                style={{
                                                    margin: 0,
                                                    cursor: isDisabled ? "not-allowed" : "pointer"
                                                }}
                                            />
                                            <label
                                                htmlFor={id}
                                                style={{
                                                    userSelect: "none",
                                                    cursor: isDisabled ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                {option}
                                            </label>
                                        </div>
                                    );
                                })}

                                {selectedInterests.length === 6 && (
                                    <div
                                        style={{
                                            color: "#4f8cff",
                                            fontSize: ".95em",
                                            padding: ".5em 1em",
                                        }}
                                    >
                                        You can select up to 6 interests.
                                    </div>
                                )}
                            </div>
                        )}
                    </label>


                    <button type="submit" className="tp-search-btn">Search</button>
                </form>
            )}

            {/* leaflet map */}
            <div className="tp-map-wrapper">
                <MapContainer center={center} zoom={plan ? 12 : 2} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://osm.org/">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {plan?.days?.reduce((markers, day, dayIdx) => {
                        ['morning', 'noon', 'evening'].forEach(slot => {
                            const point = day[slot];
                            if (point?.coords) {
                                markers.push(
                                    <Marker
                                        key={`day-${dayIdx}-${slot}`}
                                        position={[point.coords.lat, point.coords.lng]}
                                    >
                                        <Popup>
                                            <strong>Day {dayIdx + 1} ({slot})</strong><br />
                                            {point.place_name}<br />
                                            {point.description}
                                        </Popup>
                                    </Marker>
                                );
                            }
                        });
                        return markers;
                    }, [])}

                    {/* ✅ Big red trip route */}
                    {plan?.google_route?.routes?.[0] && (() => {
                        // collect _all_ steps from every leg
                        const legs = plan.google_route.routes[0].legs || [];
                        const allSteps = legs.flatMap(leg => leg.steps || []);
                        const decoded = allSteps.flatMap(step =>
                            polyline.decode(step.polyline.points)
                        );

                        if (decoded.length > 1) {
                            return (
                                <>
                                    <Polyline
                                        positions={decoded}
                                        pathOptions={{
                                            color: 'red',
                                            weight: 8,
                                            opacity: 0.9,
                                        }}
                                    />
                                    <FitBoundsToPolyline points={decoded} />
                                </>
                            );
                        }
                        return null;
                    })()}

                </MapContainer>

                {/* loading overlay */}
                {loading && (
                    <div className="tp-loading-overlay">
                        <div className="tp-spinner" />
                    </div>
                )}
            </div>


            {/* schedule & images */}
            {/* day cards */}
            <div className="tp-day-cards">
                {(plan?.days || []).map((day, i) => {
                    const isOpen = openDay === i;

                    // find the first slot in ["morning","noon","evening"] that has an image
                    const previewSlotName = ["morning", "noon", "evening"].find(
                        slot => day[slot]?.image_url
                    );
                    const preview = previewSlotName && day[previewSlotName];

                    return (
                        <div
                            key={i}
                            className={`tp-day-card${isOpen ? " open" : ""}`}
                            onClick={() => setOpenDay(isOpen ? null : i)}
                        >
                            <header className="tp-day-card-header">
                                <h2>Day {i + 1}</h2>
                                <span>{isOpen ? "▲" : "▼"}</span>
                            </header>

                            {isOpen ? (
                                <div className="tp-day-card-body">
                                    {["morning", "noon", "evening"].map(slot => {
                                        const point = day[slot];
                                        if (!point) return null;
                                        return (
                                            <div key={slot} className="tp-day-slot">
                                                <h3>{slot[0].toUpperCase() + slot.slice(1)}</h3>
                                                {point.image_url ? (
                                                    <img
                                                        src={point.image_url}
                                                        alt={point.description}
                                                        style={{ maxWidth: "100%", height: "auto" }}
                                                    />
                                                ) : (
                                                    <p><em>No image</em></p>
                                                )}
                                                <p>{point.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="tp-day-card-preview">
                                    {preview ? (
                                        <>
                                            <img
                                                src={preview.image_url}
                                                alt={preview.description}
                                                style={{ maxWidth: "100%", height: "auto" }}
                                            />
                                            <p>{preview.description}</p>
                                        </>
                                    ) : (
                                        <div className="tp-no-image">No image</div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div >
    );
}
