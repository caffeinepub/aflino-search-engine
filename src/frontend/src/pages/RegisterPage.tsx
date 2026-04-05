import { Navigate } from "@tanstack/react-router";

// Legacy route — /register now redirects to /login
export default function RegisterPage() {
  return <Navigate to="/login" />;
}
