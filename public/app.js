 // Inisialisasi peta dengan peta Indonesia real
const map = L.map('map', {
    center: [-2.5, 118],
    zoom: 5,
    zoomControl: false,
    attributionControl: false,
    minZoom: 4,
    maxZoom: 12
});

// Gunakan peta Indonesia dari Geoportal
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap'
}).addTo(map);

// Inisialisasi canvas
const canvas = document.getElementById('canvas-overlay');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('color-picker');
const brushSize = document.getElementById('brush-size');
const brushValue = document.getElementById('brush-value');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const clearBtn = document.getElementById('clear-btn');
const downloadBtn = document.getElementById('download-btn');
const userCount = document.getElementById('user-count');
const toggleSidebar = document.querySelector('.toggle-sidebar');
const sidebar = document.querySelector('.sidebar');

// Atur ukuran canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Variabel menggambar
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentColor = colorPicker.value;
let currentBrushSize = parseInt(brushSize.value);
let drawingHistory = [];
let historyIndex = -1;

// Event listeners untuk brush size
brushSize.addEventListener('input', () => {
    currentBrushSize = parseInt(brushSize.value);
    brushValue.textContent = currentBrushSize;
});

colorPicker.addEventListener('change', () => {
    currentColor = colorPicker.value;
});

// Fungsi menggambar kotak-kotak retro
function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    drawSquare(e.offsetX, e.offsetY);
    socket.emit('draw', {
        x: e.offsetX,
        y: e.offsetY,
        size: currentBrushSize,
        color: currentColor
    });
}

function draw(e) {
    if (!isDrawing) return;
    
    drawSquare(e.offsetX, e.offsetY);
    socket.emit('draw', {
        x: e.offsetX,
        y: e.offsetY,
        size: currentBrushSize,
        color: currentColor
    });
}

function drawSquare(x, y) {
    ctx.fillStyle = currentColor;
    const size = currentBrushSize;
    const gridX = Math.floor(x / size) * size;
    const gridY = Math.floor(y / size) * size;
    
    ctx.fillRect(gridX, gridY, size, size);
    
    // Efek retro glow
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(gridX, gridY, size, size);
    ctx.shadowBlur = 0;
    
    createParticle(x, y);
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        saveToHistory();
    }
}

// Event listeners canvas
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

// Touch events untuk mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    canvas.dispatchEvent(mouseEvent);
});

// Fungsi partikel animasi retro
function createParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.background = currentColor;
    document.body.appendChild(particle);
    
    // Animasi partikel retro
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    let opacity = 1;
    let size = 3 + Math.random() * 3;
    
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    const animate = () => {
        opacity -= 0.03;
        size -= 0.05;
        
        if (opacity <= 0 || size <= 0) {
            particle.remove();
            return;
        }
        
        const currentLeft = parseFloat(particle.style.left);
        const currentTop = parseFloat(particle.style.top);
        
        particle.style.left = (currentLeft + vx) + 'px';
        particle.style.top = (currentTop + vy) + 'px';
        particle.style.opacity = opacity;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        requestAnimationFrame(animate);
    };
    
    animate();
}

// Fungsi history
function saveToHistory() {
    if (historyIndex < drawingHistory.length - 1) {
        drawingHistory = drawingHistory.slice(0, historyIndex + 1);
    }
    
    drawingHistory.push(canvas.toDataURL());
    historyIndex = drawingHistory.length - 1;
    
    updateHistoryButtons();
}

function updateHistoryButtons() {
    undoBtn.classList.toggle('disabled', historyIndex <= 0);
    redoBtn.classList.toggle('disabled', historyIndex >= drawingHistory.length - 1);
}

// Undo/Redo
undoBtn.addEventListener('click', () => {
    if (historyIndex > 0) {
        historyIndex--;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = drawingHistory[historyIndex];
        updateHistoryButtons();
    }
});

redoBtn.addEventListener('click', () => {
    if (historyIndex < drawingHistory.length - 1) {
        historyIndex++;
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = drawingHistory[historyIndex];
        updateHistoryButtons();
    }
});

// Clear canvas
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
    socket.emit('clear');
});

// Download gambar
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'indodraw-live.png';
    link.href = canvas.toDataURL();
    link.click();
});

// Toggle sidebar
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    toggleSidebar.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
});

// Inisialisasi history
saveToHistory();
updateHistoryButtons();

// Koneksi WebSocket
const socket = io();

socket.on('connect', () => {
    console.log('Terhubung ke server');
});

socket.on('userCount', (count) => {
    userCount.textContent = count;
});

socket.on('draw', (data) => {
    ctx.fillStyle = data.color;
    const size = data.size;
    const gridX = Math.floor(data.x / size) * size;
    const gridY = Math.floor(data.y / size) * size;
    ctx.fillRect(gridX, gridY, size, size);
});

socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('loadDrawings', (drawings) => {
    drawings.forEach(data => {
        ctx.fillStyle = data.color;
        const size = data.size;
        const gridX = Math.floor(data.x / size) * size;
        const gridY = Math.floor(data.y / size) * size;
        ctx.fillRect(gridX, gridY, size, size);
    });
});

// Simulasi efek retro pada peta
map.on('zoomend', function() {
    const zoomLevel = map.getZoom();
    const tiles = document.querySelectorAll('.leaflet-tile');
    tiles.forEach(tile => {
        tile.style.filter = 'contrast(1.2) saturate(1.5)';
    });
});
