const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const brushSizeInput = document.getElementById('brushSize') as HTMLInputElement;
const bgColorInput = document.getElementById('bgColor') as HTMLInputElement;
const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const imageVisualization = document.getElementById('imageVisualization') as HTMLCanvasElement;
const brushTypeSelect = document.getElementById('brushType') as HTMLSelectElement;
const effectSelect = document.getElementById('effectSelect') as HTMLSelectElement;
const effectStrengthInput = document.getElementById('effectStrength') as HTMLInputElement;
const samplingMethodSelect = document.getElementById('samplingMethod') as HTMLSelectElement;
const samplingDirectionSelect = document.getElementById('samplingDirection') as HTMLSelectElement;
const undoButton = document.getElementById('undoButton') as HTMLButtonElement;
const forwardButton = document.getElementById('forwardButton') as HTMLButtonElement;
const resetButton = document.getElementById('resetButton') as HTMLButtonElement;

let brushBorderCanvas: HTMLCanvasElement;
let brushBorderCtx: CanvasRenderingContext2D;
let currentColumn: number = 0;
let currentRow: number = 0;
let columnDirection: 'down' | 'up' = 'down';
let showImageOnCanvas: boolean = false;
let stateHistory: ImageData[] = [];
let currentStateIndex: number = -1;

const ctx = canvas.getContext('2d')!;
const visualizationCtx = imageVisualization.getContext('2d')!;
const showImageCheckbox = document.getElementById('showImageCheckbox') as HTMLInputElement;
const MAX_HISTORY_STATES: number = 50; // Limit the number of stored states to prevent memory issues

brushBorderCanvas = document.createElement('canvas');
brushBorderCanvas.width = canvas.width;
brushBorderCanvas.height = canvas.height;
brushBorderCanvas.style.position = 'absolute';
brushBorderCanvas.style.pointerEvents = 'none';  // Make sure it doesn't interfere with mouse events
brushBorderCanvas.style.left = canvas.offsetLeft + 'px';
brushBorderCanvas.style.top = canvas.offsetTop + 'px';
brushBorderCtx = brushBorderCanvas.getContext('2d')!;
canvas.parentElement?.appendChild(brushBorderCanvas);

let drawing = false;
let lastX = 0;
let lastY = 0;
let brushSize: number = 50;
let bgColor: string = '#ffffff';
let brushType: 'circle' | 'square' | 'continuous' = 'continuous';
let currentEffect: 'none' | 'blur' | 'sharpen' | 'edgeDetection' = 'none';
let effectStrength: number = 5;
let samplingMethod: 'normal' | 'vertical' | 'horizontal' | 'random' = 'normal';
let samplingDirection: 'forward' | 'backward' = 'forward';
let samplingOffset: number = 0;
let lastSamplingTime: number = 0;
let originalImage: HTMLImageElement;
let drawingLayer: ImageData;

// Initialize drawing layer
function initDrawingLayer() {
    drawingLayer = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < drawingLayer.data.length; i += 4) {
        drawingLayer.data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
    // Save initial state
    saveState();
}

// Call this function after canvas is initialized
initDrawingLayer();

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

// Update effect type when select changes
effectSelect.addEventListener('change', () => {
    currentEffect = effectSelect.value as 'none' | 'blur' | 'sharpen' | 'edgeDetection';
});

// Update effect strength when slider changes
effectStrengthInput.addEventListener('input', () => {
    effectStrength = parseInt(effectStrengthInput.value, 10);
});

// Update sampling method when select changes
samplingMethodSelect.addEventListener('change', () => {
    samplingMethod = samplingMethodSelect.value as 'normal' | 'vertical' | 'horizontal' | 'random';
    samplingOffset = 0; // Reset offset when changing method
});

samplingDirectionSelect.addEventListener('change', () => {
    samplingDirection = samplingDirectionSelect.value as 'forward' | 'backward';
    samplingOffset = 0;
});

showImageCheckbox.addEventListener('change', (e) => {
    showImageOnCanvas = (e.target as HTMLInputElement).checked;
    resetCanvas(); // Redraw the canvas with the new setting
});

// Start drawing when mouse is down
canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    lastSamplingTime = Date.now(); // Initialize the last sampling time
    if (brushType !== 'continuous') {
        drawShape(e.offsetX, e.offsetY, 0); // Use 0 as initial speed
    }
});

