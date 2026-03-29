# 🔍 The Weaver's Glass

**The Weaver's Glass** is a powerful Manifest V3 Chrome Extension and FastAPI backend suite that allows developers to precisely extract, clone, and map UI elements from any modern webpage.

Armed with a specialized Deep DOM Extraction Engine, it instantly captures visual components and seamlessly translates them into reusable raw HTML, CSS, React components, and Tailwind 3 JIT utility classes.

## ✨ Features

- **Deep CSS DOM Extraction**: Recursively traverses nested child elements and filters 60+ critical layout properties to guarantee a 1:1 visually perfect replication.
- **Precision Targeting**: Seamlessly navigate nested HTML container trees using `ArrowUp` and `ArrowDown` keyboard shortcuts with an active visual breadcrumb HUD.
- **React & Tailwind Compilers**: Instantly copy your captured element as a perfectly formatted React functional component, or inject extracted styles directly into tags using a heuristic Tailwind CSS JIT mapper. 
- **1-Click CodePen Exporting**: A lightweight API bridge that wraps your captured component and dynamically POSTs it to a fresh CodePen sandbox in a single click.
- **Visual Local Storage**: Persists high-fidelity screenshot thumbnails alongside your UI code using Chrome's native Canvas API combined with an asynchronous local SQLite database.

---

## 🚀 Installation & Usage

### 1. The Sanctuary (Backend API)
The backend is built with Python 3, FastAPI, and SQLAlchemy. It listens on port 8000.
1. Navigate to the `backend/` directory.
2. Install the lightweight dependencies: 
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic
   ```
3. Start the server (it will automatically generate your `weavers_glass.db`):
   ```bash
   python -m uvicorn main:app --port 8000
   ```

### 2. The Lens (Chrome Extension)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** to ON in the top right corner.
3. Click **Load unpacked** and select the `extension/` folder inside this repository.
4. Pin "The Weaver's Glass" to your Chrome toolbar for easy access.

### 3. Start Weaving!
1. Start the FastAPI server.
2. Navigate to your favorite styled webpage.
3. Click the extension icon and hit the **Capture Mode** button (or press `Ctrl+Shift+U`).
4. Hover your mouse over any beautiful UI element to highlight it in glassmorphic neon.
5. *(Optional)* Use your Up and Down keyboard arrow keys to precisely adjust the depth of the selection container!
6. Click to flawlessly extract the component.
7. Open your gallery to view, copy React/Tailwind code, or ship it directly to CodePen!

---

## 📜 License
This project is licensed under the Apache License 2.0. See the `LICENSE` file for more details.
