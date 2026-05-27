function textToCroppedDataUri(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set initial size large enough for standard text
    canvas.width = 500;
    canvas.height = 100;
    
    // Render text
    ctx.font = `36px C64`;
    ctx.textBaseline = 'top';
    ctx.fillText(text, 0, 0);
    
    // Get image data to scan pixels
    const textWidth = Math.ceil(ctx.measureText(text).width);
    const imgData = ctx.getImageData(0, 0, textWidth, 60);
    const data = imgData.data;
    
    // Find boundaries of non-transparent pixels
    let minX = textWidth, maxX = 0, minY = 60, maxY = 0;
    
    for (let y = 0; y < 60; y++) {
        for (let x = 0; x < textWidth; x++) {
            const alpha = data[(y * textWidth + x) * 4 + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    
    // Handle empty text case
    if (maxX < minX || maxY < minY) return canvas.toDataURL();
    
    // Crop to a temporary canvas
    const cropCanvas = document.createElement('canvas');
    const w = (maxX - minX) + 1;
    const h = (maxY - minY) + 1;
    cropCanvas.width = w;
    cropCanvas.height = h;
    
    cropCanvas.getContext('2d').putImageData(imgData, -minX, -minY, minX, minY, w, h);
    return cropCanvas.toDataURL();
}
