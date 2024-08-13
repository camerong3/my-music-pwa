document.addEventListener('DOMContentLoaded', () => {
    let currentSong = "Sample Song";
    let votes = { keep: 0, skip: 0 };
    let totalListeners = 5;

    const createGroupButton = document.getElementById('create-group');
    const joinGroupButton = document.getElementById('join-group');
    const leaveGroupButton = document.getElementById('leave-group');
    const groupIDInput = document.getElementById('group-id-input');
    const joinButton = document.createElement('button');

    // Generate a unique group ID
    function generateGroupID() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let groupID = '';
        for (let i = 0; i < 6; i++) {
            groupID += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return groupID;
    }

    // Initialize UI based on group state
    const groupID = localStorage.getItem('spotifyGroupID');
    const isLeader = localStorage.getItem('isGroupLeader') === 'true';

    if (groupID) {
        // A group is active, update the UI accordingly
        updateUIForGroupActive(groupID, isLeader);
    } else {
        setupInitialUI();
    }

    function setupInitialUI() {
        console.log('Setting up initial UI.');

        createGroupButton.style.display = 'block';
        joinGroupButton.style.display = 'block';
        leaveGroupButton.style.display = 'none';
        groupIDInput.style.display = 'none';

        const groupIDElement = document.getElementById('current-group-id');
        if (groupIDElement) {
            groupIDElement.remove();
        }

        document.getElementById('song-title').textContent = currentSong;
        document.getElementById('artist-name').textContent = '';
        document.getElementById('album-art').style.display = 'none';
    }

    function updateUIForGroupActive(groupID, isLeader) {
        console.log('Updating UI for active group:', groupID);

        createGroupButton.style.display = 'none';
        joinGroupButton.style.display = 'none';
        groupIDInput.style.display = 'none';
        leaveGroupButton.style.display = 'block';

        let groupIDElement = document.getElementById('current-group-id');
        if (!groupIDElement) {
            groupIDElement = document.createElement('p');
            groupIDElement.id = 'current-group-id';
            document.getElementById('app').appendChild(groupIDElement);
        }
        groupIDElement.textContent = `Current Group ID: ${groupID}`;

        leaveGroupButton.textContent = isLeader ? 'End Group Session' : 'Leave Group';

        // Set up Firebase listener for current song updates
        const currentSongRef = firebase.database().ref('groups/' + groupID + '/currentSong');
        currentSongRef.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                if (!isLeader) {
                    alert('The group session has ended. You will be removed from the group.');
                }
                localStorage.removeItem('spotifyGroupID');
                localStorage.removeItem('isGroupLeader');
                setupInitialUI();
                return;
            }

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
    }

    // Handle group creation
    createGroupButton.addEventListener('click', () => {
        const newGroupID = generateGroupID();
        localStorage.setItem('spotifyGroupID', newGroupID);
        localStorage.setItem('isGroupLeader', 'true'); // Mark this user as the group leader

        firebase.database().ref('groups/' + newGroupID).set({
            leader: true,
            currentSong: null
        }).then(() => {
            console.log('Group successfully created in Firebase.');
            updateUIForGroupActive(newGroupID, true);
        }).catch(err => {
            console.error('Failed to create group in Firebase:', err);
            alert('There was an issue creating the group in Firebase. Please try again.');
        });
    });

    // Handle showing the group ID input and join button
    joinGroupButton.addEventListener('click', () => {
        joinGroupButton.style.display = 'none';
        groupIDInput.style.display = 'block';

        joinButton.textContent = 'Join';
        joinButton.style.marginLeft = '10px';
        document.getElementById('group-buttons').appendChild(joinButton);
    });

    // Handle joining a group when the "Join" button is pressed
    joinButton.addEventListener('click', () => {
        const enteredGroupID = groupIDInput.value.trim();
        if (enteredGroupID) {
            firebase.database().ref('groups/' + enteredGroupID).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    localStorage.setItem('spotifyGroupID', enteredGroupID);
                    localStorage.removeItem('isGroupLeader');
                    console.log(`Joined group with ID: ${enteredGroupID}`);
                    updateUIForGroupActive(enteredGroupID, false);
                } else {
                    alert('Group ID does not exist. Please check the ID and try again.');
                }
            }).catch(err => {
                console.error('Error checking group ID:', err);
            });
        }
    });

    // Handle leaving the group or ending the group session
    leaveGroupButton.addEventListener('click', () => {
        if (isLeader) {
            if (confirm('Are you sure you want to end the group session? This cannot be undone.')) {
                firebase.database().ref('groups/' + groupID).remove().then(() => {
                    console.log('Group session ended.');
                    localStorage.removeItem('spotifyGroupID');
                    localStorage.removeItem('isGroupLeader');
                    setupInitialUI();
                }).catch(err => {
                    console.error('Error ending group session:', err);
                });
            }
        } else {
            if (confirm('Are you sure you want to leave the group?')) {
                alert('You have left the group.');
                localStorage.removeItem('spotifyGroupID');
                localStorage.removeItem('isGroupLeader');
                setupInitialUI();
            }
        }
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

    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });
    }

    const spotifyStatusDot = document.getElementById('spotify-status-dot');
    const albumArt = document.getElementById('album-art');
    const songTitle = document.getElementById('song-title');
    const artistName = document.getElementById('artist-name');
    const token = localStorage.getItem('spotifyAccessToken');
    const tokenExpiration = localStorage.getItem('spotifyTokenExpiration');
    const now = new Date().getTime();

    if (spotifyStatusDot && token && tokenExpiration && now < tokenExpiration) {
        spotifyStatusDot.style.backgroundColor = 'green';

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
            console.log('Spotify API response data:', data);
            if (data && data.item) {
                currentSong = data.item.name;
                songTitle.textContent = currentSong;

                if (data.item.artists && data.item.artists.length > 0) {
                    artistName.textContent = data.item.artists.map(artist => artist.name).join(', ');
                } else {
                    artistName.textContent = "Unknown Artist";
                }

                if (data.item.album && data.item.album.images && data.item.album.images.length > 0) {
                    const albumImageUrl = data.item.album.images[0].url;
                    albumArt.src = albumImageUrl;
                    albumArt.style.display = 'block';
                } else {
                    albumArt.style.display = 'none';
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
        spotifyStatusDot.style.backgroundColor = 'red';
    }

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
                albumArt.style.display = 'none';
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

                    firebase.database().ref('groups/' + groupID + '/currentSong').set(songInfo);
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
    
    setInterval(pollCurrentSong, 5000);
    
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
