<div align="center">
  <img src="[[https://i.imgur.com/your-logo-or-banner.png](https://i.imgur.com/TKvOXX6.jpeg)](https://i.imgur.com/TKvOXX6.jpeg)" alt="Visual Vibe Connector Logo" width="150"/>
  <h1>Visual Vibe Connector</h1>
  <p>
    <b>An interactive "Six Degrees" engine that discovers and visualizes the cinematic universe connecting any two actors.</b>
  </p>
  <p>
    Built for the <strong>Call2Code Hackathon</strong> with Node.js, Express, and a dynamic graph UI powered by vis-network.
  </p>
  <br>
  <a href="https://visual-vibe-project.vercel.app/">
    <img src="https://img.shields.io/badge/Live%20Demo-Visit%20Now-brightgreen?style=for-the-badge&logo=vercel" alt="Live Demo">
  </a>
</div>

---

> ## "We don't just give you an answer; we create a journey."
> Instead of a boring list of text, Visual Vibe Connector transforms movie trivia into a living, explorable graph. Discover the surprising paths that link your favorite stars, powered by a high-performance backend and a delightful, interactive user interface.

<br>

[![Visual Vibe Connector Screenshot]](https://github.com/Siddharth0-5/visual-vibe-project/blob/765d5777383df26ff0e4d88849b79d63606a6b00/Demo.jpg)

---

## ✨ Core Features

*   **⚡ High-Performance Bidirectional Search:** Finds even distant connections lightning-fast by searching from both actors simultaneously and meeting in the middle.
*   **🌐 Interactive Graph UI:** Powered by `vis-network`, the connection path is rendered as a dynamic, physics-based graph. Drag nodes, pan, and zoom to explore the cinematic universe.
*   **📡 Real-Time Search Feedback:** Never guess the app's status. We use **Server-Sent Events (SSE)** to push live updates like *"Searching connections for Chris Evans..."* directly from the server to your screen.
*   **🔒 Secure Backend Architecture:** A serverless Node.js backend protects our API keys using `.env` files. All external API calls are handled securely on the server, never exposing credentials to the client.
*   **🎬 Details on Demand:** Click any actor or movie node in the graph to get more information, such as movie overviews, ratings, and animated GIFs, fetched on the fly.

---

## 🛠️ Tech Stack & Architecture

This project is a modern full-stack application, separating concerns between a lightweight client and a powerful, secure server.

| Category      | Technology / Service                                                              |
|---------------|-----------------------------------------------------------------------------------|
| **Frontend**  | `HTML5`, `CSS3`, `Vanilla JavaScript (ES6+)`, `vis-network.js`                    |
| **Backend**   | `Node.js`, `Serverless Functions` (via Vercel)                                    |
| **APIs**      | `The Movie Database (TMDb)`, `GIPHY`                                              |
| **Hosting**   | `Vercel` (for deployment and environment variable management)                     |
| **Dev Tools** | `npm`, `axios`, `dotenv`, `git`                                                   |

---

## 🚀 Getting Started Locally

To run this project on your own machine, follow these steps.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or later)
- API keys from [TMDb](https://www.themoviedb.org/settings/api) and [GIPHY](https://developers.giphy.com/)

### Installation & Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-username/visual-vibe-project.git
    cd visual-vibe-project
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Set Up Environment Variables**
    - Create a file named `.env` in the root of the project.
    - Add your secret API keys to it:
      ```
      TMDB_API_KEY="YOUR_TMDB_KEY_HERE"
      GIPHY_API_KEY="YOUR_GIPHY_KEY_HERE"
      ```

4.  **Run the Development Server**
    - This project is configured for Vercel. To run it locally, install the Vercel CLI:
      ```bash
      npm i -g vercel
      ```
    - Start the local development server:
      ```bash
      vercel dev
      ```

5.  **Launch the App**
    - Open your browser and navigate to the local address provided by the Vercel CLI (usually `http://localhost:3000`).

---

## 🏆 Hackathon Highlights

-   **Innovation:** We went beyond a simple fetch-and-display model by implementing a complex bidirectional search algorithm and real-time server communication with SSE.
-   **User Experience:** The interactive graph and live feedback create a dynamic and engaging experience that encourages user exploration and curiosity.
-   **Technical Excellence:** The full-stack, serverless architecture demonstrates a modern, secure, and scalable approach to web development.
