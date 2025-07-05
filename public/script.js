const actor1Input = document.getElementById('actor1-input');
const actor2Input = document.getElementById('actor2-input');
const findButton = document.getElementById('find-button');
const messageArea = document.getElementById('message-area');
const graphContainer = document.getElementById('graph-container');
const detailsPopup = document.getElementById('details-popup');

let network = null;
const allNodes = new vis.DataSet();
const allEdges = new vis.DataSet();

function initializeGraph() {
    const data = { nodes: allNodes, edges: allEdges };
    const options = { /* ... your vis-network options ... */ };
    network = new vis.Network(graphContainer, data, options);
    // ... event listeners for the graph ...
}

function drawPathOnGraph(path) {
    path.forEach((item, index) => {
        if (!allNodes.get(item.id)) {
            allNodes.add({
                id: item.id,
                label: item.name || item.title,
                shape: 'circularImage',
                image: item.gifUrl || 'https://via.placeholder.com/150/FFFFFF/000000?text=?',
                size: 40,
                color: { border: item.gender !== undefined ? '#e94560' : '#0f3460' },
                // ... other node properties ...
            });
        }
        if (index > 0) {
            const prev = path[index - 1];
            const edgeId = `${prev.id}-${item.id}`;
            if (!allEdges.get(edgeId)) allEdges.add({ id: edgeId, from: prev.id, to: item.id });
        }
    });
}

findButton.addEventListener('click', () => {
    const actor1Name = actor1Input.value.trim();
    const actor2Name = actor2Input.value.trim();
    if (!actor1Name || !actor2Name) return alert("Please enter both names.");
    
    messageArea.textContent = 'Contacting server...';
    findButton.disabled = true;

    // Call the single serverless function in the /api directory
    const eventSource = new EventSource(`/api?actor1Name=${encodeURIComponent(actor1Name)}&actor2Name=${encodeURIComponent(actor2Name)}`);
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        if (data.type === 'update') messageArea.textContent = data.message;
        else if (data.type === 'result') {
            drawPathOnGraph(data.path);
            messageArea.textContent = 'Connection drawn! Explore the graph.';
            eventSource.close();
            findButton.disabled = false;
        } else if (data.type === 'error') {
            messageArea.textContent = `Error: ${data.message}`;
            eventSource.close();
            findButton.disabled = false;
        }
    };
    eventSource.onerror = function() {
        messageArea.textContent = 'Connection error. Please try again.';
        eventSource.close();
        findButton.disabled = false;
    };
});

initializeGraph();
