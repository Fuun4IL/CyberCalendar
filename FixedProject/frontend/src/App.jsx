import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./App.css";

const API_URL = "http://localhost:5000";

export default function App() {
    const [date, setDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [displayedEvents, setDisplayedEvents] = useState([]);
    const [username, setUsername] = useState("");
    const [form, setForm] = useState({ username: "", password: "" });
    const [eventForm, setEventForm] = useState({ title: "", description: "" });
    const [showAll, setShowAll] = useState(true);

    // === Auth ===
    const login = async () => {
        const res = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
            credentials: "include" // IMPORTANT
        });
        const data = await res.json();
        if (data.username) {
            setUsername(data.username);
        } else {
            alert(data.message)
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
            body: JSON.stringify(form),
            credentials: "include" // IMPORTANT: allow cookies
        });
        const data = await res.json();
        if (data.username) {
            setUsername(data.username);
        } else {
            alert(data.message); // show backend error (e.g., username taken)
        }
    };

    const signOut = async () => {
        await fetch(`${API_URL}/logout`, { method: "POST", credentials: "include" });
        setUsername("");
        setEvents([]);
        setDisplayedEvents([]);
    };

    // === Events ===
    const fetchEvents = async () => {
        try {
            const res = await fetch(`${API_URL}/events`, {
                method: "GET",
                credentials: "include" // important to send cookies
            });
            if (!res.ok) throw new Error("Failed to fetch events");
            const data = await res.json();
            setEvents(data);
            setDisplayedEvents(data);
        } catch (err) {
            console.error(err);
        }
    };


    const addEvent = async () => {
        try {
            const res = await fetch(`${API_URL}/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include", // send HttpOnly cookie
                body: JSON.stringify({
                    ...eventForm,
                    date: formatLocalDate(date)
                })
            });
            if (!res.ok) throw new Error("Failed to add event");
            fetchEvents(); // refresh event list
        } catch (err) {
            console.error(err);
        }
    };

    // === Calendar features ===
    const onDayClick = (value) => {
        const clickedDate = formatLocalDate(value);
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
            const dateStr = formatLocalDate(date);
            if (events.some(ev => ev.date === dateStr)) {
                return "event-day";
            }
        }
        return null;
    };

    const formatLocalDate = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };


    useEffect(() => {
    if (username) fetchEvents();
  }, [username]);

  // =========================
  return (
    <div className="p-5 max-w-2xl mx-auto">
      {!username ? (
        <div className="space-y-4">
          <div>
            <input
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="border p-1 rounded w-full"
            />
            <p className="text-sm text-gray-500">
              Username must be at least 4 characters.
            </p>
          </div>

          <div>
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border p-1 rounded w-full"
            />
            <p className="text-sm text-gray-500">
              Password must be at least 8 chars, include 1 capital letter & 1 number
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
            <button
              onClick={signOut}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>

          <Calendar
            value={date}
            onChange={setDate}
            onClickDay={onDayClick}
            tileClassName={tileClassName}
          />

          <div className="mt-4 space-y-2">
            <input
              placeholder="Event title"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              className="border p-1 rounded w-full"
            />
            <input
              placeholder="Description"
              value={eventForm.description}
              onChange={(e) =>
                setEventForm({ ...eventForm, description: e.target.value })
              }
              className="border p-1 rounded w-full"
            />
            <button
              onClick={addEvent}
              className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
            >
              Add Event
            </button>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {displayedEvents.length > 0
                ? showAll
                  ? "All Events"
                  : `Events for ${formatDate(date)}`
                : showAll
                ? "No events"
                : `No events for ${formatDate(date)}`}
            </h2>

            {!showAll && (
              <button
                onClick={showAllEvents}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Show All Events
              </button>
            )}
          </div>

          <ul className="mt-2 list-disc list-inside space-y-1">
            {displayedEvents.map((ev) => (
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
