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
                color: '#ffffff'
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
}

// --- Function to add new data to the graph ---
function drawPathOnGraph(path) {
    path.forEach((item, index) => {
        if (!allNodes.get(item.id)) {
            const node = {
                id: item.id,
                label: item.name || item.title,
                shape: 'image',
                image: item.gifUrl || 'https://via.placeholder.com/150/FFFFFF/000000?text=?',
                shapeProperties: {
                    useBorderWithImage: true
                },
                color: {
                    border: item.gender !== undefined ? '#e94560' : '#0f3460', // Red for actors, blue for movies
                    background: '#222'
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
}

// --- Function to handle clicks on nodes ---
function setupGraphEventListeners() {
    network.on("click", function(params) {
        detailsPopup.classList.add('hidden'); // Hide on any click
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = allNodes.get(nodeId);
            const pos = params.pointer.DOM;

            detailsPopup.style.top = `${pos.y}px`;
            detailsPopup.style.left = `${pos.x}px`;

            if (node.type === 'actor') {
                detailsPopup.innerHTML = `<h3>${node.label}</h3><p>Known for: ${node.details.known_for_department}</p><a href="https://www.themoviedb.org/person/${node.id}" target="_blank">View on TMDb</a>`;
            } else if (node.type === 'movie') {
                detailsPopup.innerHTML = `<h3><em>${node.label}</em></h3><p>${node.details.overview || 'No overview available.'}</p><a href="https://www.themoviedb.org/movie/${node.id}" target="_blank">View on TMDb</a>`;
            }
            detailsPopup.classList.remove('hidden');
        }
    });
}

// --- Main Event Listener ---
findButton.addEventListener('click', async () => {
    const actor1Name = actor1Input.value.trim();
    const actor2Name = actor2Input.value.trim();

    if (!actor1Name || !actor2Name) {
        alert("Please enter both actor names!");
        return;
    }

    messageArea.textContent = 'Contacting server to find a connection...';
    findButton.disabled = true;

    try {
        const response = await fetch(`/api/find-connection?actor1Name=${encodeURIComponent(actor1Name)}&actor2Name=${encodeURIComponent(actor2Name)}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error);
        }

        const data = await response.json();
        messageArea.textContent = `Connection found in ${Math.floor(data.path.length / 2)} steps! Drawing graph...`;
        drawPathOnGraph(data.path);
        messageArea.textContent = `Connection drawn! Explore the graph.`;

    } catch (error) {
        console.error("An error occurred:", error);
        messageArea.textContent = `Error: ${error.message}`;
        // Logic to show the waiting room if the error is a rate limit
        if (error.message.toLowerCase().includes('limit')) {
            waitingRoom.classList.remove('hidden');
        }
    } finally {
        findButton.disabled = false;
    }
});

// Initialize the app on page load
initializeGraph();
