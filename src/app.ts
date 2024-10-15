const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
const bgColorInput = document.getElementById('bgColor') as HTMLInputElement;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const imageVisualization = document.getElementById('imageVisualization') as HTMLCanvasElement;
const brushTypeSelect = document.getElementById('brushType') as HTMLSelectElement;

const ctx = canvas.getContext('2d')!;
const visualizationCtx = imageVisualization.getContext('2d')!;

let drawing = false;
let lastX = 0;
let lastY = 0;
let brushSize: number = 5; // Default brush size
let bgColor: string = '#ffffff'; // Default background color
let brushType: 'circle' | 'square' | 'continuous' = 'continuous'; // Default brush type

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

// Update brush type when select changes
brushTypeSelect.addEventListener('change', () => {
    brushType = brushTypeSelect.value as 'circle' | 'square' | 'continuous';
});

// Start drawing when mouse is down
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    if (brushType !== 'continuous') {
        drawShape(e.offsetX, e.offsetY);
    }
});

// Stop drawing when mouse is up or leaves the canvas
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

function stopDrawing() {
    drawing = false;
}

// Draw on canvas
canvas.addEventListener('mousemove', (e) => {
    updateVisualization(e.offsetX, e.offsetY);
    if (drawing) {
        if (brushType === 'continuous') {
            drawLine(lastX, lastY, e.offsetX, e.offsetY);
        } else {
            drawShape(e.offsetX, e.offsetY);
        }
        [lastX, lastY] = [e.offsetX, e.offsetY];
    }
});

function drawLine(fromX: number, fromY: number, toX: number, toY: number) {
    const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const steps = Math.ceil(distance);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = fromX + (toX - fromX) * t;
        const y = fromY + (toY - fromY) * t;
        drawPoint(x, y);
    }
}

function drawShape(x: number, y: number) {
    const sourceX = Math.floor(x * (originalImage.width / canvas.width));
    const sourceY = Math.floor(y * (originalImage.height / canvas.height));
    const sourceWidth = Math.ceil(brushSize * (originalImage.width / canvas.width));
    const sourceHeight = Math.ceil(brushSize * (originalImage.height / canvas.height));

    // Create a temporary canvas to hold the image data
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = brushSize;
    tempCanvas.height = brushSize;

    // Draw the image section onto the temporary canvas
    tempCtx.drawImage(
        originalImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, brushSize, brushSize
    );

    // Apply a shape mask
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.fillStyle = 'black';
    if (brushType === 'circle') {
        tempCtx.beginPath();
        tempCtx.arc(brushSize / 2, brushSize / 2, brushSize / 2, 0, Math.PI * 2);
        tempCtx.fill();
    } else if (brushType === 'square') {
        tempCtx.fillRect(0, 0, brushSize, brushSize);
    }

    // Draw the shaped image onto the main canvas
    ctx.drawImage(tempCanvas, x - brushSize / 2, y - brushSize / 2);
}

function drawPoint(x: number, y: number) {
    if (brushType === 'continuous') {
        const sourceX = Math.floor(x * (originalImage.width / canvas.width));
        const sourceY = Math.floor(y * (originalImage.height / canvas.height));
        const sourceWidth = Math.ceil(brushSize * (originalImage.width / canvas.width));
        const sourceHeight = Math.ceil(brushSize * (originalImage.height / canvas.height));

        // Create a temporary canvas to hold the image data
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCanvas.width = brushSize;
        tempCanvas.height = brushSize;

        // Draw the image section onto the temporary canvas
        tempCtx.drawImage(
            originalImage,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, brushSize, brushSize
        );

        // Apply a circular mask
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.fillStyle = 'black';
        tempCtx.beginPath();
        tempCtx.arc(brushSize / 2, brushSize / 2, brushSize / 2, 0, Math.PI * 2);
        tempCtx.fill();

        // Draw the shaped image onto the main canvas
        ctx.drawImage(tempCanvas, x - brushSize / 2, y - brushSize / 2);
    } else {
        drawShape(x, y);
    }
}

function updateVisualization(x: number, y: number) {
    // Clear previous visualization
    visualizationCtx.clearRect(0, 0, imageVisualization.width, imageVisualization.height);
    
    // Redraw the original image
    if (originalImage) {
        visualizationCtx.drawImage(originalImage, 0, 0, imageVisualization.width, imageVisualization.height);
    }

    // Draw the current brush position
    visualizationCtx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    
    const scaledX = x * (imageVisualization.width / canvas.width);
    const scaledY = y * (imageVisualization.height / canvas.height);
    const scaledBrushSize = brushSize * (imageVisualization.width / canvas.width);

    if (brushType === 'circle') {
        visualizationCtx.beginPath();
        visualizationCtx.arc(scaledX, scaledY, scaledBrushSize / 2, 0, Math.PI * 2);
        visualizationCtx.fill();
    } else if (brushType === 'square') {
        visualizationCtx.fillRect(
            scaledX - scaledBrushSize / 2,
            scaledY - scaledBrushSize / 2,
            scaledBrushSize,
            scaledBrushSize
        );
    } else { // continuous
        visualizationCtx.beginPath();
        visualizationCtx.arc(scaledX, scaledY, scaledBrushSize / 2, 0, Math.PI * 2);
        visualizationCtx.fill();
    }
}

// Store the original image
let originalImage: HTMLImageElement;

// Image loading functionality
imageInput.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files![0];
    const reader = new FileReader();

    reader.onload = (e) => {
        originalImage = new Image();
        originalImage.src = e.target!.result as string;

        originalImage.onload = () => {
            // Resize and draw the image onto the visualization canvas
            const scale = Math.max(
                imageVisualization.width / originalImage.width,
                imageVisualization.height / originalImage.height
            );
            const newWidth = originalImage.width * scale;
            const newHeight = originalImage.height * scale;
            const offsetX = (imageVisualization.width - newWidth) / 2;
            const offsetY = (imageVisualization.height - newHeight) / 2;

            visualizationCtx.clearRect(0, 0, imageVisualization.width, imageVisualization.height);
            visualizationCtx.drawImage(originalImage, offsetX, offsetY, newWidth, newHeight);
        };
    };

    reader.readAsDataURL(file);
});

// Add mousemove event listener to canvas to update visualization even when not drawing
canvas.addEventListener('mousemove', (e) => {
    updateVisualization(e.offsetX, e.offsetY);
});
