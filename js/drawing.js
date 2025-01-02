// SVG Drawing and Manipulation Module
export class DrawingManager {
  constructor(app) {
    this.app = app;
    this.SCALE = 20;
  }

  clearDrawing() {
    ['END_GRAIN_G', 'EDGE_GRAIN_G'].forEach(id => {
      const svgG = document.getElementById(id);
      svgG.parentNode.replaceChild(svgG.cloneNode(false), svgG);
    });
  }

  drawLayer(g, points, color, showOutlines) {
    const poly = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
    poly.setAttribute('points', points);
    
    if (showOutlines) {
      poly.setAttribute('stroke', 'black');
      poly.setAttribute('stroke-width', '0.5');
    }
    
    poly.setAttribute('fill', color);
    g.appendChild(poly);
  }

  calculateBoardDimensions(settings, layers) {
    const {
      sourceLength,
      sourceThickness,
      endgrainThickness,
      kerf
    } = settings;

    // Calculate number of endgrain layers
    let endgrainLayers = Math.floor(sourceLength / (endgrainThickness + kerf));
    if (endgrainThickness * (endgrainLayers + 1) + endgrainLayers * kerf <= sourceLength) {
      endgrainLayers++;
    }

    const endgrainLength = endgrainLayers * sourceThickness;
    const endgrainLeftover = sourceLength - (endgrainLayers * endgrainThickness + (endgrainLayers - 1) * kerf);

    return {
      endgrainLayers,
      endgrainLength,
      endgrainLeftover,
      scaledEdgeGrainLength: sourceLength * this.SCALE
    };
  }

  createLayerTemplate(layers, settings, woodInfos) {
    const {
      sourceThickness,
      showOutlines
    } = settings;

    const template = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    let leftY = 0;
    let rightY = 0;
    const leftX = 0;
    const rightX = sourceThickness * this.SCALE;
    const woodUsed = new Map();

    layers.forEach((layer, i) => {
      const newLeftY = leftY + layer.width * this.SCALE;
      const newRightY = leftY + (
        layer.width + sourceThickness * Math.tan(layer.trailingAngle * Math.PI / 180)
      ) * this.SCALE;

      if (newRightY < rightY) {
        this.app.notify(
          `The trailing angle of layer ${i + 1} is too low, or the trailing angle of layer ${i} is too high. This causes a bad cut.`,
          'error'
        );
      }

      // Draw end grain layer
      const endPoints = [
        `${leftX},${leftY}`,
        `${leftX},${newLeftY}`,
        `${rightX},${newRightY}`,
        `${rightX},${rightY}`
      ].join(' ');

      this.drawLayer(
        template,
        endPoints,
        woodInfos[layer.woodIndex].color,
        showOutlines
      );

      // Track wood usage
      if (!woodUsed.has(layer.woodIndex)) {
        woodUsed.set(layer.woodIndex, { used: 0, wasted: 0 });
      }
      const usage = woodUsed.get(layer.woodIndex);
      usage.used += settings.kerf + (Math.max(newLeftY, newRightY) - Math.min(leftY, rightY)) / this.SCALE;
      usage.wasted += settings.kerf + (Math.abs(newLeftY - newRightY) + Math.abs(leftY - rightY)) / this.SCALE;

      leftY = newLeftY;
      rightY = newRightY;
    });

    return {
      template,
      dimensions: {
        leftY,
        rightY,
        rightX
      },
      woodUsed
    };
  }

  applyLayerTransformations(template, svgEndG, dimensions, settings, boardDimensions) {
    const {
      flipEveryOther,
      rotateEveryOther,
      sourceThickness
    } = settings;

    const { endgrainLayers } = boardDimensions;
    const { rightX, leftY } = dimensions;

    for (let i = 0; i < endgrainLayers; i++) {
      const layer = template.cloneNode(true);
      let transform = `translate(${i * sourceThickness * this.SCALE},0)`;

      if ((i % 2) && rotateEveryOther) {
        const rX = rightX / 2;
        const rY = leftY / 2;
        transform += `,rotate(180,${rX},${rY})`;
      }

      if ((i % 2) && flipEveryOther) {
        const rX = rightX / 2;
        const rY = leftY / 2;
        transform += `,translate(${rX},${rY}),scale(-1,1),translate(${-rX},${-rY})`;
      }

      layer.setAttribute('transform', transform);
      svgEndG.appendChild(layer);
    }
  }

