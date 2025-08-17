const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'lists.json');

app.use(bodyParser.json());
app.use(express.static('public'));

async function loadLists() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveLists(lists) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(lists, null, 2));
}

app.get('/api/lists', async (req, res) => {
  try {
    const lists = await loadLists();
    res.json(lists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load lists' });
  }
});

app.post('/api/lists', async (req, res) => {
  try {
    console.log('POST /api/lists called');
    console.log('Request body:', req.body);
    const { name } = req.body;
    console.log('List name:', name);
    
    const lists = await loadLists();
    console.log('Current lists:', lists);
    
    const newList = {
      id: Date.now().toString(),
      name,
      items: [],
      createdAt: new Date().toISOString()
    };
    console.log('New list object:', newList);
    
    lists.push(newList);
    console.log('About to save lists...');
    await saveLists(lists);
    console.log('Lists saved successfully');
    
    res.json(newList);
  } catch (error) {
    console.error('Error in POST /api/lists:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
});

app.get('/api/lists/:id', async (req, res) => {
  try {
    const lists = await loadLists();
    const list = lists.find(l => l.id === req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load list' });
  }
});

app.put('/api/lists/:id', async (req, res) => {
  try {
    const lists = await loadLists();
    const index = lists.findIndex(l => l.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'List not found' });
    }
    lists[index] = { ...lists[index], ...req.body };
    await saveLists(lists);
    res.json(lists[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update list' });
  }
});

app.delete('/api/lists/:id', async (req, res) => {
  try {
    const lists = await loadLists();
    const filteredLists = lists.filter(l => l.id !== req.params.id);
    await saveLists(filteredLists);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete list' });
  }
});

app.get('/api/lists/:id/export', async (req, res) => {
  try {
    const lists = await loadLists();
    const list = lists.find(l => l.id === req.params.id);
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    let markdown = `# ${list.name}\n\n`;
    
    if (list.items.length === 0) {
      markdown += '*No items in this list*\n';
    } else {
      list.items
        .sort((a, b) => a.order - b.order)
        .forEach(item => {
          const checkbox = item.completed ? '[x]' : '[ ]';
          markdown += `- ${checkbox} ${item.text}\n`;
        });
    }
    
    markdown += `\n*Exported from Lizt on ${new Date().toLocaleDateString()}*\n`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md"`);
    res.send(markdown);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export list' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Lizt app running on port ${PORT}`);
});