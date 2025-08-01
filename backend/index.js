  import express from "express";
  import ImageKit from "imagekit";
  import cors from "cors";
  import path from "path";
  import url, { fileURLToPath } from "url";
  import mongoose from "mongoose";
  import dotenv from "dotenv";
  import Chat from "./models/chat.js";
  import UserChats from "./models/userChats.js";
  import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

  const port = process.env.PORT || 3000;
  const app = express();

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    })
  );

  app.use(express.json());

  const connect = async () => {
    try {
      await mongoose.connect(process.env.MONGO);
      console.log("Connected to MongoDB");
    } catch (err) {
      console.log(err);
    }
  };

  const imagekit = new ImageKit({
    urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
  });

  app.get("/api/upload", (_req, res) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
  });

  app.post("/api/chats", ClerkExpressRequireAuth(), async (_req, res) => {
    const userId = _req.auth.userId;
    const { text } = _req.body;

    try {
      const newChat = new Chat({
        userId,
        history: [{ role: "user", parts: [{ text }] }],
      });

      const savedChat = await newChat.save();

      const userChats = await UserChats.findOne({ userId });

      if (!userChats) {
        const newUserChats = new UserChats({
          userId,
          chats: [
            {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          ],
        });
        await newUserChats.save();
      } else {
        await UserChats.updateOne(
          { userId },
          {
            $push: {
              chats: {
                _id: savedChat._id,
                title: text.substring(0, 40),
              },
            },
          }
        );
      }

      res.status(201).send(savedChat._id); // Always send chat ID
    } catch (err) {
      console.log(err);
      res.status(500).send("Error creating chat!");
    }
  });

  app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;

    try {
      const userChats = await UserChats.findOne({ userId });
      res.status(200).send(userChats?.chats || []);
    } catch (err) {
      console.log(err);
      res.status(500).send("Error fetching userchats!");
    }
  });

  app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;

    try {
      const chat = await Chat.findOne({ _id: req.params.id, userId });
      if (!chat) return res.status(404).send("Chat not found!");
      res.status(200).send(chat);
    } catch (err) {
      console.log(err);
      res.status(500).send("Error fetching chat!");
    }
  });

  app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;
    const { question, answer, img } = req.body;

    const newItems = [
      ...(question ? [{ role: "user", parts: [{ text: question }], ...(img ? { img } : {}) }] : []),
      { role: "model", parts: [{ text: answer }] },
    ];

    try {
      const updatedChat = await Chat.updateOne(
        { _id: req.params.id, userId },
        {
          $push: {
            history: { $each: newItems },
          },
        }
      );
      res.status(200).send(updatedChat);
    } catch (err) {
      console.log(err);
      res.status(500).send("Error adding conversation!");
    }
  });

  app.use((err, _req, res, next) => {
    console.error(err.stack);
    res.status(401).send("Unauthenticated!");
  });

  app.use(express.static(path.join(__dirname,"../client/dist")))

  app.get("*",(req,res)=>{
    res.sendFilepath.join(__dirname,"../client/dist", "index.html")
  })

  app.listen(port, () => {
    connect();
    console.log(`Server running on ${port}`);
  });
