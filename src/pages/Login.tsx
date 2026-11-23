import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Eye, EyeOff, Lock, User } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated && user) {
    const isRestricted = user.role === 'HR' || user.role === 'Operations Executive';
    return <Navigate to={isRestricted ? "/march-madness" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      // The context user will be updated, but for immediate navigation 
      // we'll rely on the isAuthenticated check at the top on next render
      // or we can just navigate to /dashboard and let ProtectedRoute handle it.
      // But to be safe and avoid flickering, we can try to get the user from localStorage
      const storedUser = localStorage.getItem('hike_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const isRestricted = u.role === 'HR' || u.role === 'Operations Executive';
        navigate(isRestricted ? '/march-madness' : '/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message || 'Invalid credentials. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-background">
      {/* Left Section: Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden bg-muted/30 dark:bg-[#0A0E1A]"
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Main Glows */}
          <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-primary/20 dark:bg-primary/20 blur-[120px] rounded-full animate-pulse-glow" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-primary/10 dark:bg-[#7C3AED]/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />

          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />

          {/* Subtle moving light line */}
          <motion.div
            initial={{ translateY: '-100%' }}
            animate={{ translateY: '200%' }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-transparent via-primary/5 dark:via-primary/5 to-transparent skew-y-12"
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-12 text-center max-w-2xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="relative"
          >
            {/* Logo Glass Container */}
            <div className="relative p-8 rounded-[2.5rem] bg-white/40 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl dark:shadow-none">
              <motion.img
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                src="/logo-transparent.png"
                alt="HikeEducation Logo"
                className="w-full h-auto max-w-lg relative z-10"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-4"
          >
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground dark:text-white tracking-wide">
              Performance Analysis Dashboard
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-purple-600 mx-auto rounded-full" />
            <p className="text-xl lg:text-2xl font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-purple-600 dark:from-blue-200 dark:via-blue-100 dark:to-purple-200 leading-relaxed max-w-lg">
              "Magic happens to people those who believe in it" - Akash Dubey
            </p>
          </motion.div>
        </div>

        {/* Decorative corner accents */}
        <div className="absolute top-10 left-10 w-20 h-20 border-t-2 border-l-2 border-primary/20 rounded-tl-3xl text-primary" />
        <div className="absolute bottom-10 right-10 w-20 h-20 border-b-2 border-r-2 border-primary/20 rounded-br-3xl text-primary" />
      </motion.div>

      {/* Mobile Branding (Simplified) */}
      <div className="lg:hidden w-full p-8 text-center bg-muted/30 dark:bg-[#0A0E1A]">
        <img src="/logo-transparent.png" alt="Logo" className="w-48 mx-auto mb-4" />
        <p className="text-primary italic dark:text-blue-200/80">"Magic happens to people those who believe in it" - Akash Dubey</p>
      </div>

      {/* Right Section: Login Link */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative"
      >
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 blur-[80px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full max-w-md glass-card-elevated p-8 lg:p-10 relative z-10"
        >
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground">Welcome Back</h2>
            <p className="text-muted-foreground mt-3">Sign in to access your partner dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3"
              >
                <div className="w-1 h-full bg-destructive rounded-full" />
                <p className="text-sm font-medium text-destructive">{error}</p>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground/80 ml-1">Username/Email ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="input-field pl-12 group-hover:border-primary/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-foreground/80">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-12 pr-12 group-hover:border-primary/50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-3 h-14 text-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <TrendingUp className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have access? <span className="text-primary font-medium">Contact your administrator</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

