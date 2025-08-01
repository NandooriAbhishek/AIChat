import "./chatPage.css";
import NewPrompt from "../../components/newPrompt/NewPrompt";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imageKitio-react";
import React, { useEffect, useMemo } from "react";

const ChatPage = () => {
  const location = useLocation();

  const chatId = useMemo(() => {
    const parts = location.pathname.split("/");
    return parts[parts.length - 1] || null;
  }, [location.pathname]);

  const {
    isPending,
    error,
    data,
    refetch
  } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () =>
      fetch(`${import.meta.env.VITE_API_URL}/api/chats/${chatId}`, {
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch chat");
        return res.json();
      }),
    enabled: !!chatId, // ✅ only fetch when chatId is valid
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (chatId && !data) {
      refetch();
    }
  }, [chatId]);

  return (
    <div className="chatPage">
      <div className="wrapper">
        <div className="chat">
          {isPending ? (
            "Loading..."
          ) : error ? (
            <div className="error">Something went wrong! {error.message}</div>
          ) : data?.history?.length ? (
            data.history.map((message, i) => (
              <React.Fragment key={i}>
                {message.img && (
                  <IKImage
                    urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                    path={message.img}
                    height="300"
                    width="400"
                    transformation={[{ height: 300, width: 400 }]}
                    loading="lazy"
                    lqip={{ active: true, quality: 20 }}
                  />
                )}
                <div
                  className={
                    message.role === "user" ? "message user" : "message"
                  }
                >
                  <Markdown>{message.parts[0].text}</Markdown>
                </div>
              </React.Fragment>
            ))
          ) : (
            <div>No chat history yet. Ask a question below.</div>
          )}

          {data && <NewPrompt data={data} />}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
