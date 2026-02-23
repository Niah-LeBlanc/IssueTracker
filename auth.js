//|==================================================|
//|---------------------[-IMPORTS-]------------------|
//|==================================================|
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getClient, getDatabase } from "./database.js";
import dotenv from "dotenv";

//|==================================================|
//|------------------[-ENVIRONMENT VARIABLES-]-------|
//|==================================================|
dotenv.config();  // Loads the environment variables from .env file

//|==================================================|
//|-----------[-MIDDLEWARE-INITIALIZATION-]----------|
//|==================================================|
let client, db;

// Initialize MongoDB client and database connection
const initializeDb = async () => {
  try {
    client = await getClient();  // Ensure MongoDB client is initialized
    db = await getDatabase();    // Ensure database is connected
  } catch (error) {
    console.error("Error initializing MongoDB connection:", error);
  }
};

initializeDb();  // Initialize database

//|==================================================|
//|-----------------[-BETTER-AUTH CONFIGURATION-]-----|
//|==================================================|
export const auth = betterAuth({
  // Base URL for your authentication service
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",  // Ensure proper fallback if no env variable

  // Trusted origins for CORS
  trustedOrigins: [
    "http://localhost:5173",  // Frontend development (e.g., Vite)
    "http://localhost:3000",  // Another common frontend port
    "http://localhost:8080",  // Another possible dev server port
    "https://lawnconnect-service-294349793000.us-central1.run.app"  // Production or cloud service URL
  ],

  // MongoDB adapter for database connection
  database: mongodbAdapter(db, { client }),

  // Email/password authentication enabled
  emailAndPassword: {
    enabled: true,  // Email and password registration/login enabled
  },

  // Session settings (cookie and expiration)
  session: {
    cookieCache: true,  // Session info cached in the browser cookies
    maxAge: 60 * 60 * 1000,  // Session expiration set to 1 hour
    secure: process.env.NODE_ENV === 'production',  // Ensure cookies are secure in production (using HTTPS)
  },

  // User fields, like roles and profiles
  user: {
    additionalFields: {
      role: {
        type: "array",
        of: "string",
        required: false,  // Optional role field
      },
      profile: {
        type: "object",
        required: false,  // Optional profile object
      },
    },
  },

  // Logging or debugging purposes (optional)
  debug: process.env.NODE_ENV === 'development',  // Enable detailed logs in development
});
