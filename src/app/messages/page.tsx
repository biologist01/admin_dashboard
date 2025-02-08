"use client";

import React, { useState, useEffect } from "react";
import { client } from "@/sanity/lib/client";

interface Message {
  _id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
  pinned: boolean;
}

const AdminMessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  // Fetch messages from Sanity and force a fresh fetch by including a dummy parameter.
  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await client.fetch<Message[]>(`
        *[_type=="message"] | order(pinned desc, createdAt desc){
          _id,
          name,
          email,
          message,
          createdAt,
          pinned
        }
      `, { timestamp: Date.now() });
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Delete a message.
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      try {
        await client.delete(id);
        setMessages((prev) => prev.filter((msg) => msg._id !== id));
      } catch (error) {
        console.error("Failed to delete message:", error);
        alert("Failed to delete message");
      }
    }
  };

  // Toggle the pinned state.
  const togglePin = async (id: string, currentPinned: boolean) => {
    try {
      const updated = await client.patch(id).set({ pinned: !currentPinned }).commit();
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === id ? { ...msg, pinned: updated.pinned } : msg
        )
      );
    } catch (error) {
      console.error("Failed to update pin state:", error);
      alert("Failed to update pin state");
    }
  };

  // Helper to truncate text to a certain number of characters.
  const truncateText = (text: string, limit: number = 20): string => {
    return text.length > limit ? text.slice(0, limit) + "..." : text;
  };

  // Separate messages into pinned and unpinned.
  const pinnedMessages = messages.filter((msg) => msg.pinned);
  const unpinnedMessages = messages.filter((msg) => !msg.pinned);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {/* Full Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-lg w-full mx-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-blue-700">{selectedMessage.name}</h2>
              <p className="text-gray-700 text-sm">
                <span className="font-semibold">Email:</span> {selectedMessage.email}
              </p>
              <p className="text-gray-700 text-sm">
                <span className="font-semibold">Date:</span> {new Date(selectedMessage.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="mb-6">
              <p className="text-gray-800 whitespace-pre-wrap break-words">{selectedMessage.message}</p>
            </div>
            <button 
              onClick={() => setSelectedMessage(null)}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-4xl font-extrabold text-blue-800">Messages Dashboard</h1>
          <button 
            onClick={fetchMessages}
            className="mt-4 sm:mt-0 bg-gray-600 text-white px-5 py-2 rounded-md hover:bg-gray-700 transition"
          >
            Refresh
          </button>
        </header>

        {loading ? (
          <div className="text-center text-gray-700">Loading...</div>
        ) : (
          <>
            {pinnedMessages.length > 0 && (
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-blue-800 mb-4">Pinned Messages</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pinnedMessages.map((msg) => (
                    <div
                      key={msg._id}
                      className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition transform hover:scale-105 hover:shadow-2xl cursor-pointer"
                      onClick={() => setSelectedMessage(msg)}
                    >
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold text-blue-700">{msg.name}</h2>
                        <p className="text-gray-700 text-sm">
                          <span className="font-semibold">Email:</span> {msg.email}
                        </p>
                        <p className="text-gray-700 text-sm">
                          <span className="font-semibold">Date:</span> {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-800 mb-4 whitespace-normal break-words">
                        {truncateText(msg.message, 20)}
                      </p>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(msg._id, msg.pinned);
                          }}
                          className="px-4 py-2 rounded-md transition bg-yellow-500 text-white hover:bg-yellow-600"
                        >
                          Unpin
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(msg._id);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-blue-800 mb-4">Other Messages</h2>
              {unpinnedMessages.length === 0 ? (
                <p className="text-gray-700">No messages.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {unpinnedMessages.map((msg) => (
                    <div
                      key={msg._id}
                      className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition transform hover:scale-105 hover:shadow-2xl cursor-pointer"
                      onClick={() => setSelectedMessage(msg)}
                    >
                      <div className="mb-4">
                        <h2 className="text-2xl font-bold text-blue-700">{msg.name}</h2>
                        <p className="text-gray-700 text-sm">
                          <span className="font-semibold">Email:</span> {msg.email}
                        </p>
                        <p className="text-gray-700 text-sm">
                          <span className="font-semibold">Date:</span> {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-gray-800 mb-4 whitespace-normal break-words">
                        {truncateText(msg.message, 20)}
                      </p>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(msg._id, msg.pinned);
                          }}
                          className={`px-4 py-2 rounded-md transition ${
                            msg.pinned
                              ? "bg-yellow-500 text-white hover:bg-yellow-600"
                              : "bg-gray-300 text-gray-800 hover:bg-gray-400"
                          }`}
                        >
                          {msg.pinned ? "Pin (Unpin)" : "Pin"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(msg._id);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
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

export default AdminMessagesPage;