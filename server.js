// server.js
require('dotenv').config(); // Load variables from .env file
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

// Middleware
app.use(cors()); // Allow requests from our frontend
app.use(express.static(path.join(__dirname, '/'))); // Serve our static files (html, css, js)

// The main API endpoint that our frontend will call
app.get('/api/find-connection', async (req, res) => {
    const { actor1Name, actor2Name } = req.query;

    if (!actor1Name || !actor2Name) {
        return res.status(400).json({ error: 'Both actor names are required' });
    }

    try {
        const startActor = await findActor(actor1Name);
        const endActor = await findActor(actor2Name);

        // --- IMPROVED ERROR CHECKING ---
        if (!startActor || !endActor) {
            // Figure out which actor was not found and return a specific message
            const missingActor = !startActor ? actor1Name : actor2Name;
            return res.status(404).json({ error: `Could not find an actor named "${missingActor}". Please check the spelling.` });
        }

        const path = await findConnectionPath(startActor, endActor);

        if (path) {
            const pathWithGifs = await addGifsToPath(path);
            res.json({ path: pathWithGifs });
        } else {
            res.status(404).json({ error: 'No connection path found between these actors within 3 steps.' });
        }

    } catch (error) {
        console.error('Server error:', error.message);
        // This now correctly handles a true server-side failure (e.g., TMDb is down)
        res.status(500).json({ error: 'An internal server error occurred while contacting the movie database.' });
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

// server.js - A more robust version of this function

const findConnectionPath = async (startActor, endActor) => {
    const queue = [[startActor]];
    const visited = new Set([startActor.id]);
    const MAX_SEARCH_DEPTH = 3;

    while (queue.length > 0) {
        const currentPath = queue.shift();

        if (Math.floor(currentPath.length / 2) >= MAX_SEARCH_DEPTH) continue;

        const currentActor = currentPath[currentPath.length - 1];
        let movies;

        // --- ROBUSTNESS FIX #1 ---
        // Wrap the API call in a try/catch. If it fails, just skip this actor.
        try {
            movies = await getMoviesForActor(currentActor.id);
        } catch (e) {
            console.warn(`--> Network error while getting movies for ${currentActor.name}. Skipping.`);
            continue; // Go to the next item in the queue
        }
        // --- END OF FIX ---

        for (const movie of movies) {
            let cast;

            // --- ROBUSTNESS FIX #2 ---
            // Wrap this call too. If it fails, just skip this movie.
            try {
                cast = await getActorsForMovie(movie.id);
            } catch (e) {
                console.warn(`--> Network error while getting cast for ${movie.title}. Skipping.`);
                continue; // Go to the next movie in the list
            }
            // --- END OF FIX ---
            
            for (const castMember of cast) {
                if (castMember.id === endActor.id) {
                    return [...currentPath, movie, endActor];
                }
                if (!visited.has(castMember.id)) {
                    visited.add(castMember.id);
                    const newPath = [...currentPath, movie, castMember];
                    queue.push(newPath);
                }
            }
        }
    }
    return null;
};


const getGif = async (searchTerm) => {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=1`;
    const response = await axios.get(url);
    return response.data.data.length > 0 ? response.data.data[0].images.fixed_width.url : null;
};

const addGifsToPath = async (path) => {
    const promises = path.map(async (item) => {
        const searchTerm = item.gender !== undefined ? item.name : `${item.title} movie`;
        const gifUrl = await getGif(searchTerm);
        return { ...item, gifUrl };
    });
    return Promise.all(promises);
};

// --- Start the server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
