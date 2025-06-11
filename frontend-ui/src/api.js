const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function submitTrip(trip, token) {
    const res = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify(trip)
    });
    return res.json();
}

export async function getStatus(requestId) {
    const res = await fetch(`${API_URL}/status/${requestId}`);
    if (!res.ok) throw new Error("Status fetch failed");
    return res.json();
}

// Login API (form data)
export async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append("username", username.trim());
    formData.append("password", password.trim());

    const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
    });
    return res.json();
}


export async function signup(username, password) {
    const res = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: username.trim(),
            password: password.trim()
        })
    });
    return res.json();
}
