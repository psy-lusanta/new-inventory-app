import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import GTOLogo from "../photos/gto-logo-no-bg.png";
import Prism from "../animation/Prism";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // ─── Read expired param ONCE on mount then clean the URL ─────────────────
  useEffect(() => {
    if (searchParams.get("expired") === "true") {
      setIsExpired(true);
      // Remove the param from URL immediately to prevent loops
      setSearchParams({}, { replace: true });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsExpired(false); // clear expired message on submit attempt
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.error;

      if (status === 429) {
        setError(
          "Too many login attempts. Please wait 15 minutes and try again.",
        );
      } else if (status === 423) {
        setError(
          message || "Account is temporarily locked. Please try again later.",
        );
      } else {
        setError(message || "Invalid email or password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError("");
    setIsExpired(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError("");
    setIsExpired(false);
  };

  return (
    <div className="relative min-h-screen bg-gray-900 overflow-hidden">
      {/* Prism Background */}
      <div className="absolute inset-0">
        <Prism
          animationType="rotate"
          timeScale={0.9}
          height={3.5}
          baseWidth={7.4}
          scale={3.9}
          hueShift={0.5584}
          colorFrequency={1.45}
          noise={0}
          glow={0.5}
        />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="bg-indigo-600 p-4 rounded-xl">
              <img
                src={GTOLogo}
                alt="GTO Logo"
                className="w-[200px] h-[50px] text-white object-contain"
              />
            </div>
            <span className="text-gray-900 dark:text-white font-bold text-2xl">
              Inventory
            </span>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-[#1a1d2e] rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-[#2a2d3e]">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Welcome back
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Sign in to your account
            </p>

            {/* Session expired banner — only shows when redirected from expired session */}
            {isExpired && !error && (
              <div className="mb-4 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 rounded-lg text-center">
                Your session expired. Please log in again.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2a2d3e] rounded-lg text-sm bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:placeholder-gray-600"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-[#2a2d3e] rounded-lg text-sm bg-gray-50 dark:bg-[#0f1117] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:placeholder-gray-600"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
