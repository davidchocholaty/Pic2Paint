const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
const bgColorInput = document.getElementById('bgColor') as HTMLInputElement;

// Create an offscreen canvas to store drawings
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d')!;

// Set offscreen canvas size to match main canvas
offscreenCanvas.width = canvas.width;
offscreenCanvas.height = canvas.height;

let drawing = false;
let lastX = 0;
let lastY = 0;
let brushSize: number = 5; // Default brush size
let bgColor: string = '#ffffff'; // Default background color

// Function to set background color and redraw content
function setBackgroundColor(color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the canvas with the selected color
    ctx.drawImage(offscreenCanvas, 0, 0); // Draw the stored content on top
}

// Set the initial background color when the page loads
setBackgroundColor(bgColor);

// Update background color when the color picker changes
bgColorInput.addEventListener('input', () => {
    bgColor = bgColorInput.value; // Get the selected background color
    setBackgroundColor(bgColor); // Apply the new background color to the canvas
});

// Update brush size when slider changes
brushSizeInput.addEventListener('input', () => {
    brushSize = parseInt(brushSizeInput.value, 10); // Ensure brush size is an integer
});

// Start drawing when mouse is down
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
});

// Stop drawing when mouse is up
canvas.addEventListener('mouseup', () => {
    drawing = false;
    offscreenCtx.beginPath();
});

// Stop drawing when mouse leaves the canvas
canvas.addEventListener('mouseleave', () => {
    drawing = false;
    offscreenCtx.beginPath();
});

// Draw on canvas
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    
    offscreenCtx.lineWidth = brushSize;
    offscreenCtx.lineCap = 'round';
    offscreenCtx.strokeStyle = '#000000';
    
    // Draw on the offscreen canvas
    offscreenCtx.lineTo(e.offsetX, e.offsetY);
    offscreenCtx.stroke();
    offscreenCtx.beginPath();
    offscreenCtx.moveTo(e.offsetX, e.offsetY);
    
    // Update the main canvas
    setBackgroundColor(bgColor);
});
