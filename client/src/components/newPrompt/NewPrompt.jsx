import { useEffect, useRef, useState } from 'react';
import './newPrompt.css';
import Upload from '../upload/Upload';
import { IKImage } from 'imageKitio-react';
import Markdown from 'react-markdown';
import model from '../../lib/gemini';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ Utility to clean and flatten history
const prepareGeminiHistory = (rawHistory = []) => {
  return rawHistory
    .filter(
      (msg) =>
        msg &&
        typeof msg.role === "string" &&
        Array.isArray(msg.parts) &&
        msg.parts.length > 0 &&
        msg.parts[0]?.text
    )
    .map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts[0].text }],
    }))
    .filter((msg) => msg.role === "user" || msg.role === "model");
};

const NewPrompt = ({ data }) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const [error, setError] = useState(""); 
  const [img, setImg] = useState({
    isLoading: false,
    error: "",
    dbData: {},
    aiData: {},
  });

  const chat = model.startChat({
    history: prepareGeminiHistory(data?.history),
    generationConfig: {
      // maxOutputTokens: 100,
    },
  });

  const endRef = useRef(null);
  const formRef = useRef();

  useEffect(() => {
    endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [question, answer, img.dbData]);

  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`${import.meta.env.VITE_API_URL}/api/chats/${data._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.length ? question : undefined,
          answer,
          img: img.dbData?.filePath || undefined,
        }),
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", data._id] }).then(() => {
        formRef.current.reset();
        setQuestion("");
        setAnswer("");
        setImg({
          isLoading: false,
          error: "",
          dbData: {},
          aiData: {},
        });
      });
    },
    onError: (err) => {
      console.log(err);
    },
  });

  const add = async (text, isInitial) => {
    if (!isInitial) setQuestion(text);
    setIsLoading(true);
    try {
      const result = await chat.sendMessageStream(
        Object.entries(img.aiData).length ? [img.aiData, text] : [text]
      );
      let accumulatedText = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        console.log(chunkText);
        accumulatedText += chunkText;
        setAnswer(accumulatedText);
      }
      mutation.mutate();
    } catch (err) {
      console.log(err);
      setError("Failed to generate answer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = e.target.text.value;
    if (!text || isLoading) return;
    add(text, false);
  };

  // ✅ Trigger Gemini if one-message chat
  const hasRun = useRef(false);
  useEffect(() => {
    if (!hasRun.current) {
      if (data?.history?.length === 1 && data.history[0]?.parts?.[0]?.text) {
        add(data.history[0].parts[0].text, true);
      }
      hasRun.current = true;
    }
  }, []);

  return (
    <>
      <div className="messageContainer">
        {img.isLoading && <div className="message">Loading Image...</div>}
        {img.dbData?.filePath && (
          <div className="message user">
            <IKImage
              urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
              path={img.dbData?.filePath}
              width="300"
              transformation={[{ width: 300 }]}
            />
          </div>
        )}
        {question && <div className="message user">{question}</div>}
        {isLoading && (
          <div className="message">
            <div className="loader"></div>
          </div>
        )}
        {error && <div className="message error">{error}</div>}
        {answer && (
          <div className="message">
            <Markdown>{answer}</Markdown>
          </div>
        )}
      </div>

      <div className="endChat" ref={endRef}></div>
      <form className="newForm" onSubmit={handleSubmit} ref={formRef}>
        <Upload setImg={setImg} />
        <input id="file" type="file" multiple={false} hidden />
        <input
          type="text"
          name="text"
          placeholder={isLoading ? "Thinking..." : "Ask anything..."}
          disabled={isLoading}
        />
        <button disabled={isLoading}>
          <img src="/arrow.png" alt="" />
        </button>
      </form>
    </>
  );
};

export default NewPrompt;
