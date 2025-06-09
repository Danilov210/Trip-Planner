const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function submitTrip(data) {
    const res = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function checkStatus(requestId) {
    const res = await fetch(`${API_URL}/status/${requestId}`);
    return res.json();
}
