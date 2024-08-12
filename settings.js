// Spotify client details
const clientId = '3d83a8c45b8848329a38d3393f5d4b00';  // Replace with your actual Spotify Client ID
const redirectUri = 'https://camerong3.github.io/my-music-pwa/callback.html';  // Replace with your actual redirect URI
const scopes = 'user-read-private user-read-email user-read-playback-state';  // Scopes you want to request from the user

document.addEventListener('DOMContentLoaded', () => {
    // Event listener for the Spotify login button
    const spotifyLoginButton = document.getElementById('spotify-login');
    if (spotifyLoginButton) {
        spotifyLoginButton.addEventListener('click', () => {
            // Construct the Spotify authorization URL
            const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
            
            // Redirect the user to Spotify's authorization page
            window.location.href = authUrl;
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

    // Event listener for the Back to Home button
    const backToHomeButton = document.getElementById('back-to-home');
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});
