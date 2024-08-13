document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        console.error('Firebase is not initialized');
        return;
    }

    // Spotify client details
    const clientId = '3d83a8c45b8848329a38d3393f5d4b00';  // Replace with your actual Spotify Client ID
    const redirectUri = 'https://camerong3.github.io/my-music-pwa/callback.html';  // Replace with your actual redirect URI
    const scopes = 'user-read-private user-read-email user-read-playback-state';  // Scopes you want to request from the user

    // Spotify login button
    const spotifyLoginButton = document.getElementById('spotify-login');
    if (spotifyLoginButton) {
        spotifyLoginButton.addEventListener('click', () => {
            const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
            window.location.href = authUrl;
        });
    }

    // Spotify logout button
    const logoutSpotifyButton = document.getElementById('logout-spotify');
    if (logoutSpotifyButton) {
        logoutSpotifyButton.addEventListener('click', () => {
            // Clear the access token from localStorage
            localStorage.removeItem('spotifyAccessToken');
            localStorage.removeItem('spotifyTokenExpiration');

            // Optionally redirect to Spotify's logout page (this won't log out from Spotify globally, just your app)
            window.location.href = 'https://accounts.spotify.com/logout';

            // Optionally redirect to the settings page or show a message
            alert('You have been logged out of Spotify.');
            window.location.href = 'settings.html';
        });
    }

    // Fetch and display user info if the token is available
    const token = localStorage.getItem('spotifyAccessToken');
    if (token) {
        fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => response.json())
        .then(data => {
            document.body.insertAdjacentHTML('beforeend', `<p>Logged in as: ${data.display_name}</p>`);
        })
        .catch(err => console.error(err));
    }

    // Back to Home button
    const backToHomeButton = document.getElementById('back-to-home');
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Generate a unique group ID
    function generateGroupID() {
        return 'group-' + Math.random().toString(36).substr(2, 9);
    }

    // Handle group creation
    const createGroupButton = document.getElementById('create-group');
    if (createGroupButton) {
        createGroupButton.addEventListener('click', () => {
            const groupID = generateGroupID();
            const groupLink = `${window.location.origin}/my-music-pwa/index.html?group=${groupID}`;
            alert(`Share this link to invite others to your listening group: ${groupLink}`);

            // Store the group ID in Firebase
            firebase.database().ref('groups/' + groupID).set({
                leader: true,
                currentSong: null
            });

            // Optionally, store the group ID in localStorage for the leader
            localStorage.setItem('spotifyGroupID', groupID);
        });
    }

    // Handle group member joining
    const urlParams = new URLSearchParams(window.location.search);
    const newGroupID = urlParams.get('group');

    if (newGroupID) {
        // Clear the existing groupID from localStorage before setting the new one
        localStorage.removeItem('spotifyGroupID');

        // Store the new groupID in localStorage
        localStorage.setItem('spotifyGroupID', newGroupID);

        alert(`You have joined the listening group: ${newGroupID}`);

        // Set up Firebase listener for the new group
        const currentSongRef = firebase.database().ref('groups/' + newGroupID + '/currentSong');
        currentSongRef.on('value', (snapshot) => {
            const songInfo = snapshot.val();
            if (songInfo) {
                // Update the UI with the current song info
                document.getElementById('song-title').textContent = songInfo.title;
                document.getElementById('artist-name').textContent = songInfo.artist;
                document.getElementById('album-art').src = songInfo.albumArt;
                document.getElementById('album-art').style.display = 'block';
            } else {
                console.log('No song is currently playing.');
            }
        });
    }
});