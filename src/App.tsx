import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChatRoom } from "./components/ChatRoom";
import { LoginDialog } from "./components/LoginDialog";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      chatSocket?.close(1000, "App unmounted");
    };
  }, [chatSocket]);

  useEffect(() => {
    if (!chatSocket) return;

    const handleClose = (event: CloseEvent) => {
      if (event.reason === "Replaced by a new session" || event.reason === "App unmounted") {
        return;
      }

      setIsLoggedIn(false);
      setCurrentUser("");
      setChatSocket(null);
    };

    chatSocket.addEventListener("close", handleClose);

    return () => {
      chatSocket.removeEventListener("close", handleClose);
    };
  }, [chatSocket]);

  const handleLogin = (username: string, socket: WebSocket) => {
    if (chatSocket && chatSocket !== socket) {
      try {
        chatSocket.close(1000, "Replaced by a new session");
      } catch (error) {
        console.warn("Failed to close previous websocket", error);
      }
    }

    setCurrentUser(username);
    setChatSocket(socket);
    setIsLoggedIn(true);
  };

  return (
    <div className="dark">
      <LoginDialog 
        isOpen={!isLoggedIn} 
        onLogin={handleLogin}
      />
      
      {isLoggedIn && chatSocket && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut"
          }}
        >
          <ChatRoom currentUser={currentUser} socket={chatSocket} />
        </motion.div>
      )}
    </div>
  );
}