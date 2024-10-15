const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
const bgColorInput = document.getElementById('bgColor') as HTMLInputElement;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const imageVisualization = document.getElementById('imageVisualization') as HTMLCanvasElement;

const ctx = canvas.getContext('2d')!;
const visualizationCtx = imageVisualization.getContext('2d')!;

let drawing = false;
let lastX = 0;
let lastY = 0;
let brushSize: number = 5; // Default brush size
let bgColor: string = '#ffffff'; // Default background color

// Function to set background color
function setBackgroundColor(color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Set the initial background color when the page loads
setBackgroundColor(bgColor);

// Update background color when the color picker changes
bgColorInput.addEventListener('input', () => {
    bgColor = bgColorInput.value;
    setBackgroundColor(bgColor);
});

// Update brush size when slider changes
brushSizeInput.addEventListener('input', () => {
    brushSize = parseInt(brushSizeInput.value, 10);
});

// Start drawing when mouse is down
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
    draw(e.offsetX, e.offsetY);
});

// Stop drawing when mouse is up or leaves the canvas
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

function stopDrawing() {
    drawing = false;
}

// Draw on canvas
canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    draw(e.offsetX, e.offsetY);
});

function draw(x: number, y: number) {
    const sourceX = Math.floor(x * (imageVisualization.width / canvas.width));
    const sourceY = Math.floor(y * (imageVisualization.height / canvas.height));
    const sourceWidth = Math.ceil(brushSize * (imageVisualization.width / canvas.width));
    const sourceHeight = Math.ceil(brushSize * (imageVisualization.height / canvas.height));

    ctx.drawImage(
        imageVisualization,
        sourceX, sourceY, sourceWidth, sourceHeight,
        x - brushSize / 2, y - brushSize / 2, brushSize, brushSize
    );

    // Visualize the brush position on the loaded image
    visualizationCtx.beginPath();
    visualizationCtx.arc(sourceX, sourceY, 5, 0, Math.PI * 2, false);
    visualizationCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    visualizationCtx.stroke();
}

// Image loading functionality
imageInput.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files![0];
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target!.result as string;

        img.onload = () => {
            // Resize and draw the image onto the visualization canvas
            const scale = Math.max(
                imageVisualization.width / img.width,
                imageVisualization.height / img.height
            );
            const newWidth = img.width * scale;
            const newHeight = img.height * scale;
            const offsetX = (imageVisualization.width - newWidth) / 2;
            const offsetY = (imageVisualization.height - newHeight) / 2;

            visualizationCtx.clearRect(0, 0, imageVisualization.width, imageVisualization.height);
            visualizationCtx.drawImage(img, offsetX, offsetY, newWidth, newHeight);
        };
    };

    reader.readAsDataURL(file);
});
