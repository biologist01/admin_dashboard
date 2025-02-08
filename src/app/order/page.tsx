"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { client } from "@/sanity/lib/client";

// Updated Order interface matching your new schema.
export interface Order {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
  createdAt: string;
  status: string; // "pending" or "completed"
  cartItems: {
    quantity: number;
    product: {
      _id: string;
      name: string;
      imageUrl: string;
    };
  }[];
}

// For form input, we use a simplified type (for editing/adding orders).
export type OrderInput = {
  _id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  amount?: number;
  createdAt?: string;
  status?: string;
  // For editing, we store the product IDs (comma separated) for convenience.
  // (Not used when creating a new order since we use the updated schema.)
  cartItems?: string;
};

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formState, setFormState] = useState<OrderInput>({});

  // Fetch orders from Sanity with product details resolved for each cart item.
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await client.fetch<Order[]>(`
        *[_type=="order"]{
          _id,
          fullName,
          email,
          phone,
          address,
          city,
          postalCode,
          country,
          paymentMethod,
          paymentStatus,
          amount,
          createdAt,
          status,
          cartItems[]{
            quantity,
            product->{
              _id,
              name,
              "imageUrl": image.asset->url
            }
          }
        }
      `);
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Mark an order as completed.
  const handleComplete = async (orderId: string) => {
    try {
      await client.patch(orderId).set({ status: "completed" }).commit();
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId ? { ...order, status: "completed" } : order
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to mark order as completed");
    }
  };

  // Delete an order.
  const handleDelete = async (orderId: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      try {
        await client.delete(orderId);
        setOrders((prev) => prev.filter((order) => order._id !== orderId));
      } catch (err) {
        console.error(err);
        alert("Failed to delete order");
      }
    }
  };

  // Open edit mode for an order.
  // (For simplicity, the editing form uses a comma‑separated list for cartItems.)
  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setFormState({
      _id: order._id,
      fullName: order.fullName,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      postalCode: order.postalCode,
      country: order.country,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      amount: order.amount,
      createdAt: order.createdAt,
      status: order.status,
      // Convert the cartItems to a comma-separated string of product IDs.
      cartItems: order.cartItems.map((item) => item.product._id).join(", "),
    });
    setShowAddForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel editing/adding.
  const handleCancel = () => {
    setEditingOrder(null);
    setShowAddForm(false);
    setFormState({});
  };

  // Update an existing order.
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (editingOrder && editingOrder._id) {
      try {
        // Convert the cartItems string to an array of product IDs.
        const cartItemsArray = formState.cartItems
          ? formState.cartItems.split(",").map((id) => id.trim())
          : [];
        const updateData = {
          ...formState,
          cartItems: cartItemsArray, // In a real app, you would rebuild the cartItems array with quantity info.
        };
        const updated = (await client
          .patch(editingOrder._id)
          .set(updateData)
          .commit()) as Order;

        setOrders((prev) =>
          prev.map((ord) =>
            ord._id === editingOrder._id ? updated : ord
          )
        );
        handleCancel();
      } catch (err) {
        console.error(err);
        alert("Failed to update order");
      }
    }
  };

  // Create a new order.
  const handleAddNew = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // Convert the cartItems string into an array of product IDs.
      const cartItemsArray = formState.cartItems
        ? formState.cartItems.split(",").map((id) => id.trim())
        : [];
      const createdAt = formState.createdAt || new Date().toISOString();

      await client.create({
        _type: "order",
        ...formState,
        status: "pending", // New orders default to pending.
        cartItems: cartItemsArray, // In a real scenario, you'd build objects with product and quantity.
        createdAt,
      });
      await fetchOrders();
      handleCancel();
    } catch (err) {
      console.error(err);
      alert("Failed to create order");
    }
  };

  // Handle form input changes.
  const handleFormChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      e.target instanceof HTMLInputElement && type === "checkbox"
        ? e.target.checked
        : undefined;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const isEditing = Boolean(editingOrder);
  const isFormOpen = isEditing || showAddForm;

  // Separate orders into pending and completed.
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const completedOrders = orders.filter((order) => order.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-800 mb-4 md:mb-0">
            Orders Dashboard
          </h1>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingOrder(null);
                setFormState({});
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition"
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
              Add New Order
            </button>
            <button
              onClick={fetchOrders}
              className="bg-gray-600 text-white px-5 py-2 rounded-md hover:bg-gray-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Add / Edit Order Form */}
        {isFormOpen && (
          <form
            onSubmit={isEditing ? handleUpdate : handleAddNew}
            className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition hover:shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-blue-600 mb-6">
              {isEditing ? "Edit Order" : "Add New Order"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Full Name"
                    value={formState.fullName || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Phone"
                    value={formState.phone || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Address"
                    value={formState.address || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    placeholder="City"
                    value={formState.city || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    placeholder="Postal Code"
                    value={formState.postalCode || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    placeholder="Country"
                    value={formState.country || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Method
                  </label>
                  <select
                    name="paymentMethod"
                    value={formState.paymentMethod || "creditCard"}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    required
                  >
                    <option value="creditCard">Credit Card</option>
                    <option value="cash">Cash on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Payment Status
                  </label>
                  <select
                    name="paymentStatus"
                    value={formState.paymentStatus || "paid"}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    required
                  >
                    <option value="paid">Paid</option>
                    <option value="cash on delivery">Cash on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <input
                    type="number"
                    name="amount"
                    placeholder="Amount"
                    value={formState.amount || 0}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Created At
                  </label>
                  <input
                    type="datetime-local"
                    name="createdAt"
                    value={
                      formState.createdAt
                        ? formState.createdAt.substring(0, 16)
                        : ""
                    }
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cart Items (comma separated product IDs)
                  </label>
                  <input
                    type="text"
                    name="cartItems"
                    placeholder="id1, id2, id3"
                    value={formState.cartItems || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
              >
                {isEditing ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Orders Sections */}
        {loading ? (
          <div className="text-center text-gray-700">Loading...</div>
        ) : (
          <>
            {/* Pending Orders Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-blue-800 mb-4">
                Pending Orders
              </h2>
              {pendingOrders.length === 0 ? (
                <p className="text-gray-700">No pending orders.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingOrders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition hover:shadow-2xl cursor-pointer"
                      onClick={() => handleEditClick(order)}
                    >
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-blue-700">
                          {order.fullName}
                        </h3>
                        <p className="text-gray-700">Email: {order.email}</p>
                        <p className="text-gray-700">Phone: {order.phone}</p>
                        <p className="text-gray-700">City: {order.city}</p>
                        <p className="text-gray-700">Amount: ${order.amount}</p>
                        <p className="text-gray-700">
                          Created At:{" "}
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">
                          Cart Items
                        </h4>
                        <div className="space-y-2">
                          {(order.cartItems || []).map((item) => {
                            if (!item.product) return null;
                            return (
                              <div
                                key={item.product._id}
                                className="flex items-center space-x-2"
                              >
                                <img
                                  src={item.product.imageUrl || "/placeholder.png"}
                                  alt={item.product.name}
                                  className="w-16 h-16 object-contain rounded-md border"
                                />
                                <div>
                                  <p className="text-gray-800 font-medium">
                                    {item.product.name}
                                  </p>
                                  <p className="text-gray-600 text-sm">
                                    Quantity: {item.quantity}
                                  </p>
                                  <p className="text-gray-600 text-sm">
                                    Payment:{" "}
                                    {order.paymentStatus === "paid"
                                      ? "Paid"
                                      : "Cash on Delivery"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComplete(order._id);
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition w-full"
                      >
                        Complete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Orders Section */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-blue-800 mb-4">
                Completed Orders
              </h2>
              {completedOrders.length === 0 ? (
                <p className="text-gray-700">No completed orders.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedOrders.map((order) => (
                    <div
                      key={order._id}
                      className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition hover:shadow-2xl"
                    >
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-blue-700">
                          {order.fullName}
                        </h3>
                        <p className="text-gray-700">Email: {order.email}</p>
                        <p className="text-gray-700">Phone: {order.phone}</p>
                        <p className="text-gray-700">City: {order.city}</p>
                        <p className="text-gray-700">Amount: ${order.amount}</p>
                        <p className="text-gray-700">
                          Created At:{" "}
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="mb-4">
                        <h4 className="text-lg font-semibold text-gray-800">
                          Cart Items
                        </h4>
                        <div className="space-y-2">
                          {(order.cartItems || []).map((item) => {
                            if (!item.product) return null;
                            return (
                              <div
                                key={item.product._id}
                                className="flex items-center space-x-2"
                              >
                                <img
                                  src={item.product.imageUrl || "/placeholder.png"}
                                  alt={item.product.name}
                                  className="w-16 h-16 object-contain rounded-md border"
                                />
                                <div>
                                  <p className="text-gray-800 font-medium">
                                    {item.product.name}
                                  </p>
                                  <p className="text-gray-600 text-sm">
                                    Quantity: {item.quantity}
                                  </p>
                                  <p className="text-gray-600 text-sm">
                                    Payment:{" "}
                                    {order.paymentStatus === "paid"
                                      ? "Paid"
                                      : "Cash on Delivery"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-bold">
                          Completed
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(order._id);
                          }}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;