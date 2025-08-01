import { useNavigate } from 'react-router-dom';
import './dashboardPage.css';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const mutation = useMutation({
    mutationFn: (text) => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }).then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to create chat");
        }
        return res.json(); // expected to return chat ID
      });
    },
    onSuccess: (chatId) => {
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      navigate(`/dashboard/chats/${chatId}`);
    },
    onError: (err) => {
      console.error("Failed to create chat:", err.message);
      alert("Failed to create chat. Please try again.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputRef.current?.value?.trim();
    if (!text) return;

    mutation.mutate(text);
    inputRef.current.value = ""; // clear input after submit
  };

  return (
    <div className="dashboardPage">
      <div className="texts">
        <div className="logo">
          <img src="/logo.png" alt="logo" />
          <h4>AI CHAT</h4>
        </div>

        <div className="options">
          <div className="option">
            <img src="/chat.png" alt="chat" />
            <span>Create a New Chat</span>
          </div>
          <div className="option">
            <img src="/image.png" alt="image" />
            <span>Analyze Images</span>
          </div>
          <div className="option">
            <img src="/code.png" alt="code" />
            <span>Help me with my Code</span>
          </div>
        </div>
      </div>

      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="text"
            placeholder="Ask me anything..."
            ref={inputRef}
            disabled={mutation.isPending}
          />
          <button type="submit" disabled={mutation.isPending}>
            <img src="/arrow.png" alt="submit" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default DashboardPage;