  drawEdgeGrain(svgEdgeG, layers, settings, woodInfos) {
    const { sourceLength, showOutlines } = settings;
    const scaledLength = sourceLength * this.SCALE;
    let currentY = 0;

    layers.forEach(layer => {
      const newY = currentY + layer.width * this.SCALE;
      const points = [
        `0,${currentY}`,
        `0,${newY}`,
        `${scaledLength},${newY}`,
        `${scaledLength},${currentY}`
      ].join(' ');

      this.drawLayer(
        svgEdgeG,
        points,
        woodInfos[layer.woodIndex].color,
        showOutlines
      );

      currentY = newY;
    });

    return currentY; // Final board width
  }

  updateViewBox(svgElement, dimensions) {
    const { width, height, offsetX = 0, offsetY = 0 } = dimensions;
    svgElement.setAttribute(
      'viewBox',
      `${offsetX} ${offsetY} ${width} ${height}`
    );
  }

  drawBoards() {
    this.clearDrawing();
    
    const layers = this.app.layerManager.getAllLayerInfos();
    if (!layers.length) return;

    const woodInfos = this.app.getAllWoodInfos();
    const settings = this.app.getSettings();
    const boardDimensions = this.calculateBoardDimensions(settings, layers);

    // Draw end grain board
    const svgEndG = document.getElementById('END_GRAIN_G');
    const { template, dimensions, woodUsed } = this.createLayerTemplate(layers, settings, woodInfos);
    
    this.applyLayerTransformations(
      template,
      svgEndG,
      dimensions,
      settings,
      boardDimensions
    );

    // Draw edge grain board
    const svgEdgeG = document.getElementById('EDGE_GRAIN_G');
    const boardWidth = this.drawEdgeGrain(svgEdgeG, layers, settings, woodInfos);

    // Calculate final dimensions and update viewboxes
    const scaledBoardWidth = Math.max(dimensions.leftY, dimensions.rightY);
    const scaledEndGrainLength = dimensions.rightX * boardDimensions.endgrainLayers;
    const scaledMaxBoardLength = Math.max(scaledEndGrainLength, boardDimensions.scaledEdgeGrainLength);
    const maxDim = Math.max(scaledMaxBoardLength, scaledBoardWidth);

    this.updateViewBox(svgEndG.parentNode, {
      width: maxDim,
      height: maxDim,
      offsetX: (scaledEndGrainLength - maxDim) / 2,
      offsetY: (scaledBoardWidth - maxDim) / 2
    });

    this.updateViewBox(svgEdgeG.parentNode, {
      width: maxDim,
      height: maxDim,
      offsetX: (boardDimensions.scaledEdgeGrainLength - maxDim) / 2,
      offsetY: (boardWidth - maxDim) / 2
    });

    // Update measurements display
    this.updateMeasurements(dimensions, boardDimensions, woodUsed, woodInfos);
  }

  updateMeasurements(dimensions, boardDimensions, woodUsed, woodInfos) {
    const {
      endgrainLayers,
      endgrainLength,
      endgrainLeftover,
      scaledEdgeGrainLength
    } = boardDimensions;

    const scaledBoardWidth = Math.max(dimensions.leftY, dimensions.rightY);
    const scaledEndGrainLength = dimensions.rightX * endgrainLayers;

    // Update measurements
    document.getElementById("OUTPUT_BOARD_WIDTH").textContent =
      (scaledBoardWidth / this.SCALE).toFixed(3);
    document.getElementById("OUTPUT_END_BOARD_LENGTH").textContent =
      (scaledEndGrainLength / this.SCALE).toFixed(3);
    document.getElementById("OUTPUT_EDGE_BOARD_LENGTH").textContent =
      (scaledEdgeGrainLength / this.SCALE).toFixed(3);
    document.getElementById("OUTPUT_SLICES").textContent = endgrainLayers;
    document.getElementById("OUTPUT_LEFT_OVER").textContent =
      endgrainLeftover.toFixed(3);

    // Update wood usage
    const ul = document.getElementById("OUTPUT_WOOD_USED");
    ul.innerHTML = '';
    
    woodUsed.forEach((usage, woodIndex) => {
      const li = document.createElement('li');
      li.textContent = `${woodInfos[woodIndex].name}: ${usage.used.toFixed(3)} (${usage.wasted.toFixed(3)} lost to kerf or scraps)`;
      ul.appendChild(li);
    });
  }
} 