import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { User, Terminal, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { connectAuthSocket } from "../lib/authSocket";

interface LoginDialogProps {
  isOpen: boolean;
  onLogin: (username: string, socket: WebSocket) => void;
}

export function LoginDialog({ isOpen, onLogin }: LoginDialogProps) {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingController = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (pendingController.current) {
        pendingController.current.abort();
        pendingController.current = null;
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);

    pendingController.current?.abort();
    const controller = new AbortController();
    pendingController.current = controller;
    
    try {
      // Passwordless: only send username to the auth socket
      const socket = await connectAuthSocket(
        "login",
        {
          username: username.trim(),
        },
        { signal: controller.signal }
      );
      pendingController.current = null;
      setIsLoading(false);
      onLogin(username.trim(), socket);
    } catch (err) {
      pendingController.current = null;

      if ((err as DOMException)?.name === "AbortError") {
        setIsLoading(false);
        return;
      }

      console.error("Failed to connect to auth websocket", err);
      setIsLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect. Please try again."
      );
    }
  };
  

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-transparent border-none p-0 overflow-hidden [&>button]:hidden">
        <DialogTitle className="sr-only">Login to RetroChat</DialogTitle>
        <DialogDescription className="sr-only">Enter your username to access the chat</DialogDescription>
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateY: -15 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 20,
            duration: 0.6
          }}
          className="relative"
        >
          {/* Retro container with glowing border */}
          <div className="relative bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 border-2 border-purple-500/50 rounded-xl p-8 backdrop-blur-xl shadow-2xl shadow-purple-500/25">
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-transparent to-purple-500/20 rounded-xl blur-sm animate-pulse"></div>
            
            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="w-full h-full bg-[linear-gradient(rgba(147,51,234,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.5)_1px,transparent_1px)] bg-[size:12px_12px]"></div>
            </div>

            {/* Header */}
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8 relative z-10"
            >
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block"
              >
                <Terminal className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              </motion.div>
              <h1 className="text-2xl text-purple-100 font-mono tracking-wider mb-2">RETRO.CHAT</h1>
              <p className="text-purple-300 text-sm font-mono">SYSTEM.LOGIN</p>
            </motion.div>

            {/* Form */}
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-6 relative z-10"
            >
              {/* Username field */}
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label className="text-purple-200 font-mono text-sm tracking-wide flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>USERNAME</span>
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your handle..."
                    className="bg-gray-800/60 border-purple-500/30 text-purple-100 placeholder:text-purple-400 font-mono focus:border-purple-400 focus:ring-purple-400/20 pl-4 pr-4"
                    disabled={isLoading}
                  />
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  </motion.div>
                </div>
              </motion.div>

              {/* Passwordless: no password fields required */}

              {/* Submit button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  type="submit"
                  disabled={!username.trim() || isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border border-purple-500/30 text-white shadow-lg shadow-purple-500/25 font-mono tracking-wide relative overflow-hidden"
                >
                  {isLoading ? (
                    <motion.div 
                      className="flex items-center space-x-2"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Zap className="w-4 h-4" />
                      <span>CONNECTING...</span>
                    </motion.div>
                  ) : (
                    <span>ENTER.SYSTEM</span>
                  )}
                  
                  {/* Button glow effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </Button>
              </motion.div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-red-400 font-mono text-center"
                >
                  {error}
                </motion.p>
              )}

              {/* Passwordless flow: no toggle between login/register */}
            </motion.form>

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full"
                style={{
                  left: `${20 + i * 12}%`,
                  top: `${15 + (i % 2) * 60}%`,
                }}
                animate={{
                  y: [-10, 10, -10],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}