document.addEventListener('DOMContentLoaded', () => {
    let currentSong = "Sample Song";
    let votes = { keep: 0, skip: 0 };
    let totalListeners = 5;

    // Set the initial song title
    document.getElementById("song-title").textContent = currentSong;

    // Event listeners for voting buttons
    document.getElementById("vote-keep").addEventListener("click", () => {
        votes.keep++;
        updateVoteStatus();
    });

    document.getElementById("vote-skip").addEventListener("click", () => {
        votes.skip++;
        updateVoteStatus();
    });

    // Ensure the settings button exists before adding an event listener
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    // Spotify status indicator
    const spotifyStatusDot = document.getElementById('spotify-status-dot');
    const albumArt = document.getElementById('album-art');
    const songTitle = document.getElementById('song-title');
    const artistName = document.getElementById('artist-name');
    const token = localStorage.getItem('spotifyAccessToken');
    const tokenExpiration = localStorage.getItem('spotifyTokenExpiration');
    const now = new Date().getTime();

    if (spotifyStatusDot && token && tokenExpiration && now < tokenExpiration) {
        // Set the indicator to green (linked)
        spotifyStatusDot.style.backgroundColor = 'green';

        // Fetch the currently playing song from Spotify
        fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            console.log('Spotify API response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Spotify API response data:', data); // Log the entire data object
            if (data && data.item) {
                currentSong = data.item.name;
                songTitle.textContent = currentSong;

                // Display the artist name(s)
                if (data.item.artists && data.item.artists.length > 0) {
                    artistName.textContent = data.item.artists.map(artist => artist.name).join(', ');
                } else {
                    artistName.textContent = "Unknown Artist";
                }

                // Display the album art
                if (data.item.album && data.item.album.images && data.item.album.images.length > 0) {
                    const albumImageUrl = data.item.album.images[0].url; // Usually the first image is the largest
                    albumArt.src = albumImageUrl;
                    albumArt.style.display = 'block'; // Show the image
                } else {
                    albumArt.style.display = 'none'; // Hide the image if no album art is available
                }
            } else {
                songTitle.textContent = "No song currently playing";
                artistName.textContent = "";
                albumArt.style.display = 'none';
            }
        })
        .catch(err => {
            console.error('Error fetching currently playing song:', err);
            songTitle.textContent = "Error fetching song";
            artistName.textContent = "";
            albumArt.style.display = 'none';
        });
    } else if (spotifyStatusDot) {
        // Set the indicator to red (not linked)
        spotifyStatusDot.style.backgroundColor = 'red';
        if (!token || now >= tokenExpiration) {
            alert('Spotify session expired. Please re-authenticate.');
            window.location.href = 'settings.html'; // Redirect to re-authenticate
        }
    }

    // Function to update the vote status
    function updateVoteStatus() {
        const voteStatus = document.getElementById("vote-status");
        voteStatus.textContent = `Votes: Keep (${votes.keep}), Skip (${votes.skip})`;

        if (votes.skip > totalListeners / 2) {
            voteStatus.textContent = "Majority voted to skip the song. Advancing to the next song...";
            setTimeout(() => {
                currentSong = "Next Sample Song";
                votes = { keep: 0, skip: 0 };
                songTitle.textContent = currentSong;
                artistName.textContent = "";
                albumArt.style.display = 'none'; // Hide album art when song changes
            }, 2000);
        }
    }

    // Register the service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/my-music-pwa/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
        });
    }
});
