document.addEventListener('DOMContentLoaded', () => {
    let currentSong = "Sample Song";
    let votes = { keep: 0, skip: 0 };
    let totalListeners = 5;

    // Check if a group ID is stored in localStorage
    const groupID = localStorage.getItem('spotifyGroupID');
    const createGroupButton = document.getElementById('create-group');
    const joinGroupButton = document.getElementById('join-group');
    const leaveGroupButton = document.getElementById('leave-group');
    const groupIDInput = document.getElementById('group-id-input');

    if (groupID) {
        // A group is active, show the leave button only
        createGroupButton.style.display = 'none';
        joinGroupButton.style.display = 'none';
        groupIDInput.style.display = 'none';
        leaveGroupButton.style.display = 'block';

        // Display the current group ID on the home page
        const groupIDElement = document.createElement('p');
        groupIDElement.id = 'current-group-id';
        groupIDElement.textContent = `Current Group ID: ${groupID}`;
        document.getElementById('app').appendChild(groupIDElement);

        // Set up Firebase listener for current song updates
        const currentSongRef = firebase.database().ref('groups/' + groupID + '/currentSong');
        currentSongRef.on('value', (snapshot) => {
            const songInfo = snapshot.val();
            if (songInfo) {
                document.getElementById('song-title').textContent = songInfo.title;
                document.getElementById('artist-name').textContent = songInfo.artist;
                document.getElementById('album-art').src = songInfo.albumArt;
                document.getElementById('album-art').style.display = 'block';
            } else {
                console.log('No song is currently playing.');
            }
        });
    } else {
        // No group is active, show create and join buttons
        createGroupButton.style.display = 'block';
        joinGroupButton.style.display = 'block';
        leaveGroupButton.style.display = 'none';

        // Handle group creation
        createGroupButton.addEventListener('click', () => {
            const newGroupID = 'group-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('spotifyGroupID', newGroupID);

            firebase.database().ref('groups/' + newGroupID).set({
                leader: true,
                currentSong: null
            });

            alert(`Group created with ID: ${newGroupID}`);
            window.location.reload(); // Reload the page to update UI
        });

        // Handle showing the group ID input
        joinGroupButton.addEventListener('click', () => {
            groupIDInput.style.display = 'block';
        });

        // Handle joining a group
        groupIDInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const enteredGroupID = groupIDInput.value.trim();
                if (enteredGroupID) {
                    localStorage.setItem('spotifyGroupID', enteredGroupID);
                    alert(`Joined group with ID: ${enteredGroupID}`);
                    window.location.reload(); // Reload the page to update UI
                }
            }
        });
    }

    // Handle leaving the group
    leaveGroupButton.addEventListener('click', () => {
        localStorage.removeItem('spotifyGroupID');
        alert('You have left the group.');
        window.location.reload(); // Reload the page to update UI
    });

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

    function pollCurrentSong() {
        const token = localStorage.getItem('spotifyAccessToken');
        const groupID = localStorage.getItem('spotifyGroupID');
        
        if (token && groupID) {
            fetch('https://api.spotify.com/v1/me/player/currently-playing', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data && data.item) {
                    const songInfo = {
                        title: data.item.name,
                        artist: data.item.artists.map(artist => artist.name).join(', '),
                        albumArt: data.item.album.images[0].url
                    };
    
                    // Store the current song information in Firebase
                    console.log('Storing song info:', songInfo); // Before storing in Firebase
                    firebase.database().ref('groups/' + groupID + '/currentSong').set(songInfo);
    
                    // Update the UI for the leader
                    updateSongUI(songInfo);
                }
            })
            .catch(err => console.error('Error fetching currently playing song:', err));
        }
    }
    
    function updateSongUI(songInfo) {
        document.getElementById("song-title").textContent = songInfo.title;
        document.getElementById("artist-name").textContent = songInfo.artist;
        document.getElementById("album-art").src = songInfo.albumArt;
        document.getElementById("album-art").style.display = 'block';
    }
    
    // Poll the current song every 5 seconds (adjust as needed)
    setInterval(pollCurrentSong, 5000);
    
    // Register the service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/my-music-pwa/sw.js').then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            }).catch(error => {
                console.log('Service Worker registration failed:', error);
            });
        });
    }    
});
