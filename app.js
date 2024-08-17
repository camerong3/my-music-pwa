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

    function getLuminance(hex) {
        const rgb = parseInt(hex.substring(1), 16); // Convert hex to RGB
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >>  8) & 0xff;
        const b = (rgb >>  0) & 0xff;
    
        // Convert to a value between 0 and 1
        const rLum = r / 255;
        const gLum = g / 255;
        const bLum = b / 255;
    
        // Apply the luminance formula
        return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
    }
    
    function adjustTextColorForContrast(textHex, backgroundHex) {
        const backgroundLuminance = getLuminance(backgroundHex);
    
        // If background is dark, lighten the text color
        if (backgroundLuminance < 0.5) {
            return lightenColor(textHex, 50);
        } else {
            return darkenColor(textHex, 50);
        }
    }
    
    function lightenColor(hex, percent) {
        const num = parseInt(hex.slice(1), 16),
              amt = Math.round(2.55 * percent),
              R = (num >> 16) + amt,
              G = (num >> 8 & 0x00FF) + amt,
              B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
                      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
                      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    function darkenColor(hex, percent) {
        const num = parseInt(hex.slice(1), 16),
              amt = Math.round(2.55 * percent),
              R = (num >> 16) - amt,
              G = (num >> 8 & 0x00FF) - amt,
              B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
                      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
                      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    function updateBackgroundColor(imageUrl) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
    
        img.onload = function() {
            const vibrant = new Vibrant(img);
            const swatches = vibrant.swatches();

            if (swatches.Muted) {
                backgroundColor = swatches.Muted.getHex();
            } else if (swatches.DarkMuted) {
                backgroundColor = swatches.DarkMuted.getHex();
            } else if (swatches.Vibrant) {
                backgroundColor = swatches.Vibrant.getHex();
            } else {
                backgroundColor = "#f0f0f0"; // Default fallback color
            }
            
            document.body.style.backgroundColor = backgroundColor;

            // Adjust text colors based on the palette and background luminance
            if (swatches.Vibrant) {
                const adjustedVibrant = adjustTextColorForContrast(swatches.Vibrant.getHex(), backgroundColor);
                document.getElementById("song-title").style.color = adjustedVibrant;
            }

            if (swatches.DarkVibrant) {
                const adjustedDarkVibrant = adjustTextColorForContrast(swatches.DarkVibrant.getHex(), backgroundColor);
                document.getElementById("artist-name").style.color = adjustedDarkVibrant;
            }

            // Adjust the settings icon color based on the background color
            const settingsButton = document.getElementById("settings-button");
            const groupButton = document.getElementById("group-buttons");
            if (settingsButton) {
                const adjustedButtonColor = adjustTextColorForContrast(swatches.Muted.getHex(), backgroundColor); // Base color can be changed
                settingsButton.style.color = adjustedButtonColor;
            }
            if (groupButton) {
                const adjustedButtonColor = adjustTextColorForContrast(swatches.Muted.getHex(), backgroundColor); // Base color can be changed
                groupButton.style.color = adjustedButtonColor;
            }
            
            // Define the base colors for keep and skip
            const baseKeepColor = "#00FF00"; // Green for keep
            const baseSkipColor = "#FF0000"; // Red for skip
            
            // Adjust the icon color based on the background color
            const keepButton = document.getElementById("vote-keep");
            const skipButton = document.getElementById("vote-skip");
            if (keepButton && skipButton) {
                const adjustedIconColor = adjustTextColorForContrast(swatches.Muted.getHex(), backgroundColor); // You can use the same color for both icons
                keepButton.style.color = adjustedIconColor;
                skipButton.style.color = adjustedIconColor;
            }
        };
    }

    // Update song information in the UI and adjust colors
    function updateSongUI(songInfo) {
        document.getElementById("song-title").textContent = songInfo.title;
        document.getElementById("artist-name").textContent = songInfo.artist;
        document.getElementById("album-art").src = songInfo.albumArt;
        document.getElementById("album-art").style.display = 'block';

        // Update the background color based on the album art
        updateBackgroundColor(songInfo.albumArt);
    }

    // Poll the current song every 5 seconds (adjust as needed)
    function pollCurrentSong() {
        const token = localStorage.getItem('spotifyAccessToken');
        const groupID = localStorage.getItem('spotifyGroupID');
        let previousSongTitle = localStorage.getItem('currentSongTitle') || null; // Get the previously stored song title
        
        if (token) {
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
    
                    // Check if the song title has changed
                    if (songInfo.title !== previousSongTitle) {
                        // Song has changed, reset votes and the hasVoted flag if a group is active
                        if (groupID) {
                            resetVotes(); // Reset votes in Firebase
                        }
                        localStorage.setItem('currentSongTitle', songInfo.title); // Update the stored song title
                    }

                    // Update the UI
                    updateSongUI(songInfo);

                    // Store the current song information in Firebase if in a group
                    if (groupID) {
                        firebase.database().ref('groups/' + groupID + '/currentSong').set(songInfo);
                    }
                }
            })
            .catch(err => console.error('Error fetching currently playing song:', err));
        }
    }

    // Initial song polling
    pollCurrentSong();

    // Set up the song polling interval
    setInterval(pollCurrentSong, 5000);

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
        groupIDElement.textContent = `Group ID: ${groupID}`;
        document.getElementById('current-group-id').appendChild(groupIDElement);

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
                // window.location.reload(); // Reload the page to update UI
                return;
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

            // Increment listener count in Firebase when user joins
            const groupRef = firebase.database().ref('groups/' + newGroupID + '/listenerCount');
            groupRef.transaction(currentCount => {
                return (currentCount || 0) + 1;
            });

            // Reload the page to update UI
            // window.location.reload();
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
                        // Increment listener count in Firebase when user joins
                        const groupRef = firebase.database().ref('groups/' + enteredGroupID + '/listenerCount');
                        groupRef.transaction(currentCount => {
                            return (currentCount || 0) + 1;
                        }).then(() => {
                            // Group exists, join the group
                            localStorage.setItem('spotifyGroupID', enteredGroupID);
                            localStorage.removeItem('isGroupLeader'); // Ensure the user is not marked as leader
                            // Reload the page to update UI
                            // window.location.reload();
                        }).catch(err => {
                            console.error('Error incrementing listener count:', err);
                        });
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
            // Decrement listener count when user leaves
            const groupRef = firebase.database().ref('groups/' + groupID + '/listenerCount');
            groupRef.transaction(currentCount => {
                return (currentCount || 0) - 1;
            });
            alert('You have left the group.');
        }
        // Clear the group data from localStorage
        localStorage.removeItem('spotifyGroupID');
        localStorage.removeItem('isGroupLeader');
        // window.location.reload(); // Reload the page to update UI
    });

    // Set the initial song title
    document.getElementById("song-title").textContent = currentSong;

    let hasVoted = false;  // Local flag to track if the user has already voted for the current song
    localStorage.setItem('hasVoted', hasVoted);
    let currentSongTitle = ""; // Variable to track the current song title

    // Event listeners for voting buttons
    document.getElementById("vote-keep").addEventListener("click", () => {
        if (!hasVoted) {
            castVote('keep');
            hasVoted = true; // Set the flag to true after voting
            localStorage.setItem('hasVoted', hasVoted);
        } else {
            alert('You have already voted for this song.');
        }
    });

    document.getElementById("vote-skip").addEventListener("click", () => {
        if (!hasVoted) {
            castVote('skip');
            hasVoted = true; // Set the flag to true after voting
            localStorage.setItem('hasVoted', hasVoted); 
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
            
        votesRef.once('value').then(snapshot => {
            const votes = snapshot.val() || { keep: 0, skip: 0 }; // Default to 0 if no votes yet
            const voteStatus = document.getElementById("vote-status");

            voteStatus.textContent = `Votes: Keep (${votes.keep}), Skip (${votes.skip})`;

            if (votes.skip > totalListeners / 2) {
                voteStatus.textContent = "Advancing to the next song...";
                setTimeout(() => {
                    // Logic to move to the next song
                    moveToNextSong();
                }, 1000);
            }
        }).catch(err => {
            console.error('Error fetching votes from Firebase:', err);
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

        hasVoted = false; // Reset the voting flag for the new song
        localStorage.setItem('hasVoted', hasVoted); // Update local storage
    }

    // Function to move to the next song (for group leader only)
    function moveToNextSong() {
        const isLeader = localStorage.getItem('isGroupLeader') === 'true';
        const token = localStorage.getItem('spotifyAccessToken');

        if (isLeader && token) {
            // Make the Spotify API call to skip to the next song
            fetch('https://api.spotify.com/v1/me/player/next', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.status === 204) {
                    console.log('Successfully skipped to the next song.');
                } else {
                    console.error('Failed to skip to the next song:', response.status);
                }
            })
            .catch(err => {
                console.error('Error skipping to the next song:', err);
            });
            // Song skip requested, reset votes and the hasVoted flag
            localStorage.setItem('currentSongTitle', songInfo.title); // Update the stored song title
            resetVotes(); // Reset votes in Firebase
        } else {
            console.log('Not the group leader or Spotify token is missing.');
        }
    }

    // Initial setup to listen for changes in the votes
    firebase.database().ref('groups/' + groupID + '/votes').on('value', snapshot => {
        updateVoteStatus(); // Update vote status whenever the vote counts change
    });

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
