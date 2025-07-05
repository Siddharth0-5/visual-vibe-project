// api/index.js
require('dotenv').config();
const axios = require('axios');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

// --- Helper Functions ---
const findActor = async (name) => {
    const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    const response = await axios.get(url);
    return response.data.results.length > 0 ? response.data.results[0] : null;
};
const getMoviesForActor = async (id) => {
    const url = `https://api.themoviedb.org/3/person/${id}/movie_credits?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    return response.data.cast;
};
const getActorsForMovie = async (id) => {
    const url = `https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}`;
    const response = await axios.get(url);
    return response.data.cast;
};
const getGif = async (term) => {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(term)}&limit=1`;
    try {
        const response = await axios.get(url);
        return response.data.data.length > 0 ? response.data.data[0].images.fixed_width.url : null;
    } catch (e) { return null; }
};
const addGifsToPath = async (path) => {
    const promises = path.map(async (item) => ({ ...item, gifUrl: await getGif(item.name || `${item.title} movie`) }));
    return Promise.all(promises);
};
const bidirectionalSearch = async (startNode, endNode, sendUpdate) => {
    let forwardQueue = [[startNode]];
    let backwardQueue = [[endNode]];
    let forwardVisited = new Map([[startNode.id, [startNode]]]);
    let backwardVisited = new Map([[endNode.id, [endNode]]]);
    let level = 0;
    while (level < 2) {
        level++;
        sendUpdate(`Searching level ${level} from ${startNode.name}...`);
        let newForwardQueue = [];
        for (const path of forwardQueue) {
            const movies = await getMoviesForActor(path[path.length-1].id);
            for (const movie of movies) {
                const cast = await getActorsForMovie(movie.id);
                for (const actor of cast) {
                    if (backwardVisited.has(actor.id)) return [...path, movie, ...backwardVisited.get(actor.id).slice().reverse()];
                    if (!forwardVisited.has(actor.id)) {
                        const newPath = [...path, movie, actor];
                        forwardVisited.set(actor.id, newPath);
                        newForwardQueue.push(newPath);
                    }
                }
            }
        }
        forwardQueue = newForwardQueue;
        // (Similar backward search logic can be added here for even better performance)
    }
    return null;
};

// This is the main serverless function Vercel will run
module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

    try {
        const { actor1Name, actor2Name } = req.query;
        sendEvent('update', { message: 'Finding actors...' });
        const startActor = await findActor(actor1Name);
        const endActor = await findActor(actor2Name);
        if (!startActor || !endActor) {
            sendEvent('error', { message: "One or both actors not found." });
            return res.end();
        }
        const path = await bidirectionalSearch(startActor, endActor, (msg) => sendEvent('update', { message: msg }));
        if (path) {
            sendEvent('update', { message: 'Connection found! Fetching GIFs...' });
            const pathWithGifs = await addGifsToPath(path);
            sendEvent('result', { path: pathWithGifs });
        } else {
            sendEvent('error', { message: "No connection found within search limit." });
        }
    } catch (error) {
        console.error("Backend Error:", error);
        sendEvent('error', { message: "An internal server error occurred." });
    } finally {
        res.end();
    }
};
