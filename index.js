import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, get, remove } from "firebase/database";

import OpenAI from "openai";
import { process } from "./env";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
  dangerouslyAllowBrowser: true, // For Frontend Usage
});

const appSettings = {
  databaseURL:
      "Your Firebase Realtime Database URL", //  Your Firebase Realtime Database URL
};

const app = initializeApp(appSettings);

const database = getDatabase(app);

const conversationInDb = ref(database);

const chatbotConversation = document.getElementById("chatbot-conversation");

const instructionObj = {
  role: "system",
  content: "You are a helpful assistant.",
};

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const userInput = document.getElementById("user-input");
  push(conversationInDb, {
    role: "user",
    content: userInput.value,
  });
  fetchReply();
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-human");
  chatbotConversation.appendChild(newSpeechBubble);
  newSpeechBubble.textContent = userInput.value;
  userInput.value = "";
  chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
});

function fetchReply() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      const conversationArr = Object.values(snapshot.val());
      conversationArr.unshift(instructionObj);
      const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: conversationArr,
        presence_penalty: 0,
        frequency_penalty: 0.3,
      });
      push(conversationInDb, chatCompletion.choices[0].message);
      renderTypewriterText(chatCompletion.choices[0].message.content);
    } else {
      console.log("No data available");
    }
  });
}

function renderTypewriterText(text) {
  const newSpeechBubble = document.createElement("div");
  newSpeechBubble.classList.add("speech", "speech-ai", "blinking-cursor");
  chatbotConversation.appendChild(newSpeechBubble);
  let i = 0;
  const interval = setInterval(() => {
    newSpeechBubble.textContent += text.slice(i - 1, i);
    if (text.length === i) {
      clearInterval(interval);
      newSpeechBubble.classList.remove("blinking-cursor");
    }
    i++;
    chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
  }, 50);
}

document.getElementById("clear-btn").addEventListener("click", () => {
  remove(conversationInDb);
  chatbotConversation.innerHTML =
    '<div class="speech speech-ai">How can I help you?</div>';
});

function renderConversationFromDb() {
  get(conversationInDb).then(async (snapshot) => {
    if (snapshot.exists()) {
      Object.values(snapshot.val()).forEach((dbObj) => {
        const newSpeechBubble = document.createElement("div");
        newSpeechBubble.classList.add(
          "speech",
          `speech-${dbObj.role === "user" ? "human" : "ai"}`
        );
        chatbotConversation.appendChild(newSpeechBubble);
        newSpeechBubble.textContent = dbObj.content;
      });
      chatbotConversation.scrollTop = chatbotConversation.scrollHeight;
    }
  });
}

renderConversationFromDb();
