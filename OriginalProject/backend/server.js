import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ===== Database Connection =====
mongoose.connect("mongodb://localhost:27017/cybercalendar", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// ===== User Model =====
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String
});
const User = mongoose.model("User", userSchema);

// ===== Event Model =====
const eventSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    title: String,
    date: String, // ISO string for simplicity
    description: String
});
const Event = mongoose.model("Event", eventSchema);

// ===== Auth Middleware =====
const auth = (req, res, next) => {
    const token = req.headers["authorization"];
    if (!token) return res.status(403).json({ message: "No token" });

    jwt.verify(token, "SECRET_KEY", (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid token" });
        req.userId = decoded.userId;
        next();
    });
};

// ===== Routes =====
// Sign Up
app.post("/signup", async (req, res) => {
    const { username, password } = req.body;

    // --- Validation ---
    if (!username || username.length < 4) {
        return res.status(400).json({ message: "Username must be at least 4 characters long." });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Password must be at least 8 characters long, with at least one capital letter and one number." });
    }

    // --- Check for existing username ---
    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: "Username already exists." });
    }

    // --- Create user ---
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    // --- Issue JWT ---
    const token = jwt.sign({ id: newUser._id }, "SECRET_KEY");
    res.json({ token, username: newUser.username });
});

// Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, "SECRET_KEY");
    res.json({ token, username: user.username });
});

// Add Event
app.post("/events", auth, async (req, res) => {
    const { title, date, description } = req.body;

    // normalize date to YYYY-MM-DD
    const normalizedDate = new Date(date).toISOString().split("T")[0];

    const event = new Event({
        userId: req.userId,
        title,
        date: normalizedDate,
        description
    });

    await event.save();
    res.json({ message: "Event added" });
});


// Get Events
app.get("/events", auth, async (req, res) => {
    const events = await Event.find({ userId: req.userId });
    res.json(events);
});

app.listen(5000, () => console.log("Server running on port 5000"));
