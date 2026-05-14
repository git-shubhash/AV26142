import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { user, login } = useAuth();

  const validateUsername = (value: string) => {
    return value.length >= 3;
  };

  const validatePassword = (value: string) => {
    return value.length >= 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!validateUsername(username)) {
      setUsernameError("Username must be at least 3 characters.");
      valid = false;
    } else {
      setUsernameError("");
    }

    if (!validatePassword(password)) {
      setPasswordError("Password must be at least 3 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (valid) {
      const success = await login(username, password);
      if (!success) {
        setUsernameError("Invalid username or password");
        setPasswordError("Invalid username or password");
      }
    }
  };

  if (user.isAuthenticated) {
    return <Navigate to="/live" />;
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Left side - Login Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a href="#" aria-label="home" className="flex gap-2 items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <img src="/cctv-camera.png" alt="VisionGuard" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-bold text-gray-900">VisionGuard</span>
          </a>
        </div>

        <div className="flex flex-1 w-full items-center justify-center">
          <div className="w-full max-w-md">
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center gap-1 text-center">
                  <h1 className="text-2xl font-bold text-gray-900">Login to your account</h1>
                  <p className="text-gray-600 text-sm text-balance">
                    Enter your credentials below to login to your account
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    placeholder="admin"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (usernameError) setUsernameError("");
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      usernameError ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {usernameError && (
                    <p className="text-red-500 text-xs mt-1">{usernameError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center">
                    <label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <a
                      href="#"
                      className="ml-auto text-sm text-blue-600 underline-offset-4 hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        alert("Please contact administrator to reset your password.");
                      }}
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      passwordError ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {passwordError && (
                    <p className="text-red-500 text-xs mt-1">{passwordError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  Login
                </button>

                <p className="text-center text-sm text-gray-600">
                  Don&apos;t have an account?{" "}
                  <a href="#" className="text-blue-600 underline underline-offset-4 hover:text-blue-700">
                    Sign up
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right side - Video Background */}
      <div className="relative hidden lg:block overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero-homepage-people-walking.webm" type="video/webm" />
        </video>
        {/* Optional overlay for better text readability if needed */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
    </div>
  );
};

export default Login;
