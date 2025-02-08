"use client";

import React, { useState } from "react";
import Link from "next/link";

const AdminDashboard = () => {
  const [email, setEmail] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Check if the entered email matches the allowed email
    if (email.trim().toLowerCase() === "shaikhurwa61@gmail.com") {
      setAuthorized(true);
      setError("");
    } else {
      setError("Unauthorized email. Please enter the correct Gmail address.");
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center p-4">
        <h1 className="text-3xl font-bold text-white mb-6">Admin Login</h1>
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
          <input
            type="email"
            placeholder="Enter your Gmail address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg mb-4 w-80"
            required
          />
          <button
            type="submit"
            className="bg-white text-blue-700 font-bold py-2 px-4 rounded"
          >
            Submit
          </button>
          {error && <p className="mt-4 text-red-300">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center p-4">
      <header className="mb-12 text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white drop-shadow-lg">
          Admin Dashboard
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-blue-100">
          Manage Products, Users, Orders, and Messages with Ease
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 w-full max-w-5xl">
        <Link href="/products">
          <span className="flex items-center justify-center bg-white bg-opacity-90 p-6 sm:p-8 rounded-2xl shadow-lg transform transition duration-300 hover:scale-105 hover:shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-700">
              Products
            </h2>
          </span>
        </Link>
        <Link href="/users">
          <span className="flex items-center justify-center bg-white bg-opacity-90 p-6 sm:p-8 rounded-2xl shadow-lg transform transition duration-300 hover:scale-105 hover:shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-700">
              Users
            </h2>
          </span>
        </Link>
        <Link href="/orders">
          <span className="flex items-center justify-center bg-white bg-opacity-90 p-6 sm:p-8 rounded-2xl shadow-lg transform transition duration-300 hover:scale-105 hover:shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-700">
              Orders
            </h2>
          </span>
        </Link>
        <Link href="/messages">
          <span className="flex items-center justify-center bg-white bg-opacity-90 p-6 sm:p-8 rounded-2xl shadow-lg transform transition duration-300 hover:scale-105 hover:shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-700">
              Messages
            </h2>
          </span>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;