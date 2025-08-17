class LisztApp {
    constructor() {
        this.currentListId = null;
        this.lists = [];
        this.currentList = null;
        this.draggedItem = null;
        this.touchStartY = 0;
        this.touchStartElement = null;
        this.placeholder = null;
        
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
        this.exportListBtn = document.getElementById('export-list-btn');
        this.deleteListBtn = document.getElementById('delete-list-btn');
        this.newItemInput = document.getElementById('new-item-input');
        this.addItemBtn = document.getElementById('add-item-btn');
        this.listItems = document.getElementById('list-items');
        this.tagsModal = document.getElementById('tags-modal');
        this.currentTagsList = document.getElementById('current-tags-list');
        this.newTagInput = document.getElementById('new-tag-input');
        this.addTagBtn = document.getElementById('add-tag-btn');
        this.suggestedTagsList = document.getElementById('suggested-tags-list');
        this.cancelTagsBtn = document.getElementById('cancel-tags-btn');
        this.saveTagsBtn = document.getElementById('save-tags-btn');
    }

    attachEventListeners() {
        this.backBtn.addEventListener('click', () => this.showListsView());
        this.newListBtn.addEventListener('click', () => this.showNewListModal());
        this.cancelBtn.addEventListener('click', () => this.hideNewListModal());
        this.createListBtn.addEventListener('click', () => this.createList());
        this.exportListBtn.addEventListener('click', () => this.exportList());
        this.deleteListBtn.addEventListener('click', () => this.deleteCurrentList());
        this.addItemBtn.addEventListener('click', () => this.addItem());
        this.newItemInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addItem();
        });
        this.listNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createList();
        });

        this.addTagBtn.addEventListener('click', () => this.addNewTag());
        this.newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewTag();
        });
        this.cancelTagsBtn.addEventListener('click', () => this.hideTagsModal());
        this.saveTagsBtn.addEventListener('click', () => this.saveItemTags());

        document.addEventListener('click', (e) => {
            if (e.target === this.newListModal) {
                this.hideNewListModal();
            }
            if (e.target === this.tagsModal) {
                this.hideTagsModal();
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

    exportList() {
        if (!this.currentListId) return;
        
        const link = document.createElement('a');
        link.href = `/api/lists/${this.currentListId}/export`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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
            order: this.currentList.items.length,
            tags: this.extractHashtags(text)
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
            <div class="drag-handle">
                <div class="drag-line"></div>
                <div class="drag-line"></div>
                <div class="drag-line"></div>
            </div>
            <input type="checkbox" class="item-checkbox" ${item.completed ? 'checked' : ''}>
            <span class="item-text ${item.completed ? 'completed' : ''}">${this.getDisplayText(item)}</span>
            <input type="text" class="item-edit-input hidden" value="${this.escapeHtml(item.text)}" maxlength="200">
            <button class="item-tags">🏷️</button>
            <button class="item-delete">×</button>
        `;

        const checkbox = li.querySelector('.item-checkbox');
        const deleteBtn = li.querySelector('.item-delete');
        const tagsBtn = li.querySelector('.item-tags');
        const textSpan = li.querySelector('.item-text');
        const editInput = li.querySelector('.item-edit-input');
        const dragHandle = li.querySelector('.drag-handle');

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

        tagsBtn.addEventListener('click', () => {
            this.showTagsModal(item);
        });

        textSpan.addEventListener('click', () => {
            this.startEditing(item, textSpan, editInput);
        });

        editInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveEdit(item, editInput, textSpan);
            } else if (e.key === 'Escape') {
                this.cancelEdit(item, editInput, textSpan);
            }
        });

        editInput.addEventListener('blur', () => {
            this.saveEdit(item, editInput, textSpan);
        });

        this.addDragAndDropListeners(li, item);
        this.addTouchListeners(dragHandle, li, item);

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

    addTouchListeners(dragHandle, li, item) {
        dragHandle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchStartY = e.touches[0].clientY;
            this.touchStartElement = li;
            this.draggedItem = item;
            
            li.classList.add('dragging');
            
            // Create placeholder
            this.placeholder = li.cloneNode(true);
            this.placeholder.classList.add('placeholder');
            this.placeholder.style.opacity = '0.5';
        }, { passive: false });

        dragHandle.addEventListener('touchmove', (e) => {
            if (!this.touchStartElement) return;
            
            e.preventDefault();
            const touch = e.touches[0];
            const currentY = touch.clientY;
            
            // Find the element under the touch point
            const elementBelow = document.elementFromPoint(touch.clientX, currentY);
            const listItem = elementBelow?.closest('.list-item');
            
            if (listItem && listItem !== this.touchStartElement && listItem !== this.placeholder) {
                const rect = listItem.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                if (currentY < midY) {
                    listItem.parentNode.insertBefore(this.placeholder, listItem);
                } else {
                    listItem.parentNode.insertBefore(this.placeholder, listItem.nextSibling);
                }
            }
        }, { passive: false });

        dragHandle.addEventListener('touchend', async (e) => {
            if (!this.touchStartElement) return;
            
            e.preventDefault();
            
            // Find the target item based on placeholder position
            if (this.placeholder && this.placeholder.parentNode) {
                const placeholderIndex = Array.from(this.placeholder.parentNode.children).indexOf(this.placeholder);
                if (placeholderIndex >= 0) {
                    await this.reorderItemsByIndex(this.draggedItem, placeholderIndex);
                }
            }
            
            // Clean up
            if (this.placeholder && this.placeholder.parentNode) {
                this.placeholder.parentNode.removeChild(this.placeholder);
            }
            
            this.touchStartElement.classList.remove('dragging');
            this.touchStartElement = null;
            this.draggedItem = null;
            this.placeholder = null;
            
            this.renderListItems();
        }, { passive: false });
    }

    async reorderItemsByIndex(draggedItem, targetIndex) {
        const items = this.currentList.items;
        const draggedIndex = items.findIndex(i => i.id === draggedItem.id);
        
        if (draggedIndex === targetIndex) return; // No change needed
        
        // Remove the dragged item
        items.splice(draggedIndex, 1);
        
        // Adjust target index if dragging down (since we removed an item before the target)
        const adjustedIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
        
        // Insert at new position
        items.splice(adjustedIndex, 0, draggedItem);

        // Update order
        items.forEach((item, index) => {
            item.order = index;
        });

        await this.updateList();
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

    startEditing(item, textSpan, editInput) {
        textSpan.classList.add('hidden');
        editInput.classList.remove('hidden');
        editInput.focus();
        editInput.select();
    }

    async saveEdit(item, editInput, textSpan) {
        const newText = editInput.value.trim();
        if (newText && newText !== item.text) {
            item.text = newText;
            item.tags = this.extractHashtags(newText);
            await this.updateList();
        }
        this.cancelEdit(item, editInput, textSpan);
    }

    cancelEdit(item, editInput, textSpan) {
        editInput.value = item.text;
        editInput.classList.add('hidden');
        textSpan.classList.remove('hidden');
        textSpan.innerHTML = this.getDisplayText(item);
    }

    extractHashtags(text) {
        const hashtagRegex = /#[\w]+/g;
        const matches = text.match(hashtagRegex);
        return matches ? matches.map(tag => tag.toLowerCase()) : [];
    }

    getAllTags() {
        const allTags = new Set();
        this.currentList.items.forEach(item => {
            if (item.tags) {
                item.tags.forEach(tag => allTags.add(tag));
            }
        });
        return Array.from(allTags).sort();
    }

    highlightHashtags(text) {
        return text.replace(/#([\w]+)/g, '<span class="hashtag">#$1</span>');
    }

    getDisplayText(item) {
        let displayText = this.escapeHtml(item.text);
        
        // If item has tags that aren't in the text, add them
        if (item.tags && item.tags.length > 0) {
            const textTags = this.extractHashtags(item.text);
            const extraTags = item.tags.filter(tag => !textTags.includes(tag));
            
            if (extraTags.length > 0) {
                displayText += ' ' + extraTags.join(' ');
            }
        }
        
        return this.highlightHashtags(displayText);
    }

    showTagsModal(item) {
        this.currentEditingItem = item;
        this.currentEditingTags = [...(item.tags || [])];
        this.renderCurrentTags();
        this.renderSuggestedTags();
        this.tagsModal.classList.remove('hidden');
        this.newTagInput.focus();
    }

    hideTagsModal() {
        this.tagsModal.classList.add('hidden');
        this.newTagInput.value = '';
        this.currentEditingItem = null;
        this.currentEditingTags = [];
    }

    renderCurrentTags() {
        this.currentTagsList.innerHTML = '';
        this.currentEditingTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-chip';
            tagElement.innerHTML = `${tag} <button class="remove-tag" data-tag="${tag}">×</button>`;
            tagElement.querySelector('.remove-tag').addEventListener('click', () => {
                this.removeTag(tag);
            });
            this.currentTagsList.appendChild(tagElement);
        });
    }

    renderSuggestedTags() {
        this.suggestedTagsList.innerHTML = '';
        const allTags = this.getAllTags();
        const availableTags = allTags.filter(tag => !this.currentEditingTags.includes(tag));
        
        availableTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag-chip suggested';
            tagElement.textContent = tag;
            tagElement.addEventListener('click', () => {
                this.addExistingTag(tag);
            });
            this.suggestedTagsList.appendChild(tagElement);
        });
    }

    addNewTag() {
        const tagText = this.newTagInput.value.trim().toLowerCase();
        if (tagText && !this.currentEditingTags.includes(`#${tagText}`)) {
            const tag = tagText.startsWith('#') ? tagText : `#${tagText}`;
            this.currentEditingTags.push(tag);
            this.newTagInput.value = '';
            this.renderCurrentTags();
            this.renderSuggestedTags();
        }
    }

    addExistingTag(tag) {
        if (!this.currentEditingTags.includes(tag)) {
            this.currentEditingTags.push(tag);
            this.renderCurrentTags();
            this.renderSuggestedTags();
        }
    }

    removeTag(tag) {
        this.currentEditingTags = this.currentEditingTags.filter(t => t !== tag);
        this.renderCurrentTags();
        this.renderSuggestedTags();
    }

    async saveItemTags() {
        if (this.currentEditingItem) {
            this.currentEditingItem.tags = [...this.currentEditingTags];
            await this.updateList();
            this.renderListItems();
        }
        this.hideTagsModal();
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