const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
let drawing = false;
let lastX = 0;
let lastY = 0;

//canvas.addEventListener('click', () => {
//    console.log('The page was clicked! - canvas');
//});


// Start drawing when mouse is down
canvas.addEventListener('mousedown', (e) => {
    console.log("here");
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

    ctx.lineWidth = 5; // Set the line width
    ctx.lineCap = 'round'; // Set the line cap style
    ctx.strokeStyle = '#000000'; // Set the stroke color to black

    // Draw a line from the last position to the current position
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    ctx.beginPath(); // Begin a new path to avoid connecting lines
    ctx.moveTo(e.offsetX, e.offsetY); // Move to the current position
});
