import { WoodManager, LayerManager } from './wood-manager.js';
import { DrawingManager } from './drawing.js';

// Constants
const VERSION = "3.0.0";
const DEFAULT_WOODS = [
  { color: "#6F0011", name: "Cherry" },
  { color: "#292117", name: "Ebony" },
  { color: "#B56816", name: "Jatoba" },
  { color: "#FDE96D", name: "Maple" },
  { color: "#AF0B7B", name: "Purpleheart" },
  { color: "#4B351A", name: "Walnut" }
];

const SAMPLE_LAYERS = [
  { woodIndex: 5, width: 1, trailingAngle: 0 },
  { woodIndex: 3, width: 0.25, trailingAngle: 0 },
  { woodIndex: 5, width: 0.25, trailingAngle: 0 },
  { woodIndex: 3, width: 0.25, trailingAngle: 0 },
  { woodIndex: 5, width: 1, trailingAngle: 0 },
  { woodIndex: 1, width: 0.5, trailingAngle: 0 },
  { woodIndex: 3, width: 1, trailingAngle: 0 },
  { woodIndex: 5, width: 0.25, trailingAngle: 0 },
  { woodIndex: 3, width: 0.25, trailingAngle: 0 },
  { woodIndex: 5, width: 0.25, trailingAngle: 0 },
  { woodIndex: 3, width: 1, trailingAngle: 0 }
];

class CuttingBoardDesigner {
  constructor() {
    this.woodManager = new WoodManager(this);
    this.layerManager = new LayerManager(this);
    this.drawingManager = new DrawingManager(this);
    
    this.undoStack = [];
    this.redoStack = [];
    
    this.initializeEventListeners();
    this.loadState();
    
    // Set version display
    document.getElementById("VERSION_DISPLAY").textContent = VERSION;
  }

