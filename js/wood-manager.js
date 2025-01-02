// Wood and Layer Management Module
export class WoodManager {
  constructor(app) {
    this.app = app;
    this.woodList = null;
    this.numWoods = 0;
  }

  generateWoodList(woods) {
    const sel = document.createElement('select');
    sel.className = "WOOD_LIST_CLASS";
    woods.forEach((wood, i) => {
      const option = document.createElement('option');
      option.value = i;
      option.innerHTML = wood.name;
      sel.appendChild(option);
    });
    return sel;
  }

  getWoodList() {
    if (!this.woodList) {
      this.woodList = this.generateWoodList(this.app.getAllWoodInfos());
    }
    return this.woodList;
  }

  canRemoveWood(index) {
    const selections = Array.from(document.getElementsByClassName("WOOD_LIST_CLASS"));
    const inUse = selections.some(sel => parseInt(sel.value) === index);
    
    if (inUse) {
      const layer = selections.findIndex(sel => parseInt(sel.value) === index) + 1;
      this.app.notify(`That wood is in use at layer ${layer}.`, 'error');
      return false;
    }
    return true;
  }

  removeWoodFromLists(index) {
    const woodList = this.getWoodList();
    const selections = Array.from(document.getElementsByClassName("WOOD_LIST_CLASS"));
    
    selections.forEach(sel => {
      let value = parseInt(sel.value);
      if (value >= index) {
        value--;
      }
      const newSel = woodList.cloneNode(true);
      newSel.value = value.toString();
      sel.parentNode.replaceChild(newSel, sel);
    });
  }

  renameWood(index, name) {
    this.woodList = null;
    const selections = document.getElementsByClassName("WOOD_LIST_CLASS");
    Array.from(selections).forEach(sel => {
      sel.childNodes[index].innerHTML = name;
    });
  }

  addWoodToLists(name, index) {
    this.woodList = null;
    const selections = document.getElementsByClassName("WOOD_LIST_CLASS");
    const option = document.createElement('option');
    option.value = index;
    option.innerHTML = name;
    
    Array.from(selections).forEach(sel => {
      sel.appendChild(option.cloneNode(true));
    });
    return true;
  }

  addWoodToDOM(name, color) {
    const tr = document.createElement('tr');
    tr.className = 'wood-item';

    // Name input
    const nameCell = document.createElement('td');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = name;
    nameInput.addEventListener('change', (e) => {
      const index = this.getWoodIndex(tr);
      this.renameWood(index, e.target.value);
      this.app.recalculate();
    });
    nameCell.appendChild(nameInput);
    tr.appendChild(nameCell);

    // Color input
    const colorCell = document.createElement('td');
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = color;
    colorInput.addEventListener('change', () => this.app.recalculate());
    colorCell.appendChild(colorInput);
    tr.appendChild(colorCell);

    // Remove button
    const actionCell = document.createElement('td');
    actionCell.className = 'action';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'secondary';
    removeBtn.addEventListener('click', (e) => {
      const woodIndex = this.getWoodIndex(tr);
      if (this.canRemoveWood(woodIndex)) {
        this.woodList = null;
        tr.remove();
        this.numWoods--;
        this.removeWoodFromLists(woodIndex);
        this.app.recalculate();
      }
    });
    actionCell.appendChild(removeBtn);
    tr.appendChild(actionCell);

    // Add to DOM
    const body = document.getElementById("WOOD_INFO_BODY");
    body.appendChild(tr);
    this.addWoodToLists(name, this.numWoods++);
  }

  getWoodIndex(tr) {
    let woodIndex = 0;
    let child = tr.parentNode.firstChild;
    
    while (child !== tr) {
      if (child?.tagName?.toLowerCase() === 'tr') {
        woodIndex++;
      }
      child = child.nextSibling;
    }
    
    return woodIndex;
  }

  addDefaultWood() {
    this.addWoodToDOM("New Wood", "#808080");
  }
}

export class LayerManager {
  constructor(app) {
    this.app = app;
  }

  addLayerToDOM(woodIndex, width, trailingAngle, position) {
    const tr = document.createElement('tr');
    
    // Wood selection
    const woodCell = document.createElement('td');
    const woodSelect = this.app.woodManager.getWoodList().cloneNode(true);
    woodSelect.value = woodIndex;
    woodSelect.addEventListener('change', () => this.app.recalculate());
    woodCell.appendChild(woodSelect);
    tr.appendChild(woodCell);

    // Width input
    const widthCell = document.createElement('td');
    const widthInput = document.createElement('input');
    widthInput.type = 'number';
    widthInput.value = width;
    widthInput.step = 0.25;
    widthInput.min = 0;
    widthInput.addEventListener('change', () => this.app.recalculate());
    widthCell.appendChild(widthInput);
    tr.appendChild(widthCell);

    // Angle input
    const angleCell = document.createElement('td');
    const angleInput = document.createElement('input');
    angleInput.type = 'number';
    angleInput.value = trailingAngle;
    angleInput.step = 1;
    angleInput.min = -89;
    angleInput.max = 89;
    angleInput.addEventListener('change', () => this.app.recalculate());
    angleCell.appendChild(angleInput);
    tr.appendChild(angleCell);

    // Actions
    const actionsCell = document.createElement('td');
    actionsCell.className = 'layer-controls';

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'secondary';
    removeBtn.addEventListener('click', () => {
      tr.remove();
      this.app.recalculate();
    });
    actionsCell.appendChild(removeBtn);

    // Move up button
    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.addEventListener('click', () => {
      if (tr.previousElementSibling) {
        tr.parentNode.insertBefore(tr, tr.previousElementSibling);
        this.app.recalculate();
      }
    });
    actionsCell.appendChild(upBtn);

    // Move down button
    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.addEventListener('click', () => {
      if (tr.nextElementSibling) {
        tr.parentNode.insertBefore(tr.nextElementSibling, tr);
        this.app.recalculate();
      }
    });
    actionsCell.appendChild(downBtn);

    tr.appendChild(actionsCell);

    // Add to DOM
    const body = document.getElementById("LAYER_INFO_BODY");
    if (position) {
      body.insertBefore(tr, position);
    } else {
      body.appendChild(tr);
    }
  }

  addDefaultLayer() {
    this.addLayerToDOM(0, 1, 0);
    this.app.recalculate();
  }

  clearAllLayers() {
    const body = document.getElementById("LAYER_INFO_BODY");
    body.innerHTML = '';
    this.app.recalculate();
  }

  getAllLayerInfos() {
    const tbody = document.getElementById('LAYER_INFO_BODY');
    return Array.from(tbody.children)
      .filter(node => node.tagName.toLowerCase() === 'tr')
      .map(tr => {
        const woodIndex = parseInt(tr.children[0].firstChild.value);
        const width = parseFloat(tr.children[1].firstChild.value);
        const trailingAngle = parseFloat(tr.children[2].firstChild.value);
        return { woodIndex, width, trailingAngle };
      });
  }
} 