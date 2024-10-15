const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
const bgColorInput = document.getElementById('bgColor') as HTMLInputElement;

let drawing = false;
let lastX = 0;
let lastY = 0;
let brushSize: number = 5; // Default brush size
let bgColor: string = '#ffffff'; // Default background color

//canvas.addEventListener('click', () => {
//    console.log('The page was clicked! - canvas');
//});

// TODO barva background moznosti
// TODO potom asi uz nacitani fotky, atd.

// Function to set and redraw the background color
function setBackgroundColor(color: string) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire canvas
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Fill the canvas with the selected color
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
    lastX = e.offsetX; // Use offsetX for correct positioning
    lastY = e.offsetY;
});


// Stop drawing when mouse is up
canvas.addEventListener('mouseup', () => {
    drawing = false;
    ctx.beginPath(); // Begin a new path
});

// Stop drawing when mouse leaves the canvas
canvas.addEventListener('mouseleave', () => {
    drawing = false; // Set drawing to false
    ctx.beginPath(); // Start a new path
});

// Draw on canvas
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return; // Only draw if drawing is true

    ctx.lineWidth = brushSize; // Set the line width to the selected brush size
    ctx.lineCap = 'round'; // Set the line cap style
    ctx.strokeStyle = '#000000'; // Set the stroke color to black

    // Draw a line from the last position to the current position
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    ctx.beginPath(); // Begin a new path to avoid connecting lines
    ctx.moveTo(e.offsetX, e.offsetY); // Move to the current position
});
