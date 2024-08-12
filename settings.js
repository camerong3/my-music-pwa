// Spotify client details
const clientId = '3d83a8c45b8848329a38d3393f5d4b00';  // Replace with your actual Spotify Client ID
const redirectUri = 'https://camerong3.github.io/my-music-pwa/callback.html';  // Replace with your actual redirect URI
const scopes = 'user-read-private user-read-email user-read-playback-state';  // Scopes you want to request from the user

document.addEventListener('DOMContentLoaded', () => {
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
            window.location.href = 'https://www.spotify.com/logout/';

            // Optionally redirect to the settings page or show a message
            alert('You have been logged out of Spotify.');
            window.location.href = 'settings.html';
        });
    }

    // Back to Home button
    const backToHomeButton = document.getElementById('back-to-home');
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});