// Stop drawing when mouse is up or leaves the canvas
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseleave', stopDrawing);

// Draw on canvas
canvas.addEventListener('mousemove', (e) => {
    if (drawing) {
        const currentTime = Date.now();
        const timeDiff = currentTime - lastSamplingTime;
        const speed = Math.sqrt((e.offsetX - lastX) ** 2 + (e.offsetY - lastY) ** 2) / timeDiff;
        
        if (brushType === 'continuous') {
            drawLine(lastX, lastY, e.offsetX, e.offsetY, speed);
        } else {
            drawShape(e.offsetX, e.offsetY, speed);
        }
        [lastX, lastY] = [e.offsetX, e.offsetY];
        lastSamplingTime = currentTime;
    }
    updateVisualization(e.offsetX, e.offsetY);
    updateBrushBorder(e.offsetX, e.offsetY); // Add this line
});

undoButton.addEventListener('click', handleUndo);
forwardButton.addEventListener('click', handleForward);

resetButton.addEventListener('click', function(e: MouseEvent) {
    e.preventDefault();
    if (confirm("Are you sure you want to clear your drawing? This action cannot be undone.")) {
        resetCanvas(); // Use the existing resetCanvas function
    }
});

function saveState() {
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Remove any states after the current index (in case we're undoing and then drawing)
    stateHistory = stateHistory.slice(0, currentStateIndex + 1);
    
    // Add new state
    stateHistory.push(currentState);
    currentStateIndex++;
    
    // Remove oldest states if we exceed the maximum
    if (stateHistory.length > MAX_HISTORY_STATES) {
        stateHistory.shift();
        currentStateIndex--;
    }
    
    // Update buttons state
    updateHistoryButtons();
}

function handleUndo() {
    if (currentStateIndex > 0) {
        currentStateIndex--;
        const previousState = stateHistory[currentStateIndex];
        
        // Restore the previous state
        ctx.putImageData(previousState, 0, 0);
        
        // Update the drawing layer to match the canvas state
        drawingLayer = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Update buttons state
        updateHistoryButtons();
    }
}

function handleForward() {
    if (currentStateIndex < stateHistory.length - 1) {
        currentStateIndex++;
        const nextState = stateHistory[currentStateIndex];
        
        // Restore the next state
        ctx.putImageData(nextState, 0, 0);
        
        // Update the drawing layer to match the canvas state
        drawingLayer = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Update buttons state
        updateHistoryButtons();
    }
}

function updateHistoryButtons() {
    undoButton.disabled = currentStateIndex <= 0;
    forwardButton.disabled = currentStateIndex >= stateHistory.length - 1;
}

function updateBrushBorder(x: number, y: number) {
    brushBorderCtx.clearRect(0, 0, canvas.width, canvas.height);
    brushBorderCtx.strokeStyle = 'red';
    brushBorderCtx.lineWidth = 2;

    if (brushType === 'circle' || brushType === 'continuous') {
        brushBorderCtx.beginPath();
        brushBorderCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        brushBorderCtx.stroke();
    } else if (brushType === 'square') {
        brushBorderCtx.strokeRect(
            x - brushSize / 2,
            y - brushSize / 2,
            brushSize,
            brushSize
        );
    }
}

function stopDrawing() {
    if (drawing) {
        saveState();
    }
    drawing = false;
    brushBorderCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawShape(x: number, y: number, speed: number) {
    const sourceX = Math.floor(x * (originalImage.width / canvas.width));
    const sourceY = Math.floor(y * (originalImage.height / canvas.height));
    const sourceWidth = Math.ceil(brushSize * (originalImage.width / canvas.width));
    const sourceHeight = Math.ceil(brushSize * (originalImage.height / canvas.height));

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = brushSize;
    tempCanvas.height = brushSize;

    sampleImage(tempCtx, sourceX, sourceY, sourceWidth, sourceHeight, speed);

    if (currentEffect !== 'none') {
        const imageData = tempCtx.getImageData(0, 0, brushSize, brushSize);
        const processedImageData = applyEffect(imageData, currentEffect, effectStrength);
        tempCtx.putImageData(processedImageData, 0, 0);
    }

    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.fillStyle = 'black';
    if (brushType === 'circle') {
        tempCtx.beginPath();
        tempCtx.arc(brushSize / 2, brushSize / 2, brushSize / 2, 0, Math.PI * 2);
        tempCtx.fill();
    } else if (brushType === 'square') {
        tempCtx.fillRect(0, 0, brushSize, brushSize);
    }

    ctx.drawImage(tempCanvas, x - brushSize / 2, y - brushSize / 2);
    updateDrawingLayer(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
}

function drawLine(fromX: number, fromY: number, toX: number, toY: number, speed: number) {
    const distance = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
    const steps = Math.ceil(distance);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = fromX + (toX - fromX) * t;
        const y = fromY + (toY - fromY) * t;
        drawPoint(x, y, speed);
    }
}

function drawPoint(x: number, y: number, speed: number) {
    const sourceX = Math.floor(x * (originalImage.width / canvas.width));
    const sourceY = Math.floor(y * (originalImage.height / canvas.height));
    const sourceWidth = Math.ceil(brushSize * (originalImage.width / canvas.width));
    const sourceHeight = Math.ceil(brushSize * (originalImage.height / canvas.height));

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCanvas.width = brushSize;
    tempCanvas.height = brushSize;

    sampleImage(tempCtx, sourceX, sourceY, sourceWidth, sourceHeight, speed);

    if (currentEffect !== 'none') {
        const imageData = tempCtx.getImageData(0, 0, brushSize, brushSize);
        const processedImageData = applyEffect(imageData, currentEffect, effectStrength);
        tempCtx.putImageData(processedImageData, 0, 0);
    }

    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.fillStyle = 'black';
    tempCtx.beginPath();
    tempCtx.arc(brushSize / 2, brushSize / 2, brushSize / 2, 0, Math.PI * 2);
    tempCtx.fill();

    ctx.drawImage(tempCanvas, x - brushSize / 2, y - brushSize / 2);
    updateDrawingLayer(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
}

function sampleImage(ctx: CanvasRenderingContext2D, sourceX: number, sourceY: number, sourceWidth: number, sourceHeight: number, speed: number) {
    const offsetSpeed = Math.ceil(speed * 50);
    let startX: number, startY: number, directionX: number, directionY: number;

    [startX, startY] = [0, 0];

    switch (samplingDirection) {
        case 'forward':
            [directionX, directionY] = [1, 1];
            break;
        case 'backward':
            [directionX, directionY] = [-1, -1];
            break;
    }

    switch (samplingMethod) {
        case 'normal':
            ctx.drawImage(originalImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, brushSize, brushSize);
            break;
        case 'vertical':
            samplingOffset += offsetSpeed * directionY;
            if (samplingOffset >= originalImage.height || samplingOffset < 0) {
                // Move to the next column
                currentColumn += directionX;
                if (currentColumn >= Math.floor(originalImage.width / sourceWidth) || currentColumn < 0) {
                    // Wrap around to the first/last column
                    currentColumn = directionX > 0 ? 0 : Math.floor(originalImage.width / sourceWidth) - 1;
                }
                // Reset the vertical offset
                samplingOffset = directionY > 0 ? 0 : originalImage.height - sourceHeight;
            }
            startX = currentColumn * sourceWidth;
            ctx.drawImage(originalImage, startX, samplingOffset, sourceWidth, sourceHeight, 0, 0, brushSize, brushSize);
            break;
        case 'horizontal':
            samplingOffset += offsetSpeed * directionX;
            if (samplingOffset >= originalImage.width || samplingOffset < 0) {
                // Move to the next row
                currentRow += directionY;
                if (currentRow >= Math.floor(originalImage.height / sourceHeight) || currentRow < 0) {
                    // Wrap around to the first/last row
                    currentRow = directionY > 0 ? 0 : Math.floor(originalImage.height / sourceHeight) - 1;
                }
                // Reset the horizontal offset
                samplingOffset = directionX > 0 ? 0 : originalImage.width - sourceWidth;
            }
            startY = currentRow * sourceHeight;
            ctx.drawImage(originalImage, samplingOffset, startY, sourceWidth, sourceHeight, 0, 0, brushSize, brushSize);
            break;
        case 'random':
            ctx.drawImage(originalImage, 
                Math.random() * (originalImage.width - sourceWidth), 
                Math.random() * (originalImage.height - sourceHeight), 
                sourceWidth, sourceHeight, 0, 0, brushSize, brushSize);
            break;
    }
}

function applyEffect(imageData: ImageData, effect: 'blur' | 'sharpen' | 'edgeDetection', strength: number): ImageData {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const outputData = new Uint8ClampedArray(data);

    switch (effect) {
        case 'blur':
            boxBlur(data, outputData, width, height, strength);
            break;
        case 'sharpen':
            sharpen(data, outputData, width, height, strength);
            break;
        case 'edgeDetection':
            edgeDetection(data, outputData, width, height, strength);
            break;
    }

    return new ImageData(outputData, width, height);
}

function boxBlur(input: Uint8ClampedArray, output: Uint8ClampedArray, width: number, height: number, radius: number) {
    const size = width * height;
    const kernelSize = (2 * radius + 1) ** 2;

    for (let i = 0; i < size; i++) {
        let r = 0, g = 0, b = 0, a = 0;
        const x = i % width;
        const y = Math.floor(i / width);

        for (let ky = -radius; ky <= radius; ky++) {
            for (let kx = -radius; kx <= radius; kx++) {
                const px = Math.min(width - 1, Math.max(0, x + kx));
                const py = Math.min(height - 1, Math.max(0, y + ky));
                const j = (py * width + px) * 4;
                r += input[j];
                g += input[j + 1];
                b += input[j + 2];
                a += input[j + 3];
            }
        }

        const pixelIndex = i * 4;
        output[pixelIndex] = r / kernelSize;
        output[pixelIndex + 1] = g / kernelSize;
        output[pixelIndex + 2] = b / kernelSize;
        output[pixelIndex + 3] = a / kernelSize;
    }
}

function sharpen(input: Uint8ClampedArray, output: Uint8ClampedArray, width: number, height: number, strength: number) {
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    applyConvolution(input, output, width, height, kernel, strength);
}

function edgeDetection(input: Uint8ClampedArray, output: Uint8ClampedArray, width: number, height: number, strength: number) {
    const kernel = [
        -1, -1, -1,
        -1, 8, -1,
        -1, -1, -1
    ];

    applyConvolution(input, output, width, height, kernel, strength);
}

function applyConvolution(input: Uint8ClampedArray, output: Uint8ClampedArray, width: number, height: number, kernel: number[], strength: number) {
    const size = width * height;
    const kernelSize = Math.sqrt(kernel.length);
    const halfKernel = Math.floor(kernelSize / 2);

    for (let i = 0; i < size; i++) {
        let r = 0, g = 0, b = 0;
        const x = i % width;
        const y = Math.floor(i / width);

        for (let ky = 0; ky < kernelSize; ky++) {
            for (let kx = 0; kx < kernelSize; kx++) {
                const px = Math.min(width - 1, Math.max(0, x + kx - halfKernel));
                const py = Math.min(height - 1, Math.max(0, y + ky - halfKernel));
                const j = (py * width + px) * 4;
                const kernelValue = kernel[ky * kernelSize + kx];
                r += input[j] * kernelValue;
                g += input[j + 1] * kernelValue;
                b += input[j + 2] * kernelValue;
            }
        }

        const pixelIndex = i * 4;
        output[pixelIndex] = Math.min(255, Math.max(0, input[pixelIndex] + (r - input[pixelIndex]) * (strength / 10)));
        output[pixelIndex + 1] = Math.min(255, Math.max(0, input[pixelIndex + 1] + (g - input[pixelIndex + 1]) * (strength / 10)));
        output[pixelIndex + 2] = Math.min(255, Math.max(0, input[pixelIndex + 2] + (b - input[pixelIndex + 2]) * (strength / 10)));
        output[pixelIndex + 3] = input[pixelIndex + 3];
    }
}

function updateVisualization(x: number, y: number) {
    visualizationCtx.clearRect(0, 0, imageVisualization.width, imageVisualization.height);
    
    if (originalImage) {
        visualizationCtx.drawImage(originalImage, 0, 0, imageVisualization.width, imageVisualization.height);
    }

    const sourceX = Math.floor(x * (originalImage.width / canvas.width));
    const sourceY = Math.floor(y * (originalImage.height / canvas.height));
    const sourceWidth = Math.ceil(brushSize * (originalImage.width / canvas.width));
    const sourceHeight = Math.ceil(brushSize * (originalImage.height / canvas.height));

    let startX: number, startY: number;

    [startX, startY] = [0, 0];

    // Calculate current sampling position based on offset
    let currentX = 0;
    let currentY = 0;
    switch (samplingMethod) {
        case 'vertical':
            currentY = (startY + samplingOffset) % originalImage.height;
            break;
        case 'horizontal':
            currentX = (startX + samplingOffset) % originalImage.width;
            break;
        case 'random':
            currentX = Math.random() * (originalImage.width - sourceWidth);
            currentY = Math.random() * (originalImage.height - sourceHeight);
            break;
    }

    visualizationCtx.lineWidth = 2;

    if (samplingMethod !== 'normal') {
        // Use a different color for non-normal sampling methods
        visualizationCtx.strokeStyle = 'blue';
        visualizationCtx.fillStyle = 'rgba(0, 0, 255, 0.3)'; // Semi-transparent blue

        let scaledX: number, scaledY: number;
        
        switch (samplingMethod) {
            case 'vertical':
                scaledX = currentColumn * sourceWidth * (imageVisualization.width / originalImage.width);
                scaledY = samplingOffset * (imageVisualization.height / originalImage.height);
                break;
            case 'horizontal':
                scaledX = samplingOffset * (imageVisualization.width / originalImage.width);
                scaledY = currentRow * sourceHeight * (imageVisualization.height / originalImage.height);
                break;
            default:
                scaledX = currentX * (imageVisualization.width / originalImage.width);
                scaledY = currentY * (imageVisualization.height / originalImage.height);
        }

        const scaledWidth = sourceWidth * (imageVisualization.width / originalImage.width);
        const scaledHeight = sourceHeight * (imageVisualization.height / originalImage.height);

        // Draw the sampling area based on brush type
        if (brushType === 'circle' || brushType === 'continuous') {
            visualizationCtx.beginPath();
            visualizationCtx.arc(scaledX + scaledWidth / 2, scaledY + scaledHeight / 2, scaledWidth / 2, 0, Math.PI * 2);
            visualizationCtx.fill();
            visualizationCtx.stroke();
        } else if (brushType === 'square') {
            visualizationCtx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
            visualizationCtx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        }

        // Draw arrow to indicate sampling direction
        const arrowSize = 10;
        visualizationCtx.beginPath();
        visualizationCtx.moveTo(scaledX + scaledWidth / 2, scaledY + scaledHeight / 2);

        let endX = scaledX + scaledWidth / 2;
        let endY = scaledY + scaledHeight / 2;

        switch (samplingMethod) {
            case 'vertical':
                endY += samplingDirection === 'forward' ? arrowSize : -arrowSize;
                break;
            case 'horizontal':
                endX += samplingDirection === 'forward' ? arrowSize : -arrowSize;
                break;
        }

        visualizationCtx.lineTo(endX, endY);
        visualizationCtx.stroke();

        // Draw arrowhead
        visualizationCtx.beginPath();
        if (samplingMethod === 'vertical') {
            visualizationCtx.moveTo(endX - 5, endY - (samplingDirection === 'forward' ? 5 : -5));
            visualizationCtx.lineTo(endX, endY);
            visualizationCtx.lineTo(endX + 5, endY - (samplingDirection === 'forward' ? 5 : -5));
        } else if (samplingMethod === 'horizontal') {
            visualizationCtx.moveTo(
                endX * (imageVisualization.width / originalImage.width) - (samplingDirection === 'forward' ? -5 : 5),
                (currentY + sourceHeight / 2 - 5) * (imageVisualization.height / originalImage.height)
            );
            visualizationCtx.lineTo(
                endX * (imageVisualization.width / originalImage.width),
                (currentY + sourceHeight / 2) * (imageVisualization.height / originalImage.height)
            );
            visualizationCtx.lineTo(
                endX * (imageVisualization.width / originalImage.width) - (samplingDirection === 'forward' ? -5 : 5),
                (currentY + sourceHeight / 2 + 5) * (imageVisualization.height / originalImage.height)
            );
        }
        visualizationCtx.fill();
    }

    // Always show brush visualization based on mouse movement
    visualizationCtx.strokeStyle = 'red';
    const scaledX = x * (imageVisualization.width / canvas.width);
    const scaledY = y * (imageVisualization.height / canvas.height);
    const scaledBrushSize = brushSize * (imageVisualization.width / canvas.width);

    if (brushType === 'circle' || brushType === 'continuous') {
        visualizationCtx.beginPath();
        visualizationCtx.arc(scaledX, scaledY, scaledBrushSize / 2, 0, Math.PI * 2);
        visualizationCtx.stroke();
    } else if (brushType === 'square') {
        visualizationCtx.strokeRect(
            scaledX - scaledBrushSize / 2,
            scaledY - scaledBrushSize / 2,
            scaledBrushSize,
            scaledBrushSize
        );
    }
}

// Image loading functionality
imageInput.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files![0];
    const reader = new FileReader();

    reader.onload = (e) => {
        originalImage = new Image();
        originalImage.src = e.target!.result as string;

        originalImage.onload = () => {
            // Always show image in visualization canvas
            resizeAndDrawImage(imageVisualization, visualizationCtx);
            
            // Only show in main canvas if the checkbox is checked
            resizeAndDrawImage(canvas, ctx);
        };
    };

    reader.readAsDataURL(file);
});

function resizeAndDrawImage(targetCanvas: HTMLCanvasElement, targetCtx: CanvasRenderingContext2D) {
    // Calculate the scaling factor to fit the image within the canvas
    const scale = Math.min(
        targetCanvas.width / originalImage.width,
        targetCanvas.height / originalImage.height
    );
    const newWidth = originalImage.width * scale;
    const newHeight = originalImage.height * scale;
    const offsetX = (targetCanvas.width - newWidth) / 2;
    const offsetY = (targetCanvas.height - newHeight) / 2;

    // Clear the canvas
    targetCtx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    
    // Only draw the image if it's the visualization canvas or if showImageOnCanvas is true
    if (targetCanvas === imageVisualization || (targetCanvas === canvas && showImageOnCanvas)) {
        targetCtx.drawImage(originalImage, offsetX, offsetY, newWidth, newHeight);
    } else {
        // If it's the main canvas and we're not showing the image, set the background color
        setBackgroundColor(bgColor);
    }
}

// Modify the updateDrawingLayer function
function updateDrawingLayer(x: number, y: number, width: number, height: number) {
    const drawnContent = ctx.getImageData(x, y, width, height);
    
    for (let i = 0; i < drawnContent.data.length; i += 4) {
        const drawingLayerIndex = ((y + Math.floor(i / (4 * width))) * canvas.width + x + (i / 4) % width) * 4;
        
        // If the pixel is not fully transparent in the drawn content
        if (drawnContent.data[i + 3] > 0) {
            // Copy the pixel to the drawing layer
            drawingLayer.data[drawingLayerIndex] = drawnContent.data[i];
            drawingLayer.data[drawingLayerIndex + 1] = drawnContent.data[i + 1];
            drawingLayer.data[drawingLayerIndex + 2] = drawnContent.data[i + 2];
            drawingLayer.data[drawingLayerIndex + 3] = drawnContent.data[i + 3];
        }
    }
}

// Modify the setBackgroundColor function
function setBackgroundColor(color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Redraw the content from the drawing layer
    ctx.putImageData(drawingLayer, 0, 0);
}

// Modify the resetCanvas function
function resetCanvas() {
    // Clear both the main canvas and the drawing layer immediately
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initDrawingLayer();
    
    if (originalImage && showImageOnCanvas) {
        resizeAndDrawImage(canvas, ctx);
    } else {
        setBackgroundColor(bgColor);
    }
    
    // Clear the brush border
    brushBorderCtx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset all sampling variables
    samplingOffset = 0;
    currentColumn = 0;
    currentRow = 0;    
    columnDirection = 'down';    
    
    // Reset the history state immediately
    stateHistory = [];
    currentStateIndex = -1;
    updateHistoryButtons();
    
    // Save the initial state of the cleared canvas
    saveState();
    
    // Reset the drawing flag to prevent any ongoing drawing operations
    drawing = false;
}

// Add mousemove event listener to canvas to update visualization even when not drawing
canvas.addEventListener('mousemove', (e) => {
    updateVisualization(e.offsetX, e.offsetY);
});

window.addEventListener('resize', () => {
    brushBorderCanvas.style.left = canvas.offsetLeft + 'px';
    brushBorderCanvas.style.top = canvas.offsetTop + 'px';
});
