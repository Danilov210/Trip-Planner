import React, { useState } from "react";
import './LoginPage.css';
import { login, signup, submitTrip } from "../api"; // <-- import your API functions

export default function LoginPage({ setUser }) {
    const [formType, setFormType] = useState(null); // null, "login", or "signup"
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // Helper to reset all fields
    function resetFormFields() {
        setUsername("");
        setPassword("");
        setError("");
    }

    function handleLoginSubmit(e) {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError("Please enter both username and password.");
            return;
        }
        login(username, password)
            .then(data => {
                if (data.status === "success") {
                    setError("");
                    setUser({ name: username.trim(), token: data.access_token });
                } else {
                    setError(data.message || "Login failed.");
                }
            })
            .catch(() => setError("Network error. Please try again."));
    }

    async function handleSignUpSubmit(e) {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError("Please fill in all fields.");
            return;
        }
        try {
            const data = await signup(username, password);
            if (data.status === "success") {
                resetFormFields();
                setFormType("login"); // Go to login page after sign up
            } else {
                setError(data.message || "Sign up failed.");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        }
    }

    // Welcome screen
    if (!formType) {
        return (
            <div className="lp-container">
                <h1 className="lp-header">
                    Trip Planner{" "}
                    <span role="img" aria-label="plane" style={{ fontSize: "1.2em" }}>✈️</span>
                </h1>
                <div className="lp-subtext">
                    Please Log in or Sign up
                </div>
                <div className="lp-btn-row">
                    <button
                        onClick={() => {
                            resetFormFields();
                            setFormType("login");
                        }}
                        className="lp-btn lp-btn-login"
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => {
                            resetFormFields();
                            setFormType("signup");
                        }}
                        className="lp-btn lp-btn-signup"
                    >
                        Sign Up
                    </button>
                </div>
            </div>
        );
    }

    // Login form
    if (formType === "login") {
        return (
            <div className="lp-container">
                <h1 className="lp-header">
                    Trip Planner{" "}
                    <span role="img" aria-label="plane" style={{ fontSize: "1.2em" }}>✈️</span>
                </h1>
                <form onSubmit={handleLoginSubmit} className="lp-form">
                    <h2 className="lp-form-title">Log In</h2>
                    <label className="lp-label">
                        Username:
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="lp-input"
                            placeholder="Enter your username"
                            autoFocus
                        />
                    </label>
                    <label className="lp-label">
                        Password:
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="lp-input"
                            placeholder="Enter your password"
                        />
                    </label>
                    {error && (
                        <div className="lp-error">{error}</div>
                    )}
                    <button
                        type="submit"
                        className="lp-submit-btn lp-submit-login"
                    >
                        Log In
                    </button>
                    <div className="lp-switch-text">
                        Don't have an account?{" "}
                        <button
                            type="button"
                            className="lp-link-btn"
                            onClick={() => {
                                resetFormFields();
                                setFormType("signup");
                            }}
                        >
                            Sign up
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    // Sign Up form
    if (formType === "signup") {
        return (
            <div className="lp-container">
                <h1 className="lp-header">
                    Trip Planner{" "}
                    <span role="img" aria-label="plane" style={{ fontSize: "1.2em" }}>✈️</span>
                </h1>
                <form onSubmit={handleSignUpSubmit} className="lp-form">
                    <h2 className="lp-form-title">Sign Up</h2>
                    <label className="lp-label">
                        Username:
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="lp-input"
                            placeholder="Enter your username"
                            autoFocus
                        />
                    </label>
                    <label className="lp-label">
                        Password:
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="lp-input"
                            placeholder="Enter your password"
                        />
                    </label>
                    {error && (
                        <div className="lp-error">{error}</div>
                    )}
                    <button
                        type="submit"
                        className="lp-submit-btn lp-submit-signup"
                    >
                        Sign Up
                    </button>
                    <div className="lp-switch-text">
                        Already have an account?{" "}
                        <button
                            type="button"
                            className="lp-link-btn"
                            onClick={() => {
                                resetFormFields();
                                setFormType("login");
                            }}
                        >
                            Log in
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return null;
}
