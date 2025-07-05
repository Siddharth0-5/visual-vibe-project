// server.js - Final Version with all functions included
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

// Simple in-memory counter for GIPHY requests
let giphyRequestCount = 0;
const GIPHY_LIMIT = 100;

// Reset the counter every hour
setInterval(() => {
    giphyRequestCount = 0;
    console.log("GIPHY request counter has been reset.");
}, 3600 * 1000);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, '/')));

// --- Server-Sent Events Endpoint ---
app.get('/api/find-connection-stream', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers immediately

    const sendEvent = (type, data, id) => {
        const eventString = `id: ${id}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
        res.write(eventString);
    };

    const sendUpdate = (message) => sendEvent('update', { message }, Date.now());
    const sendResult = (path, remaining) => sendEvent('result', { path }, remaining);
    const sendError = (message) => sendEvent('error', { message }, Date.now());

    try {
        const { actor1Name, actor2Name } = req.query;

        sendUpdate('Finding actors in the database...');
        const startActor = await findActor(actor1Name);
        const endActor = await findActor(actor2Name);
        
        if (!startActor || !endActor) {
            sendError('One or both actors not found. Please check spelling.');
            return res.end();
        }

        const path = await bidirectionalSearch(startActor, endActor, sendUpdate);
        
        if (path) {
            sendUpdate('Connection found! Fetching GIFs...');
            const pathWithGifs = await addGifsToPath(path);
            const remaining = GIPHY_LIMIT - giphyRequestCount;
            sendResult(pathWithGifs, remaining);
        } else {
            sendError('Could not find a connection path within the search limit.');
        }

    } catch (error) {
        console.error('Server stream error:', error);
        sendError('An internal server error occurred.');
    } finally {
        res.end();
    }
});

// --- Server-Side Helper Functions ---

const findActor = async (actorName) => {
    const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actorName)}`;
    const response = await axios.get(url);
    return response.data.results.length > 0 ? response.data.results[0] : null;
};

const getMoviesForActor = async (actorId) => {
    const url = `https://api.themoviedb.org/3/person/${actorId}/movie_credits?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    return response.data.cast;
};

const getActorsForMovie = async (movieId) => {
    const url = `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    return response.data.cast;
};

const getGif = async (searchTerm) => {
    if (giphyRequestCount >= GIPHY_LIMIT) {
        console.warn("GIPHY rate limit reached! Serving placeholder.");
        return null;
    }
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=1`;
    try {
        const response = await axios.get(url);
        giphyRequestCount++; // Increment only on successful call
        return response.data.data.length > 0 ? response.data.data[0].images.fixed_width.url : null;
    } catch (error) {
        console.error(`GIPHY API call failed for term: ${searchTerm}`, error.message);
        return null; // Return null on API error
    }
};

const addGifsToPath = async (path) => {
    const promises = path.map(async (item) => {
        const searchTerm = item.name || `${item.title} movie`;
        const gifUrl = await getGif(searchTerm);
        return { ...item, gifUrl };
    });
    return Promise.all(promises);
};

// --- Bidirectional Search Implementation ---
async function bidirectionalSearch(startNode, endNode, sendUpdate) {
    let forwardQueue = [[startNode]];
    let backwardQueue = [[endNode]];

    let forwardVisited = new Map([[startNode.id, [startNode]]]);
    let backwardVisited = new Map([[endNode.id, [endNode]]]);

    let level = 0;
    const MAX_LEVELS = 2; // Each level out from one side

    while (level < MAX_LEVELS) {
        level++;
        
        // Expand forward
        sendUpdate(`Searching level ${level} from ${startNode.name}...`);
        let newForwardQueue = [];
        for (const path of forwardQueue) {
            const lastNode = path[path.length - 1];
            const movies = await getMoviesForActor(lastNode.id);
            for (const movie of movies) {
                const cast = await getActorsForMovie(movie.id);
                for (const actor of cast) {
                    if (backwardVisited.has(actor.id)) {
                        const backwardPath = backwardVisited.get(actor.id).slice().reverse();
                        const forwardPath = [...path, movie];
                        return [...forwardPath, ...backwardPath];
                    }
                    if (!forwardVisited.has(actor.id)) {
                        const newPath = [...path, movie, actor];
                        forwardVisited.set(actor.id, newPath);
                        newForwardQueue.push(newPath);
                    }
                }
            }
        }
        forwardQueue = newForwardQueue;

        // Expand backward
        sendUpdate(`Searching level ${level} from ${endNode.name}...`);
        let newBackwardQueue = [];
        for (const path of backwardQueue) {
            const lastNode = path[path.length - 1];
            const movies = await getMoviesForActor(lastNode.id);
            for (const movie of movies) {
                const cast = await getActorsForMovie(movie.id);
                for (const actor of cast) {
                    if (forwardVisited.has(actor.id)) {
                        const forwardPath = forwardVisited.get(actor.id);
                        const backwardPath = [...path, movie].slice().reverse();
                        return [...forwardPath, ...backwardPath];
                    }
                    if (!backwardVisited.has(actor.id)) {
                        const newPath = [...path, movie, actor];
                        backwardVisited.set(actor.id, newPath);
                        newBackwardQueue.push(newPath);
                    }
                }
            }
        }
        backwardQueue = newBackwardQueue;
    }
    return null;
}

module.exports = app;

