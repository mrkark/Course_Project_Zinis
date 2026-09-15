// frontend/js/socket.js
// Требует, чтобы на странице был подключён <script src="/socket.io/socket.io.js">.
const appSocket = io({ withCredentials: true });

appSocket.on('connect_error', (err) => {
  console.warn('Socket.IO connection error:', err.message);
});
