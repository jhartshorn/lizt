class LisztApp {
    constructor() {
        this.currentListId = null;
        this.lists = [];
        this.currentList = null;
        this.draggedItem = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadLists();
    }

    initializeElements() {
        this.listsView = document.getElementById('lists-view');
        this.listView = document.getElementById('list-view');
        this.listsGrid = document.querySelector('.lists-grid');
        this.backBtn = document.getElementById('back-btn');
        this.newListBtn = document.getElementById('new-list-btn');
        this.newListModal = document.getElementById('new-list-modal');
        this.listNameInput = document.getElementById('list-name-input');
        this.cancelBtn = document.getElementById('cancel-btn');
        this.createListBtn = document.getElementById('create-list-btn');
        this.listTitle = document.getElementById('list-title');
        this.deleteListBtn = document.getElementById('delete-list-btn');
        this.newItemInput = document.getElementById('new-item-input');
        this.addItemBtn = document.getElementById('add-item-btn');
        this.listItems = document.getElementById('list-items');
    }

    attachEventListeners() {
        this.backBtn.addEventListener('click', () => this.showListsView());
        this.newListBtn.addEventListener('click', () => this.showNewListModal());
        this.cancelBtn.addEventListener('click', () => this.hideNewListModal());
        this.createListBtn.addEventListener('click', () => this.createList());
        this.deleteListBtn.addEventListener('click', () => this.deleteCurrentList());
        this.addItemBtn.addEventListener('click', () => this.addItem());
        this.newItemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addItem();
        });
        this.listNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createList();
        });

        document.addEventListener('click', (e) => {
            if (e.target === this.newListModal) {
                this.hideNewListModal();
            }
        });
    }

    async loadLists() {
        try {
            const response = await fetch('/api/lists');
            this.lists = await response.json();
            this.renderLists();
        } catch (error) {
            console.error('Failed to load lists:', error);
        }
    }

    renderLists() {
        const existingTiles = this.listsGrid.querySelectorAll('.list-tile:not(.new-list-tile)');
        existingTiles.forEach(tile => tile.remove());

        this.lists.forEach(list => {
            const tile = this.createListTile(list);
            this.listsGrid.insertBefore(tile, this.newListBtn);
        });
    }

    createListTile(list) {
        const tile = document.createElement('div');
        tile.className = 'list-tile';
        tile.innerHTML = `
            <div class="list-name">${this.escapeHtml(list.name)}</div>
            <div class="list-meta">${list.items.length} items</div>
        `;
        tile.addEventListener('click', () => this.showList(list.id));
        return tile;
    }

    showNewListModal() {
        this.newListModal.classList.remove('hidden');
        this.listNameInput.focus();
    }

    hideNewListModal() {
        this.newListModal.classList.add('hidden');
        this.listNameInput.value = '';
    }

    async createList() {
        console.log('createList called');
        const name = this.listNameInput.value.trim();
        console.log('List name:', name);
        if (!name) {
            console.log('No name provided');
            return;
        }

        try {
            console.log('Sending request to /api/lists');
            const response = await fetch('/api/lists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name }),
            });

            console.log('Response status:', response.status);
            if (response.ok) {
                const newList = await response.json();
                console.log('New list created:', newList);
                this.lists.push(newList);
                this.renderLists();
                this.hideNewListModal();
            } else {
                console.error('Response not ok:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Failed to create list:', error);
        }
    }

    async showList(listId) {
        try {
            const response = await fetch(`/api/lists/${listId}`);
            this.currentList = await response.json();
            this.currentListId = listId;
            
            this.listTitle.textContent = this.currentList.name;
            this.renderListItems();
            
            this.listsView.classList.add('hidden');
            this.listView.classList.remove('hidden');
            this.backBtn.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to load list:', error);
        }
    }

    showListsView() {
        this.listView.classList.add('hidden');
        this.listsView.classList.remove('hidden');
        this.backBtn.classList.add('hidden');
        this.currentListId = null;
        this.currentList = null;
        this.loadLists();
    }

    async deleteCurrentList() {
        if (!this.currentListId) return;
        
        if (confirm('Are you sure you want to delete this list?')) {
            try {
                const response = await fetch(`/api/lists/${this.currentListId}`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    this.showListsView();
                }
            } catch (error) {
                console.error('Failed to delete list:', error);
            }
        }
    }

    async addItem() {
        const text = this.newItemInput.value.trim();
        if (!text || !this.currentList) return;

        const newItem = {
            id: Date.now().toString(),
            text,
            completed: false,
            order: this.currentList.items.length
        };

        this.currentList.items.push(newItem);
        await this.updateList();
        this.newItemInput.value = '';
        this.renderListItems();
    }

    async updateList() {
        if (!this.currentListId || !this.currentList) return;

        try {
            await fetch(`/api/lists/${this.currentListId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.currentList),
            });
        } catch (error) {
            console.error('Failed to update list:', error);
        }
    }

    renderListItems() {
        if (!this.currentList) return;

        this.listItems.innerHTML = '';
        
        this.currentList.items
            .sort((a, b) => a.order - b.order)
            .forEach(item => {
                const li = this.createListItem(item);
                this.listItems.appendChild(li);
            });
    }

    createListItem(item) {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.draggable = true;
        li.dataset.itemId = item.id;
        
        li.innerHTML = `
            <div class="drag-handle">⋮⋮</div>
            <input type="checkbox" class="item-checkbox" ${item.completed ? 'checked' : ''}>
            <span class="item-text ${item.completed ? 'completed' : ''}">${this.escapeHtml(item.text)}</span>
            <button class="item-delete">×</button>
        `;

        const checkbox = li.querySelector('.item-checkbox');
        const deleteBtn = li.querySelector('.item-delete');
        const textSpan = li.querySelector('.item-text');

        checkbox.addEventListener('change', async () => {
            item.completed = checkbox.checked;
            textSpan.classList.toggle('completed', item.completed);
            await this.updateList();
        });

        deleteBtn.addEventListener('click', async () => {
            this.currentList.items = this.currentList.items.filter(i => i.id !== item.id);
            await this.updateList();
            this.renderListItems();
        });

        this.addDragAndDropListeners(li, item);

        return li;
    }

    addDragAndDropListeners(li, item) {
        li.addEventListener('dragstart', (e) => {
            this.draggedItem = item;
            li.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            this.draggedItem = null;
            document.querySelectorAll('.list-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        });

        li.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (this.draggedItem && this.draggedItem.id !== item.id) {
                li.classList.add('drag-over');
            }
        });

        li.addEventListener('dragleave', () => {
            li.classList.remove('drag-over');
        });

        li.addEventListener('drop', async (e) => {
            e.preventDefault();
            li.classList.remove('drag-over');
            
            if (this.draggedItem && this.draggedItem.id !== item.id) {
                await this.reorderItems(this.draggedItem, item);
            }
        });
    }

    async reorderItems(draggedItem, targetItem) {
        const items = this.currentList.items;
        const draggedIndex = items.findIndex(i => i.id === draggedItem.id);
        const targetIndex = items.findIndex(i => i.id === targetItem.id);

        items.splice(draggedIndex, 1);
        const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        items.splice(newTargetIndex, 0, draggedItem);

        items.forEach((item, index) => {
            item.order = index;
        });

        await this.updateList();
        this.renderListItems();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LisztApp();
});