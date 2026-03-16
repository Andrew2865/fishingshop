import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetails from "./pages/ProductDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Profile from "./pages/Profile";
import Forum from "./pages/Forum";
import ForumPost from "./pages/ForumPost";

import AdminRoute from "./components/AdminRoute";
import WarehouseRoute from "./components/WarehouseRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import WarehouseDashboard from "./pages/warehouse/WarehouseDashboard";
import WarehouseOrders from "./pages/warehouse/WarehouseOrders";
import WarehouseProducts from "./pages/warehouse/WarehouseProducts";

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success/:id" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:id" element={<ForumPost />} />

        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
        <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />

        <Route path="/warehouse" element={<WarehouseRoute><WarehouseDashboard /></WarehouseRoute>} />
        <Route path="/warehouse/orders" element={<WarehouseRoute><WarehouseOrders /></WarehouseRoute>} />
        <Route path="/warehouse/products" element={<WarehouseRoute><WarehouseProducts /></WarehouseRoute>} />
      </Routes>
    </>
  );
}
