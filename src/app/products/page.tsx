"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { client } from "@/sanity/lib/client";

// The Product interface (used for fetched data) includes the computed image URL.
interface Product {
  _id: string;
  name: string;
  image?: { asset: { _ref?: string; url: string } };
  price: string;
  description: string;
  discountPercentage: number;
  isFeaturedProduct: boolean;
  stockLevel: number;
  category: string;
}

// Define a type for form input that does NOT include the URL (only the asset reference)
type ProductInput = {
  _id?: string;
  name?: string;
  image?: { asset: { _ref: string } };
  price?: string;
  description?: string;
  discountPercentage?: number;
  isFeaturedProduct?: boolean;
  stockLevel?: number;
  category?: string;
};

// Define an interface for the data returned by our GROQ query.
interface SanityProduct {
  _id: string;
  description: string;
  stockLevel: number;
  discountPercentage: number;
  isFeaturedProduct: boolean;
  name: string;
  price: string;
  category: string;
  imageUrl: string;
}

const AdminProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formState, setFormState] = useState<ProductInput>({});
  const [imagePreview, setImagePreview] = useState<string>("");

  // Fetch products from Sanity using a GROQ query that projects the image URL.
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data: SanityProduct[] = await client.fetch<SanityProduct[]>(`
        *[_type=="product"]{
          _id,
          description,
          stockLevel,
          discountPercentage,
          isFeaturedProduct,
          name,
          price,
          category,
          "imageUrl": image.asset->url
        }
      `);

      const mappedData: Product[] = data.map((doc) => ({
        _id: doc._id,
        name: doc.name,
        image: { asset: { url: doc.imageUrl } },
        price: doc.price,
        description: doc.description,
        discountPercentage: doc.discountPercentage,
        isFeaturedProduct: doc.isFeaturedProduct,
        stockLevel: doc.stockLevel,
        category: doc.category,
      }));
      setProducts(mappedData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Delete a product and refresh the list.
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await client.delete(id);
        fetchProducts();
      } catch (err) {
        console.error(err);
        alert("Failed to delete product");
      }
    }
  };

  // Open edit mode for a product.
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormState({
      _id: product._id,
      name: product.name,
      price: product.price,
      description: product.description,
      discountPercentage: product.discountPercentage,
      isFeaturedProduct: product.isFeaturedProduct,
      stockLevel: product.stockLevel,
      category: product.category,
    });
    setImagePreview(product.image?.asset?.url || "");
    setShowAddForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel and reset form state.
  const handleCancel = () => {
    setEditingProduct(null);
    setShowAddForm(false);
    setFormState({});
    setImagePreview("");
  };

  // Update an existing product.
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (editingProduct && editingProduct._id) {
      try {
        const updated = await client
          .patch(editingProduct._id)
          .set(formState)
          .commit();
        const updatedProduct: Product = {
          _id: updated._id,
          name: updated.name,
          image: { asset: { url: imagePreview || "" } },
          price: updated.price,
          description: updated.description,
          discountPercentage: updated.discountPercentage,
          isFeaturedProduct: updated.isFeaturedProduct,
          stockLevel: updated.stockLevel,
          category: updated.category,
        };
        setProducts(
          products.map((prod) =>
            prod._id === editingProduct._id ? updatedProduct : prod
          )
        );
        handleCancel();
      } catch (err) {
        console.error(err);
        alert("Failed to update product");
      }
    }
  };

  // Create a new product.
  const handleAddNew = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const newProduct = await client.create({
        _type: "product",
        ...formState,
        // Default category to "Chair" if not provided.
        category: formState.category || "Chair",
      });
      const mappedNewProduct: Product = {
        _id: newProduct._id!,
        name: newProduct.name!,
        image: { asset: { url: imagePreview || "" } },
        price: newProduct.price!,
        description: newProduct.description!,
        discountPercentage: newProduct.discountPercentage!,
        isFeaturedProduct: newProduct.isFeaturedProduct!,
        stockLevel: newProduct.stockLevel!,
        category: newProduct.category!,
      };
      setProducts((prev) => [...prev, mappedNewProduct]);
      handleCancel();
    } catch (err) {
      console.error(err);
      alert("Failed to create product");
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

  // Handle image file upload.
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const uploadedAsset = await client.assets.upload("image", file, {
          contentType: file.type,
          filename: file.name,
        });
        setFormState((prev) => ({
          ...prev,
          image: { asset: { _ref: uploadedAsset._id } },
        }));
        setImagePreview(uploadedAsset.url);
      } catch (err) {
        console.error(err);
        alert("Image upload failed");
      }
    }
  };

  // Determine if we are in edit mode.
  const isEditing = Boolean(editingProduct);
  // The form is open if we are either adding a new product or editing one.
  const isFormOpen = isEditing || showAddForm;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-800 mb-4 md:mb-0">
            Products Dashboard
          </h1>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingProduct(null);
                setFormState({ category: "Chair" });
                setImagePreview("");
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
              Add New Product
            </button>
            <button
              onClick={fetchProducts}
              className="bg-gray-600 text-white px-5 py-2 rounded-md hover:bg-gray-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Add / Edit Product Form */}
        {isFormOpen && (
          <form
            onSubmit={isEditing ? handleUpdate : handleAddNew}
            className="mb-8 bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition hover:shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-blue-600 mb-6">
              {isEditing ? "Edit Product" : "Add New Product"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mt-3 w-full h-64 object-contain rounded-md border"
                  />
                )}
              </div>
              {/* Product Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Product Name"
                    value={formState.name || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price
                  </label>
                  <input
                    type="text"
                    name="price"
                    placeholder="Product Price"
                    value={formState.price || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    placeholder="Product Description"
                    value={formState.description || ""}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Discount Percentage
                  </label>
                  <input
                    type="number"
                    name="discountPercentage"
                    placeholder="Discount Percentage"
                    value={formState.discountPercentage || 0}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    max="100"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isFeaturedProduct"
                    checked={formState.isFeaturedProduct || false}
                    onChange={handleFormChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Featured Product
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stock Level
                  </label>
                  <input
                    type="number"
                    name="stockLevel"
                    placeholder="Stock Level"
                    value={formState.stockLevel || 0}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formState.category || "Chair"}
                    onChange={handleFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    required
                  >
                    <option value="Chair">Chair</option>
                    <option value="Sofa">Sofa</option>
                  </select>
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

        {/* Products List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-center text-gray-700">Loading...</div>
          ) : (
            products.map((product) => (
              <div
                key={product._id}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 transition hover:shadow-2xl cursor-pointer"
                onClick={() => handleEditClick(product)}
              >
                <img
                  src={product.image?.asset?.url || "/placeholder.png"}
                  alt={product.name}
                  className="w-full h-64 object-contain rounded-md mb-4"
                />
                <h2 className="text-xl font-bold text-blue-700 mb-2">
                  {product.name}
                </h2>
                <p className="text-gray-700 mb-1">Price: {product.price}</p>
                <p className="text-gray-700 mb-1">Category: {product.category}</p>
                <p className="text-gray-700">Stock: {product.stockLevel}</p>
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(product);
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product._id);
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

export default AdminProductsPage;