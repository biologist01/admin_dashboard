"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { client } from "@/sanity/lib/client";

// The User interface matches your Sanity schema.
export interface User {
  _id: string;
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  isVerified: boolean;
  role: string;
}

// For form input, we allow partial updates.
export type UserInput = {
  _id?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  password?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  isVerified?: boolean;
  role?: string;
};

// When creating a new document, _id is not provided.
export type NewUserDocument = Omit<User, "_id"> & { _type: "user" };

// Interface for the GROQ query response from Sanity.
interface SanityUser {
  _id: string;
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  isVerified: boolean;
  role: string;
  _type: string;
}

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formState, setFormState] = useState<UserInput>({});
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Fetch users from Sanity.
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data: SanityUser[] = await client.fetch<SanityUser[]>(`
        *[_type=="user"]{
          _id,
          name,
          email,
          mobileNumber,
          password,
          address,
          isVerified,
          role,
          _type
        }
      `);
      const mappedData: User[] = data.map((doc) => ({
        _id: doc._id,
        name: doc.name,
        email: doc.email,
        mobileNumber: doc.mobileNumber,
        password: doc.password,
        address: doc.address,
        isVerified: doc.isVerified,
        role: doc.role,
      }));
      setUsers(mappedData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Delete a user and update local state.
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await client.delete(id);
        setUsers((prev) => prev.filter((user) => user._id !== id));
      } catch (err) {
        console.error(err);
        alert("Failed to delete user");
      }
    }
  };

  // Open edit mode for a user and scroll to the top.
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setFormState(user);
    setShowAddForm(true); // Make sure to show the form when editing
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setFormState({});
    setShowAddForm(false); // Hide the form on cancel
  };

  // Update an existing user.
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (editingUser && editingUser._id) {
      try {
        const updated = (await client
          .patch(editingUser._id)
          .set(formState)
          .commit()) as User;
        setUsers((prev) =>
          prev.map((u) => (u._id === editingUser._id ? updated : u))
        );
        setEditingUser(null);
        setFormState({});
        setShowAddForm(false);
      } catch (err) {
        console.error(err);
        alert("Failed to update user");
      }
    }
  };

  // Create a new user.
  const handleAddNew = async (e: FormEvent) => {
    e.preventDefault();
    // Validate required fields.
    if (
      !formState.name ||
      !formState.email ||
      !formState.mobileNumber ||
      !formState.password ||
      !formState.address?.street ||
      !formState.address?.city ||
      !formState.address?.state ||
      !formState.address?.country ||
      !formState.address?.postalCode
    ) {
      alert("Please fill in all required fields.");
      return;
    }
    try {
      // Remove _id from formState using a renaming pattern.
      const { _id: _unused, ...userData } = formState;
      console.log(_unused)
      const newUserData: NewUserDocument = {
        _type: "user",
        name: userData.name!,
        email: userData.email!,
        mobileNumber: userData.mobileNumber!,
        password: userData.password!,
        address: {
          street: userData.address!.street!,
          city: userData.address!.city!,
          state: userData.address!.state!,
          country: userData.address!.country!,
          postalCode: userData.address!.postalCode!,
        },
        isVerified: userData.isVerified ?? false,
        role: userData.role || "user",
      };
      const newUser = (await client.create(newUserData)) as User;
      setUsers((prev) => [...prev, newUser]);
      setShowAddForm(false);
      setFormState({});
    } catch (err) {
      console.error(err);
      alert("Failed to create user");
    }
  };

  // Handle changes for form inputs.
  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      e.target instanceof HTMLInputElement && type === "checkbox" ? e.target.checked : undefined;
    if (name.startsWith("address.")) {
      const field = name.split(".")[1];
      setFormState((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
    } else {
      setFormState((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          {editingUser ? (
            <h1 className="text-4xl font-extrabold text-blue-800 mb-4">
              Edit User
            </h1>
          ) : (
            <h1 className="text-4xl font-extrabold text-blue-800 mb-4">
              Users Dashboard
            </h1>
          )}
          <div className="flex flex-col md:flex-row justify-between items-center">
            {!editingUser && (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingUser(null);
                  setFormState({});
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center bg-green-600 text-white px-5 py-2 rounded-md hover:bg-green-700 transition mb-4 md:mb-0"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add New User
              </button>
            )}
            <button
              onClick={fetchUsers}
              className="bg-gray-600 text-white px-5 py-2 rounded-md hover:bg-gray-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Add / Edit User Form */}
        {showAddForm && (
          <form
            onSubmit={editingUser ? handleUpdate : handleAddNew}
            className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition hover:shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-blue-600 mb-6">
              {editingUser ? "Edit User" : "Add New User"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column – Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={formState.name || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formState.email || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    name="mobileNumber"
                    placeholder="Mobile Number"
                    value={formState.mobileNumber || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Password"
                      value={formState.password || ""}
                      onChange={handleFormChange}
                      className="mt-1 block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-600"
                    >
                      {showPassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M4.03 3.97a.75.75 0 011.06 0l11 11a.75.75 0 11-1.06 1.06l-11-11a.75.75 0 010-1.06z" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M2.94 10a8.94 8.94 0 011.18-3.592l1.54 1.54A7.44 7.44 0 003.5 10a7.44 7.44 0 001.12 3.053l-1.54 1.54A8.94 8.94 0 012.94 10z" />
                          <path d="M10 15a3.5 3.5 0 003.376-2.586l1.17 1.17A5 5 0 0110 17a5 5 0 01-4.546-2.916l1.17-1.17A3.5 3.5 0 0010 15z" />
                          <path d="M10 5a5 5 0 014.546 2.916l-1.17 1.17A3.5 3.5 0 0010 6.5a3.5 3.5 0 00-3.376 2.586l-1.17-1.17A5 5 0 0110 5z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isVerified"
                    checked={formState.isVerified || false}
                    onChange={handleFormChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Is Verified
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formState.role || "user"}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {/* Right Column – Address Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Street
                  </label>
                  <input
                    type="text"
                    name="address.street"
                    placeholder="Street"
                    value={formState.address?.street || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    placeholder="City"
                    value={formState.address?.city || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    placeholder="State"
                    value={formState.address?.state || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    type="text"
                    name="address.country"
                    placeholder="Country"
                    value={formState.address?.country || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="address.postalCode"
                    placeholder="Postal Code"
                    value={formState.address?.postalCode || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition"
              >
                {editingUser ? "Update" : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Users List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-center text-gray-700">Loading...</div>
          ) : (
            users.map((user) => (
              <div
                key={user._id}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition hover:shadow-2xl cursor-pointer"
                onClick={() => handleEditClick(user)}
              >
                <h2 className="text-xl font-bold text-blue-700 mb-2">
                  {user.name}
                </h2>
                <p className="text-gray-700">
                  <span className="font-semibold">Email:</span> {user.email}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Mobile:</span> {user.mobileNumber}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Role:</span> {user.role}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Verified:</span>{" "}
                  {user.isVerified ? "Yes" : "No"}
                </p>
                <div className="mt-4">
                  <p className="text-gray-700 font-semibold">Address:</p>
                  <p className="text-gray-700 text-sm">
                    {user.address.street}, {user.address.city}
                  </p>
                  <p className="text-gray-700 text-sm">
                    {user.address.state}, {user.address.country} - {user.address.postalCode}
                  </p>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(user);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(user._id);
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersPage;