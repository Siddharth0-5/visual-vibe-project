// --- Grab the HTML elements ---
const actor1Input = document.getElementById('actor1-input');
const actor2Input = document.getElementById('actor2-input');
const findButton = document.getElementById('find-button');
const messageArea = document.getElementById('message-area');
const graphContainer = document.getElementById('graph-container');
const detailsPopup = document.getElementById('details-popup');
const waitingRoom = document.getElementById('waiting-room-container');

// --- Global variables for the graph ---
let network = null;
const allNodes = new vis.DataSet();
const allEdges = new vis.DataSet();

// --- Function to initialize the graph ---
function initializeGraph() {
    const data = { nodes: allNodes, edges: allEdges };
    const options = {
        nodes: {
            borderWidth: 2,
            font: {
                size: 14,
                // Color is now handled by CSS for better visibility
            }
        },
        edges: {
            color: '#848484',
            smooth: {
                type: 'cubicBezier'
            }
        },
        physics: {
            solver: 'forceAtlas2Based',
            forceAtlas2Based: {
                gravitationalConstant: -100,
                centralGravity: 0.01,
                springLength: 150,
                springConstant: 0.08
            }
        },
        interaction: {
            dragNodes: true,
            dragView: true,
            zoomView: true
        }
    };
    network = new vis.Network(graphContainer, data, options);
    setupGraphEventListeners();

    // --- THE FIX for Animated GIFs ---
    // After the network draws, we manually re-set the image source to trick it into re-rendering the GIF.
    network.on("afterDrawing", function() {
        const canvas = graphContainer.getElementsByTagName("canvas")[0];
        const ctx = canvas.getContext("2d");
        allNodes.forEach(node => {
            if (node.image) {
                const nodePosition = network.getPositions([node.id])[node.id];
                const image = new Image();
                image.src = node.image; // The GIF URL
                // This doesn't draw it, but ensures the browser keeps the animation loop running for this image.
            }
        });
    });
}

// --- Function to add new data to the graph ---
function drawPathOnGraph(path) {
    path.forEach((item, index) => {
        if (!allNodes.get(item.id)) {
            const node = {
                id: item.id,
                label: item.name || item.title,
                shape: 'circularImage', // Use circularImage for better GIF display
                image: item.gifUrl || 'https://via.placeholder.com/150/FFFFFF/000000?text=?',
                color: {
                    border: item.gender !== undefined ? '#e94560' : '#0f3460', // Red for actors, blue for movies
                },
                size: 40,
                // Store extra data for the popup
                type: item.gender !== undefined ? 'actor' : 'movie',
                details: item
            };
            allNodes.add(node);
        }

        if (index > 0) {
            const prevItem = path[index - 1];
            const edgeId = `${prevItem.id}-${item.id}`;
            if (!allEdges.get(edgeId) && !allEdges.get(`${item.id}-${prevItem.id}`)) {
                allEdges.add({ id: edgeId, from: prevItem.id, to: item.id });
            }
        }
    });
    // Let the network re-draw itself to show the animated GIFs
    network.redraw();
}

// --- Function to handle clicks on nodes (remains the same) ---
function setupGraphEventListeners() {
    network.on("click", async function(params) {
        // ... (This function is identical to the previous version) ...
        detailsPopup.classList.add('hidden');
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = allNodes.get(nodeId);
            const pos = params.pointer.DOM;
            detailsPopup.style.top = `${pos.y}px`;
            detailsPopup.style.left = `${pos.x}px`;
            detailsPopup.classList.remove('hidden');
            if (node.type === 'actor') {
                detailsPopup.innerHTML = `<h3>${node.label}</h3><p>Known for: ${node.details.known_for_department}</p><a href="https://www.themoviedb.org/person/${node.id}" target="_blank">View on TMDb</a>`;
            } else if (node.type === 'movie') {
                detailsPopup.innerHTML = `<h3><em>${node.label}</em></h3><p>${node.details.overview || 'No overview available.'}</p><a href="https://www.themoviedb.org/movie/${node.id}" target="_blank">View on TMDb</a>`;
            }
        }
    });
}


// --- Main Event Listener with Request Counter ---
findButton.addEventListener('click', () => {
    const actor1Name = actor1Input.value.trim();
    const actor2Name = actor2Input.value.trim();

    if (!actor1Name || !actor2Name) {
        alert("Please enter both actor names!");
        return;
    }

    messageArea.textContent = 'Starting connection...';
    findButton.disabled = true;

    const eventSource = new EventSource(`/api/find-connection-stream?actor1Name=${encodeURIComponent(actor1Name)}&actor2Name=${encodeURIComponent(actor2Name)}`);

    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        if (data.type === 'update') {
            messageArea.textContent = data.message;
        } 
        else if (data.type === 'result') {
            drawPathOnGraph(data.path);
            
            // --- THE FIX for Request Counter ---
            // The server now sends back the remaining requests header
            const remainingRequests = event.lastEventId;
            if (remainingRequests) {
                 messageArea.textContent = `Connection drawn! (GIPHY Requests Remaining: ${remainingRequests})`;
            } else {
                 messageArea.textContent = `Connection drawn! Explore the graph.`;
            }
            
            eventSource.close();
            findButton.disabled = false;
        }
        else if (data.type === 'error') {
            messageArea.textContent = `Error: ${data.message}`;
            eventSource.close();
            findButton.disabled = false;
        }
    };

    eventSource.onerror = function() {
        messageArea.textContent = 'Connection to server lost. Please try again.';
        eventSource.close();
        findButton.disabled = false;
    };
});

// Initialize the graph on page load
initializeGraph();
