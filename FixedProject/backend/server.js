import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import "dotenv/config"
import cookieParser from "cookie-parser";


const app = express();
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN, // must be exact, cannot be '*'
    credentials: true       // allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// ===== Database Connection =====
mongoose.connect(process.env.MONGO_URI, {
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

const EventSchema = new mongoose.Schema({
  title: String,
  description: String,
  date: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const Event = mongoose.model("Event", EventSchema);

// ===== Auth Middleware =====
const auth = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};


// ===== Routes =====
// Sign Up
app.post("/signup", async (req, res) => {
    const { username, password } = req.body;

    if (username && typeof username == 'string' && password && typeof password == 'string') {
            // --- Validation ---
            if (!username || username.length < 4) {
                return res.status(400).json({ message: "Username must be at least 4 characters long." });
            }
        
            const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(400).json({ message: "Password must be at least 8 characters long, with at least one capital letter and one number." });
            }
    } else {
        return res.status(400).json({ message: "type validation failed or empty fields" });
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
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600000 // 1 hour
    });

    res.json({ username: newUser.username });
});

// Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!(username && typeof username == 'string' && password && typeof password == 'string')) {
        return res.status(400).json({ message: "type validation failed or empty fields" });
    }
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 3600000
    });

    res.json({ username: user.username });
});

// Add Event
app.post("/events", auth, async (req, res) => {
    const { title, date, description } = req.body;

    if (title && typeof title == 'string' && typeof description == 'string') {

        if (!title || title.length < 4) {
            return res.status(400).json({ message: "Title must be at least 4 characters long." });
        }

        // normalize date to YYYY-MM-DD
        const normalizedDate = new Date(date).toISOString().split("T")[0];

        const event = new Event({
            title,
            description,
            date: normalizedDate,
            userId: req.userId,
        });

        await event.save();
        res.json({ message: "Event added" });
    } else {
        return res.status(400).json({ message: "type validation failed or empty fields" });
    }
});


// Get Events
app.get("/events", auth, async (req, res) => {
  const userEvents = await Event.find({ userId: req.userId });
  res.json(userEvents);
});

app.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ message: "Logged out" });
});

app.listen(5000, () => console.log("Server running on port 5000"));