  initializeEventListeners() {
    // Input change handlers
    document.querySelectorAll('.export').forEach(input => {
      input.addEventListener('change', () => this.recalculate());
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        } else if (e.key === 's') {
          e.preventDefault();
          this.saveDesign();
        }
      }
    });

    // Handle URL parameters on load
    window.addEventListener('load', () => {
      const params = new URLSearchParams(window.location.search);
      if (params.has('v')) {
        this.loadFromURL(params);
      }
    });
  }

  // State Management
  getSettings() {
    return {
      sourceLength: parseFloat(document.getElementById("SBL").value),
      sourceThickness: parseFloat(document.getElementById("SBT").value),
      endgrainThickness: parseFloat(document.getElementById("OBT").value),
      kerf: parseFloat(document.getElementById("BK").value),
      showOutlines: document.getElementById("SO").checked,
      flipEveryOther: document.getElementById("FEO").checked,
      rotateEveryOther: document.getElementById("REO").checked
    };
  }

  saveState() {
    const state = {
      version: VERSION,
      settings: this.getSettings(),
      woods: this.getAllWoodInfos(),
      layers: this.layerManager.getAllLayerInfos()
    };

    this.undoStack.push(JSON.stringify(state));
    this.redoStack = [];
    this.saveToLocalStorage();
  }

  loadState() {
    if (!this.loadFromURL(new URLSearchParams(window.location.search))) {
      if (!this.loadFromLocalStorage()) {
        this.loadDefaultState();
      }
    }
  }

  loadDefaultState() {
    DEFAULT_WOODS.forEach(wood => {
      this.woodManager.addWoodToDOM(wood.name, wood.color);
    });

    SAMPLE_LAYERS.forEach(layer => {
      this.layerManager.addLayerToDOM(layer.woodIndex, layer.width, layer.trailingAngle);
    });

    this.saveState();
  }

  // Storage Management
  saveToLocalStorage() {
    try {
      localStorage.setItem('cuttingBoardState', this.undoStack[this.undoStack.length - 1]);
    } catch (e) {
      this.notify('Failed to save to local storage', 'error');
    }
  }

  loadFromLocalStorage() {
    try {
      const savedState = localStorage.getItem('cuttingBoardState');
      if (savedState) {
        return this.loadStateFromJSON(savedState);
      }
    } catch (e) {
      this.notify('Failed to load from local storage', 'error');
    }
    return false;
  }

  // URL Management
  getStateAsURL() {
    const state = new URLSearchParams();
    state.set('v', VERSION);

    // Add settings
    const settings = this.getSettings();
    Object.entries(settings).forEach(([key, value]) => {
      state.set(key, value.toString());
    });

    // Add woods
    const woods = this.getAllWoodInfos();
    state.set('w', woods.map(w => 
      `${w.color.substring(1)},${encodeURIComponent(w.name)}`
    ).join('|'));

    // Add layers
    const layers = this.layerManager.getAllLayerInfos();
    state.set('l', layers.map(l =>
      `${l.woodIndex},${l.width},${l.trailingAngle}`
    ).join('|'));

    return `${window.location.pathname}?${state.toString()}`;
  }

  loadFromURL(params) {
    try {
      if (!params.has('v')) return false;

      const version = params.get('v').split('.')[0];
      if (version !== VERSION.split('.')[0]) {
        this.notify('Warning: Loading design from different version', 'warning');
      }

      // Load woods
      const woods = params.get('w').split('|').map(w => {
        const [color, name] = w.split(',');
        return {
          color: `#${color}`,
          name: decodeURIComponent(name)
        };
      });

      // Load layers
      const layers = params.get('l').split('|').map(l => {
        const [woodIndex, width, angle] = l.split(',');
        return {
          woodIndex: parseInt(woodIndex),
          width: parseFloat(width),
          trailingAngle: parseFloat(angle)
        };
      });

      // Load settings
      const settings = this.getSettings();
      Object.keys(settings).forEach(key => {
        if (params.has(key)) {
          const value = params.get(key);
          const element = document.getElementById(key);
          if (element.type === 'checkbox') {
            element.checked = value === '1';
          } else {
            element.value = value;
          }
        }
      });

      // Apply state
      this.loadStateFromData({ woods, layers });
      return true;
    } catch (e) {
      this.notify('Failed to load design from URL', 'error');
      return false;
    }
  }

  // State Loading
  loadStateFromJSON(json) {
    try {
      const state = JSON.parse(json);
      return this.loadStateFromData(state);
    } catch (e) {
      this.notify('Failed to parse state data', 'error');
      return false;
    }
  }

  loadStateFromData(state) {
    try {
      // Clear existing state
      document.getElementById("WOOD_INFO_BODY").innerHTML = '';
      document.getElementById("LAYER_INFO_BODY").innerHTML = '';

      // Load new state
      state.woods.forEach(wood => {
        this.woodManager.addWoodToDOM(wood.name, wood.color);
      });

      state.layers.forEach(layer => {
        this.layerManager.addLayerToDOM(
          layer.woodIndex,
          layer.width,
          layer.trailingAngle
        );
      });

      this.recalculate();
      return true;
    } catch (e) {
      this.notify('Failed to load state data', 'error');
      return false;
    }
  }

  // Undo/Redo
  undo() {
    if (this.undoStack.length > 1) {
      this.redoStack.push(this.undoStack.pop());
      this.loadStateFromJSON(this.undoStack[this.undoStack.length - 1]);
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const state = this.redoStack.pop();
      this.undoStack.push(state);
      this.loadStateFromJSON(state);
    }
  }

  // Utility Functions
  notify(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  getAllWoodInfos() {
    return Array.from(document.getElementById('WOOD_INFO_BODY').children)
      .filter(node => node.tagName.toLowerCase() === 'tr')
      .map(tr => ({
        name: tr.children[0].firstChild.value,
        color: tr.children[1].firstChild.value
      }));
  }

  recalculate() {
    this.drawingManager.drawBoards();
    this.saveState();
  }

  // Export Functions
  async saveDesign() {
    const url = this.getStateAsURL();
    try {
      await navigator.clipboard.writeText(url);
      this.notify('Design URL copied to clipboard');
    } catch (e) {
      this.notify('Failed to copy URL to clipboard', 'error');
      console.error(e);
    }
  }

  exportDesign(format) {
    this.drawingManager.exportDesign(format);
  }
}

// Initialize the application
window.app = new CuttingBoardDesigner(); 