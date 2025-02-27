import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import { connectDB } from './db/connectDB.js';
import userRouter from './routes/userRouter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import adminRouter from './routes/adminRouter.js';
import './utils/googleAuth.js';
import passport from 'passport';
import nocache from "nocache"


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/tailwindcss', express.static(path.join(__dirname, 'public', 'tailwindcss')));
app.use(nocache())

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize passport
app.use(passport.initialize());

app.use(passport.session());


// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Database connection
connectDB();

// Dynamic port selection with error handling
const startServer = async (retries = 0) => {
    const maxRetries = 5;
    const basePort = 3000;
    const port = basePort + retries;

    try {
        const server = app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.log(`Port ${port} is in use, trying port ${port + 1}`);
                if (retries < maxRetries) {
                    server.close();
                    startServer(retries + 1);
                } else {
                    console.error('No available ports found after maximum retries');
                    process.exit(1);
                }
            } else {
                console.error('Server error:', error);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();  



