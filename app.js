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

    // Check if a group ID and leader flag are stored in localStorage
    const groupID = localStorage.getItem('spotifyGroupID');
    const isLeader = localStorage.getItem('isGroupLeader') === 'true';

    if (groupID) {
        // A group is active, show the leave/end button only
        createGroupButton.style.display = 'none';
        joinGroupButton.style.display = 'none';
        groupIDInput.style.display = 'none';
        leaveGroupButton.style.display = 'block';

        // Display the current group ID on the home page
        const groupIDElement = document.createElement('p');
        groupIDElement.id = 'current-group-id';
        groupIDElement.textContent = `Current Group ID: ${groupID}`;
        document.getElementById('app').appendChild(groupIDElement);

        // Update button text if the user is the leader
        if (isLeader) {
            leaveGroupButton.textContent = 'End Group Session';
        }
        
        // Break from group if leader ends session
        const currentGroup = firebase.database().ref('groups/' + groupID);
        currentGroup.on('value', (snapshot) => {
            if (!snapshot.exists()) {
                // The group no longer exists, automatically leave the group
                alert('The group session has ended. You will be removed from the group.');
                localStorage.removeItem('spotifyGroupID');
                localStorage.removeItem('isGroupLeader');
                window.location.reload(); // Reload the page to update UI
                return;
            }
        });

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
        groupIDInput.style.display = 'none';

        // Handle group creation
        createGroupButton.addEventListener('click', () => {
            const newGroupID = generateGroupID();
            localStorage.setItem('spotifyGroupID', newGroupID);
            localStorage.setItem('isGroupLeader', 'true'); // Mark this user as the group leader

            firebase.database().ref('groups/' + newGroupID).set({
                leader: true,
                currentSong: null
            });

            //alert(`Group created with ID: ${newGroupID}`);
            window.location.reload(); // Reload the page to update UI
        });

        

        // Handle showing the group ID input and join button
        joinGroupButton.addEventListener('click', () => {
            joinGroupButton.style.display = 'none';
            groupIDInput.style.display = 'block';

            // Configure and display the new "Join" button
            joinButton.textContent = 'Join';
            joinButton.style.marginLeft = '10px';
            document.getElementById('group-buttons').appendChild(joinButton);
        });

        // Handle joining a group when the "Join" button is pressed
        joinButton.addEventListener('click', () => {
            const enteredGroupID = groupIDInput.value.trim();
            if (enteredGroupID) {
                // Check if the group exists in Firebase
                firebase.database().ref('groups/' + enteredGroupID).once('value').then(snapshot => {
                    if (snapshot.exists()) {
                        // Group exists, join the group
                        localStorage.setItem('spotifyGroupID', enteredGroupID);
                        localStorage.removeItem('isGroupLeader'); // Ensure the user is not marked as leader
                        //alert(`Joined group with ID: ${enteredGroupID}`);
                        window.location.reload(); // Reload the page to update UI
                    } else {
                        // Group does not exist, show an error
                        alert('Group ID does not exist. Please check the ID and try again.');
                    }
                }).catch(err => {
                    console.error('Error checking group ID:', err);
                });
            }
        });
    }

    // Handle leaving the group or ending the group session
    leaveGroupButton.addEventListener('click', () => {
        if (isLeader) {
            // If the user is the group leader, remove the group from Firebase
            firebase.database().ref('groups/' + groupID).remove().then(() => {
                //alert('Group session ended.');
            }).catch(err => {
                console.error('Error ending group session:', err);
            });
        } else {
            alert('You have left the group.');
        }
        // Clear the group data from localStorage
        localStorage.removeItem('spotifyGroupID');
        localStorage.removeItem('isGroupLeader');
        window.location.reload(); // Reload the page to update UI
    });

    // Set the initial song title
    document.getElementById("song-title").textContent = currentSong;

    let hasVoted = false;  // Local flag to track if the user has already voted for the current song
    let currentSongTitle = null; // Variable to track the current song title

    // Event listeners for voting buttons
    document.getElementById("vote-keep").addEventListener("click", () => {
        if (!hasVoted) {
            castVote('keep');
            hasVoted = true; // Set the flag to true after voting
        } else {
            alert('You have already voted for this song.');
        }
    });

    document.getElementById("vote-skip").addEventListener("click", () => {
        if (!hasVoted) {
            castVote('skip');
            hasVoted = true; // Set the flag to true after voting
        } else {
            alert('You have already voted for this song.');
        }
    });

    // Function to handle voting
    function castVote(action) {
        const voteRef = firebase.database().ref('groups/' + groupID + '/votes/' + action);
        
        voteRef.transaction(currentVotes => {
            return (currentVotes || 0) + 1;
        }).then(() => {
            console.log(`Voted to ${action}.`);
            updateVoteStatus(); // Update the vote status after voting
        }).catch(err => {
            console.error(`Error voting to ${action}:`, err);
        });
    }

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

    // Function to update the vote status and check for song change
    function updateVoteStatus() {
        const votesRef = firebase.database().ref('groups/' + groupID + '/votes');
        const songRef = firebase.database().ref('groups/' + groupID + '/currentSong/title');
        
        songRef.once('value').then(snapshot => {
            const newSongTitle = snapshot.val(); // Get the current song title
            if (newSongTitle !== currentSongTitle) {
                // Song has changed, reset votes and flag
                currentSongTitle = newSongTitle;
                hasVoted = false; // Reset the voting flag for the new song
                resetVotes(); // Reset votes in Firebase
            }
            
            votesRef.once('value').then(snapshot => {
                const votes = snapshot.val() || { keep: 0, skip: 0 }; // Default to 0 if no votes yet
                const voteStatus = document.getElementById("vote-status");

                voteStatus.textContent = `Votes: Keep (${votes.keep}), Skip (${votes.skip})`;

                if (votes.skip > totalListeners / 2) {
                    voteStatus.textContent = "Majority voted to skip the song. Advancing to the next song...";
                    setTimeout(() => {
                        // Logic to move to the next song
                        moveToNextSong();
                    }, 2000);
                }
            }).catch(err => {
                console.error('Error fetching votes from Firebase:', err);
            });
        }).catch(err => {
            console.error('Error fetching current song from Firebase:', err);
        });
    }

    // Function to reset votes in Firebase
    function resetVotes() {
        const votesRef = firebase.database().ref('groups/' + groupID + '/votes');
        
        votesRef.set({ keep: 0, skip: 0 }).then(() => {
            console.log('Votes reset successfully.');
        }).catch(err => {
            console.error('Error resetting votes:', err);
        });
    }

    // Function to move to the next song (pseudo-function)
    function moveToNextSong() {
        // Logic to change the song
        // This will trigger updateVoteStatus on the next song
    }

    // Initial setup to listen for changes in the votes
    firebase.database().ref('groups/' + groupID + '/votes').on('value', snapshot => {
        updateVoteStatus(); // Update vote status whenever the vote counts change
    });

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
