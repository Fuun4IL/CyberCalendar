import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";

const API_URL = "http://localhost:5000";

export default function App() {
    const [date, setDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [displayedEvents, setDisplayedEvents] = useState([]);
    const [token, setToken] = useState(localStorage.getItem("token") || "");
    const [username, setUsername] = useState(localStorage.getItem("username") || "");
    const [form, setForm] = useState({ username: "", password: "" });
    const [eventForm, setEventForm] = useState({ title: "", description: "" });
    const [showAll, setShowAll] = useState(true);

    // === Auth ===
    const login = async () => {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        });
        const data = await res.json();
        if (data.token) {
            setToken(data.token);
            setUsername(data.username);
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);
        }
    };

    const signup = async () => {
        if (form.username.length < 4) {
            alert("Username must be at least 4 characters long.");
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(form.password)) {
            alert("Password must be at least 8 characters long, with at least one capital letter and one number.");
            return;
        }

        const res = await fetch(`${API_URL}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form)
        });
        const data = await res.json();
        if (data.token) {
            setToken(data.token);
            setUsername(data.username);
            localStorage.setItem("token", data.token);
            localStorage.setItem("username", data.username);
        } else {
            alert(data.message); // show backend error (e.g., username taken)
        }
    };

    const signOut = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        setToken("");
        setUsername("");
        setEvents([]);
        setDisplayedEvents([]);
    };

    // === Events ===
    const fetchEvents = async () => {
        const res = await fetch(`${API_URL}/events`, {
            headers: { "Authorization": token }
        });
        const data = await res.json();
        setEvents(data);
        setDisplayedEvents(data); // initially show all
    };

    const addEvent = async () => {
        await fetch(`${API_URL}/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token
            },
            body: JSON.stringify({
                ...eventForm,
                date: date.toISOString().split("T")[0]
            })
        });
        fetchEvents();
    };

    // === Calendar features ===
    const onDayClick = (value) => {
        const clickedDate = value.toISOString().split("T")[0];
        const filtered = events.filter(ev => ev.date === clickedDate);
        setDisplayedEvents(filtered);
        setDate(value);
        setShowAll(false);
    };



    const showAllEvents = () => {
        setDisplayedEvents(events);
        setShowAll(true);
    };

    // Format YYYY-MM-DD or Date to DD-MM-YYYY
    const formatDate = (date) => {
        if (!date) return "";
        let d = typeof date === "string" ? new Date(date) : date;
        return d.toLocaleDateString("en-GB"); // gives DD/MM/YYYY
    };


    // Highlight event days
    const tileClassName = ({ date, view }) => {
        if (view === "month") {
            const dateStr = date.toISOString().split("T")[0];
            if (events.some(ev => ev.date === dateStr)) {
                return "event-day";
            }
        }
        return null;
    };


    useEffect(() => {
        if (token) fetchEvents();
    }, [token]);

    return (
        <div className="p-5">
            {!token ? (
                <div className="space-y-2">
                    <div>
                        <input
                            placeholder="Username"
                            onChange={e => setForm({ ...form, username: e.target.value })}
                            className="border p-1 rounded w-full"
                        />
                        <p className="text-sm text-gray-500">
                            Username must be at least 4 characters long.
                        </p>
                    </div>

                    <div>
                        <input
                            placeholder="Password"
                            type="password"
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            className="border p-1 rounded w-full"
                        />
                        <p className="text-sm text-gray-500">
                            Password must be at least 8 characters, with at least one capital letter and one number.
                        </p>
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={login}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                        >
                            Login
                        </button>

                        <button
                            onClick={signup}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-xl font-bold">Welcome, {username} 👋</h1>
                        <button onClick={signOut} className="bg-red-500 text-white px-3 py-1 rounded">
                            Sign Out
                        </button>
                    </div>

                    <Calendar 
                        value={date} 
                        onChange={setDate} 
                        onClickDay={onDayClick}
                        tileClassName={tileClassName}
                    />

                    <input placeholder="Event title" onChange={e => setEventForm({...eventForm, title: e.target.value})} />
                    <input placeholder="Description" onChange={e => setEventForm({...eventForm, description: e.target.value})} />
                    <button onClick={addEvent}>Add Event</button>

                    <h2 className="text-lg font-semibold mt-4">
                        {displayedEvents.length > 0 
                            ? (showAll 
                                ? "All Events" 
                                : `Events for ${formatDate(date)}`)
                            : (showAll 
                                ? "No events" 
                                : `No events for ${formatDate(date)}`)}
                    </h2>

                    {/* Show All Events button only when filtering by date */}
                    {!showAll && (
                    <button
                        onClick={showAllEvents}
                        className="mt-2 mb-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        Show All Events
                    </button>
                    )}

                    <ul>
                    {displayedEvents.map(ev => (
                        <li key={ev._id}>
                        <strong>{formatDate(ev.date)}</strong>: {ev.title} - {ev.description}
                        </li>
                    ))}
                    </ul>

                </div>
            )}
        </div>
    );
}
