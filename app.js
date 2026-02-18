// Initialize Framework7 App
const app = new Framework7({
  el: '#app',
  theme: 'ios',
  darkMode: true,
});

const flashColor = 'rgb(196, 222, 250)'; // Default flash color for the beat indicator

// Data storage
let shows = [];
let currentShowIndex = null;
let currentEditSongIndex = null;
let currentPlaybackSongIndex = 0;
let isPlaying = false;
let metronomeAnimation = null;
let currentBPM = 120; // Current playback BPM (independent from song data)
let isRestoringState = false; // Flag to prevent saving state during restoration

// Initialize Framework7 components
let songEditPopup;
let showEditPopup;
let sharePopup;
let playbackSheet;

// DOM Elements - Navigation
const backToShowsBtn = document.getElementById('backToShowsBtn');
const mainTitle = document.getElementById('mainTitle');
const addItemBtn = document.getElementById('addItemBtn');
const editShowBtn = document.getElementById('editShowBtn');

// Shows UI
const showsListContainer = document.getElementById('showsListContainer');
const showsList = document.getElementById('showsList');
const showsListUl = document.getElementById('showsListUl');
const showsEmptyState = document.getElementById('showsEmptyState');

// Songs UI
const songsListContainer = document.getElementById('songsListContainer');
const songsList = document.getElementById('songsList');
const songsListUl = document.getElementById('songsListUl');
const songsEmptyState = document.getElementById('songsEmptyState');
const startPlaybackBtn = document.getElementById('startPlaybackBtn');

// Popup elements
const showNameInput = document.getElementById('showNameInput');
const deleteShowBlock = document.getElementById('deleteShowBlock');
const shareShowBlock = document.getElementById('shareShowBlock');
const showPopupTitle = document.getElementById('showPopupTitle');

const songNameInput = document.getElementById('songNameInput');
const bpmInput = document.getElementById('bpmInput');
const deleteSongBlock = document.getElementById('deleteSongBlock');
const popupTitle = document.getElementById('popupTitle');

// Playback elements
// const playbackSongName = document.getElementById('playbackSongName');
const playbackSongTitle = document.getElementById('playbackSongTitle');
const bpmDisplay = document.getElementById('bpmDisplay');
const beatIndicator = document.getElementById('beatIndicator');
const playPauseBtn = document.getElementById('playPauseBtn');
const playPauseIcon = document.getElementById('playPauseIcon');
const prevTrackBtn = document.getElementById('prevTrackBtn');
const nextTrackBtn = document.getElementById('nextTrackBtn');
const tempoUpBtn = document.getElementById('tempoUpBtn');
const tempoDownBtn = document.getElementById('tempoDownBtn');
const saveTempoBtn = document.getElementById('saveTempoBtn');
const upcomingSongTitle = document.getElementById('upcomingSongTitle');

// Custom function to resize song title text to fit in container
function resizeSongTitle() {
  const maxSize = 50;
  const minSize = 20;
  let currentSize = maxSize;
  
  playbackSongTitle.style.fontSize = currentSize + 'px';
  
  // Reduce font size until text fits in container
  while (playbackSongTitle.scrollHeight > playbackSongTitle.clientHeight && currentSize > minSize) {
    currentSize -= 1;
    playbackSongTitle.style.fontSize = currentSize + 'px';
  }
}

// Load data from localStorage
function loadData() {
  const stored = localStorage.getItem('downbeat_shows');
  if (stored) {
    try {
      shows = JSON.parse(stored);
    } catch (e) {
      console.error('Error loading data:', e);
      shows = [];
    }
  } else {
    // Check for old format data and migrate
    const oldData = localStorage.getItem('downbeat_songs');
    if (oldData) {
      try {
        const oldSongs = JSON.parse(oldData);
        if (oldSongs.length > 0) {
          // Migrate old songs to new format - create a default show
          shows = [{
            name: 'Default Show',
            songs: oldSongs.map(song => ({ name: song.name, bpm: song.bpm }))
          }];
          saveData();
          localStorage.removeItem('downbeat_songs'); // Clean up old data
        }
      } catch (e) {
        console.error('Error migrating old data:', e);
      }
    }
    
    // If still no data, create default show and song
    if (shows.length === 0) {
      shows = [{
        name: 'My Show',
        songs: [{ name: 'My First Song', bpm: 120 }]
      }];
      saveData();
    }
  }
  // Don't call showShowsList() here - let restoreViewState() handle the initial view
}

// Save data to localStorage
function saveData() {
  localStorage.setItem('downbeat_shows', JSON.stringify(shows));
}

// Save current view state to localStorage
function saveViewState() {
  // Don't save state while we're restoring it
  if (isRestoringState) return;
  
  const state = {
    view: 'shows', // 'shows', 'songs', or 'playback'
    showIndex: currentShowIndex,
    songIndex: currentPlaybackSongIndex
  };
  
  if (playbackSheet && playbackSheet.opened) {
    state.view = 'playback';
  } else if (currentShowIndex !== null) {
    state.view = 'songs';
  } else {
    state.view = 'shows';
  }
  
  console.log('[saveViewState]', state);
  localStorage.setItem('downbeat_view_state', JSON.stringify(state));
}

// Restore view state from localStorage
function restoreViewState() {
  const stored = localStorage.getItem('downbeat_view_state');
  console.log('[restoreViewState] Stored state:', stored);
  
  if (!stored) {
    console.log('[restoreViewState] No saved state, showing shows list');
    showShowsList();
    return;
  }
  
  try {
    const state = JSON.parse(stored);
    console.log('[restoreViewState] Parsed state:', state);
    
    // Set flag to prevent saving during restoration
    isRestoringState = true;
    
    // Validate the state
    if (state.view === 'playback' && state.showIndex !== null) {
      // Check if show and song still exist
      if (shows[state.showIndex] && shows[state.showIndex].songs && shows[state.showIndex].songs[state.songIndex]) {
        console.log('[restoreViewState] Restoring to playback mode');
        currentShowIndex = state.showIndex;
        currentPlaybackSongIndex = state.songIndex;
        showSongsList(state.showIndex); // Set up the songs list first
        
        // Use setTimeout to ensure DOM is ready before opening sheet
        setTimeout(() => {
          enterPlaybackMode();
          isRestoringState = false;
        }, 100);
        return;
      } else {
        console.log('[restoreViewState] Show or song no longer exists');
      }
    } else if (state.view === 'songs' && state.showIndex !== null) {
      // Check if show still exists
      if (shows[state.showIndex]) {
        console.log('[restoreViewState] Restoring to songs list');
        showSongsList(state.showIndex);
        isRestoringState = false;
        return;
      } else {
        console.log('[restoreViewState] Show no longer exists');
      }
    }
    
    // Default to shows list if state is invalid
    console.log('[restoreViewState] Defaulting to shows list');
    showShowsList();
    isRestoringState = false;
  } catch (e) {
    console.error('Error restoring view state:', e);
    showShowsList();
    isRestoringState = false;
  }
}

// Show the shows list view
function showShowsList() {
  currentShowIndex = null;
  showsListContainer.style.display = 'block';
  songsListContainer.style.display = 'none';
  backToShowsBtn.style.display = 'none';
  editShowBtn.style.display = 'none';
  mainTitle.textContent = 'Downbeat ~ Conductor Metronome';
  renderShowsList();
  saveViewState();
}

// Show the songs list for a specific show
function showSongsList(showIndex) {
  currentShowIndex = showIndex;
  showsListContainer.style.display = 'none';
  songsListContainer.style.display = 'block';
  backToShowsBtn.style.display = 'block';
  editShowBtn.style.display = 'flex';
  mainTitle.textContent = shows[showIndex].name;
  renderSongsList();
  saveViewState();
}

// Render shows list
function renderShowsList() {
  showsListUl.innerHTML = '';
  
  if (shows.length === 0) {
    showsEmptyState.style.display = 'block';
    showsList.style.display = 'none';
  } else {
    showsEmptyState.style.display = 'none';
    showsList.style.display = 'block';
    
    shows.forEach((show, index) => {
      const li = document.createElement('li');
      const songCount = show.songs ? show.songs.length : 0;
      li.innerHTML = `
        <div class="item-content" data-index="${index}" style="cursor: pointer;">
          <div class="item-inner">
            <div class="item-title">${show.name}</div>
            <div class="item-after">${songCount} song${songCount !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `;
      showsListUl.appendChild(li);
    });
    
    // Add click handlers
    showsListUl.querySelectorAll('.item-content').forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.index);
        showSongsList(index);
      });
      
      // Long press to edit
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const index = parseInt(item.dataset.index);
        editShow(index);
      });
    });
  }
}

// Render songs list
function renderSongsList() {
  songsListUl.innerHTML = '';
  
  if (currentShowIndex === null) return;
  
  const show = shows[currentShowIndex];
  const songs = show.songs || [];
  
  if (songs.length === 0) {
    songsEmptyState.style.display = 'block';
    songsList.style.display = 'none';
    startPlaybackBtn.disabled = true;
  } else {
    songsEmptyState.style.display = 'none';
    songsList.style.display = 'block';
    startPlaybackBtn.disabled = false;
    
    songs.forEach((song, index) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="item-content" style="display: flex; align-items: center; padding: 8px 16px;">
          <div class="sortable-handler" style="margin-right: 12px; cursor: grab;">
          </div>
          <a href="#" class="song-play-btn" data-index="${index}" style="margin-right: 12px;">
            <i class="f7-icons" style="font-size: 32px;">play_circle_fill</i>
          </a>
          <div class="item-inner song-edit-area" style="flex: 1; cursor: pointer;" data-index="${index}">
            <div class="item-title">${song.name}</div>
            <div class="item-subtitle">${song.bpm}</div>
          </div>
        </div>
      `;
      songsListUl.appendChild(li);
    });
    
    // Add event listeners
    songsListUl.querySelectorAll('.song-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        startPlaybackFromSong(index);
      });
    });
    
    songsListUl.querySelectorAll('.song-edit-area').forEach(div => {
      div.addEventListener('click', () => {
        const index = parseInt(div.dataset.index);
        editSong(index);
      });
    });
  }
}

// Open add show popup
function openAddShowPopup() {
  showPopupTitle.textContent = 'Add Show';
  showNameInput.value = '';
  deleteShowBlock.style.display = 'none';
  shareShowBlock.style.display = 'none';
  showEditPopup.open();
}

// Edit show
function editShow(index) {
  const show = shows[index];
  showPopupTitle.textContent = 'Edit Show';
  showNameInput.value = show.name;
  deleteShowBlock.style.display = 'block';
  shareShowBlock.style.display = 'block';
  
  // Store the index for saving
  showEditPopup.$el[0].dataset.editIndex = index;
  showEditPopup.open();
}

// Save show
function saveShow() {
  const name = showNameInput.value.trim();
  
  if (!name) {
    app.dialog.alert('Please enter a show name');
    return;
  }
  
  const editIndex = showEditPopup.$el[0].dataset.editIndex;
  
  if (editIndex !== undefined && editIndex !== '') {
    // Update existing show
    const index = parseInt(editIndex);
    shows[index].name = name;
    
    // Update title if we're currently viewing this show
    if (currentShowIndex === index) {
      mainTitle.textContent = name;
    }
  } else {
    // Add new show
    shows.push({ name, songs: [] });
  }
  
  saveData();
  renderShowsList();
  showEditPopup.close();
  delete showEditPopup.$el[0].dataset.editIndex;
}

// Delete show
function deleteShow() {
  const editIndex = showEditPopup.$el[0].dataset.editIndex;
  
  if (editIndex !== undefined && editIndex !== '') {
    app.dialog.confirm('Are you sure you want to delete this show and all its songs?', () => {
      shows.splice(parseInt(editIndex), 1);
      saveData();
      showEditPopup.close();
      delete showEditPopup.$el[0].dataset.editIndex;
      showShowsList();
    });
  }
}

// Open add song popup
function openAddSongPopup() {
  if (currentShowIndex === null) return;
  
  currentEditSongIndex = null;
  popupTitle.textContent = 'Add Song';
  songNameInput.value = '';
  bpmInput.value = '120';
  deleteSongBlock.style.display = 'none';
  songEditPopup.open();
}

// Edit song
function editSong(index) {
  if (currentShowIndex === null) return;
  
  currentEditSongIndex = index;
  const song = shows[currentShowIndex].songs[index];
  popupTitle.textContent = 'Edit Song';
  songNameInput.value = song.name;
  bpmInput.value = song.bpm;
  deleteSongBlock.style.display = 'block';
  songEditPopup.open();
}

// Save song
function saveSong() {
  if (currentShowIndex === null) return;
  
  const name = songNameInput.value.trim();
  const bpm = parseInt(bpmInput.value) || 120;
  
  if (!name) {
    app.dialog.alert('Please enter a song name');
    return;
  }
  
  if (bpm < 20 || bpm > 300) {
    app.dialog.alert('BPM must be between 20 and 300');
    return;
  }
  
  const song = { name, bpm };
  
  if (currentEditSongIndex === null) {
    // Add new song
    shows[currentShowIndex].songs.push(song);
  } else {
    // Update existing song
    shows[currentShowIndex].songs[currentEditSongIndex] = song;
  }
  
  saveData();
  renderSongsList();
  songEditPopup.close();
}

// Delete song
function deleteSong() {
  if (currentShowIndex === null || currentEditSongIndex === null) return;
  
  app.dialog.confirm('Are you sure you want to delete this song?', () => {
    shows[currentShowIndex].songs.splice(currentEditSongIndex, 1);
    saveData();
    renderSongsList();
    songEditPopup.close();
  });
}

// Start playback from specific song
function startPlaybackFromSong(index) {
  currentPlaybackSongIndex = index;
  enterPlaybackMode();
}

// Enter playback mode
function enterPlaybackMode() {
  if (currentShowIndex === null) return;
  
  const show = shows[currentShowIndex];
  if (!show.songs || show.songs.length === 0) return;
  
  loadCurrentSong();
  playbackSheet.open();
  startMetronome();
  saveViewState();
}

// Exit playback mode
function exitPlaybackMode() {
  stopMetronome();
  playbackSheet.close();
  saveViewState();
}

// Load current song into playback view
function loadCurrentSong() {
  if (currentShowIndex === null) return;
  
  const songs = shows[currentShowIndex].songs;
  if (currentPlaybackSongIndex < 0 || currentPlaybackSongIndex >= songs.length) {
    currentPlaybackSongIndex = 0;
  }
  
  const song = songs[currentPlaybackSongIndex];
  currentBPM = song.bpm; // Set current BPM from song
  console.log(`[loadCurrentSong] Loaded "${song.name}" with BPM: ${currentBPM}`);
  
  // playbackSongName.textContent = song.name;
  playbackSongTitle.textContent = song.name;
  bpmDisplay.textContent = currentBPM;
  
  // Auto-resize song title to fit in container
  resizeSongTitle();
  
  // Update upcoming song title
  if (currentPlaybackSongIndex < songs.length - 1) {
    upcomingSongTitle.textContent = songs[currentPlaybackSongIndex + 1].name;
  } else {
    upcomingSongTitle.textContent = '—';
  }
  
  saveViewState();
}

// Start metronome using Web Animations API
function startMetronome() {
  // console.log(`[startMetronome] Called. isPlaying: ${isPlaying}, currentBPM: ${currentBPM}`);
  
  if (!isPlaying) {
    isPlaying = true;
    playPauseIcon.textContent = 'pause_circle_fill';
    
    // Cancel any existing animation
    if (metronomeAnimation) {
      // console.log('[startMetronome] Canceling existing animation');
      metronomeAnimation.cancel();
      metronomeAnimation = null;
    }
    
    // Create animation with base duration of 60000ms (1 minute = 1 BPM)
    // Flash happens in first ~100ms (0.167% of duration at 1 BPM)
    const keyframes = [
      { backgroundColor: flashColor, offset: 0 },
      { backgroundColor: flashColor, offset: 0.1 },
      { backgroundColor: 'transparent', offset: 0.3 },
      { backgroundColor: 'transparent', offset: 1 }
    ];
    
    // console.log('[startMetronome] Creating animation with base duration 60000ms');
    metronomeAnimation = beatIndicator.animate(keyframes, {
      duration: 60000, // 1 BPM base (60000ms = 1 minute)
      iterations: Infinity
    });
    
    // Set playback rate to match BPM (e.g., 120 BPM = 120x speed)
    metronomeAnimation.playbackRate = currentBPM;
    // console.log(`[startMetronome] Animation started with playbackRate: ${currentBPM}`);
  } else {
    // console.log('[startMetronome] Already playing, ignoring');
  }
}

// Stop metronome
function stopMetronome() {
  // console.log(`[stopMetronome] Called. isPlaying: ${isPlaying}`);
  
  if (isPlaying) {
    isPlaying = false;
    playPauseIcon.textContent = 'play_circle_fill';
    
    if (metronomeAnimation) {
      // console.log('[stopMetronome] Canceling animation');
      metronomeAnimation.cancel();
      metronomeAnimation = null;
    }
    
    // Reset indicator to default state
    beatIndicator.style.backgroundColor = '';
    // console.log('[stopMetronome] Metronome stopped and indicator reset');
  } else {
    // console.log('[stopMetronome] Already stopped, ignoring');
  }
}

// Toggle play/pause
function togglePlayPause() {
  if (isPlaying) {
    stopMetronome();
  } else {
    startMetronome();
  }
}

// Previous track
function previousTrack() {
  console.log(`[previousTrack] Current index: ${currentPlaybackSongIndex}`);
  
  if (currentPlaybackSongIndex > 0) {
    currentPlaybackSongIndex--;
    const wasPlaying = isPlaying;
    console.log(`[previousTrack] Moving to index ${currentPlaybackSongIndex}, wasPlaying: ${wasPlaying}`);
    
    stopMetronome();
    loadCurrentSong();
    
    if (wasPlaying) {
      startMetronome();
    }
  } else {
    console.log('[previousTrack] Already at first song');
  }
}

// Next track
function nextTrack() {
  const songs = shows[currentShowIndex].songs;
  console.log(`[nextTrack] Current index: ${currentPlaybackSongIndex}, total songs: ${songs.length}`);
  
  if (currentPlaybackSongIndex < songs.length - 1) {
    currentPlaybackSongIndex++;
    const wasPlaying = isPlaying;
    console.log(`[nextTrack] Moving to index ${currentPlaybackSongIndex}, wasPlaying: ${wasPlaying}`);
    
    stopMetronome();
    loadCurrentSong();
    
    if (wasPlaying) {
      startMetronome();
    }
  } else {
    console.log('[nextTrack] Already at last song');
  }
}

// Increase tempo - adjust playback rate smoothly
function increaseTempo() {
  if (currentBPM < 300) {
    currentBPM++;
    bpmDisplay.textContent = currentBPM;
    console.log(`[increaseTempo] New BPM: ${currentBPM}`);
    
    // Update animation playback rate for smooth tempo change
    if (metronomeAnimation) {
      metronomeAnimation.playbackRate = currentBPM;
      console.log(`[increaseTempo] Updated playbackRate to ${currentBPM}`);
    }
  } else {
    console.log('[increaseTempo] Already at max BPM (300)');
  }
}

// Decrease tempo - adjust playback rate smoothly
function decreaseTempo() {
  if (currentBPM > 20) {
    currentBPM--;
    bpmDisplay.textContent = currentBPM;
    console.log(`[decreaseTempo] New BPM: ${currentBPM}`);
    
    // Update animation playback rate for smooth tempo change
    if (metronomeAnimation) {
      metronomeAnimation.playbackRate = currentBPM;
      console.log(`[decreaseTempo] Updated playbackRate to ${currentBPM}`);
    }
  } else {
    console.log('[decreaseTempo] Already at min BPM (20)');
  }
}

// Save current tempo to song data
function saveTempo() {
  if (currentShowIndex === null) return;
  
  const show = shows[currentShowIndex];
  if (!show.songs || currentPlaybackSongIndex >= show.songs.length) return;
  
  // Update the song's BPM with the current tempo
  show.songs[currentPlaybackSongIndex].bpm = currentBPM;
  saveData();
  renderSongsList(); // Update the song list in the background
  
  // Visual feedback
  app.toast.create({
    text: `Tempo saved: ${currentBPM} BPM`,
    position: 'center',
    closeTimeout: 2000,
  }).open();
  
  console.log(`[saveTempo] Saved BPM ${currentBPM} to song "${show.songs[currentPlaybackSongIndex].name}"`);
}

// Generate shareable URL for a show
function shareShow() {
  const editIndex = showEditPopup.$el[0].dataset.editIndex;
  
  if (editIndex === undefined || editIndex === '') {
    app.dialog.alert('Please save the show first before sharing.');
    return;
  }
  
  const show = shows[parseInt(editIndex)];
  
  // Encode show data using MessagePack for compact binary format
  const showData = {
    n: show.name,  // Use shorter keys to reduce size
    s: (show.songs || []).map(song => [song.name, song.bpm])  // Array format [name, bpm]
  };
  
  // Encode with MessagePack, then convert to base64
  const msgpackData = msgpack.encode(showData);
  const base64Data = btoa(String.fromCharCode.apply(null, msgpackData));
  
  // Create shareable URL
  const shareUrl = `${window.location.origin}${window.location.pathname}#import=${base64Data}`;
  
  // Set the link in the input field
  document.getElementById('shareLinkInput').value = shareUrl;
  
  // Clear any existing QR code
  const qrcodeContainer = document.getElementById('qrcodeContainer');
  qrcodeContainer.innerHTML = '';
  
  // Try to generate QR code, display error message if too long
  try {
    new QRCode(qrcodeContainer, {
      text: shareUrl,
      width: 256,
      height: 256,
      colorDark: '#ffffff',
      colorLight: '#000000'
    });
  } catch (error) {
    console.error('QR code generation failed:', error);
    qrcodeContainer.innerHTML = '<p style="color: #999; font-size: 14px; padding: 20px; text-align: center;">Show is too long for a QR code, please use the text link to share.</p>';
  }
  
  // Open the share popup
  sharePopup.open();
}

// Check for imported show data in URL
function checkForImportedShow() {
  const hash = window.location.hash;
  
  if (!hash.startsWith('#import=')) return;
  
  try {
    // Extract and decode the data
    const base64Data = hash.substring(8); // Remove '#import='
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Decode MessagePack data
    const decodedData = msgpack.decode(bytes);
    
    // Convert compact format back to full format
    const importedShow = {
      name: decodedData.n,
      songs: decodedData.s.map(([name, bpm]) => ({ name, bpm }))
    };
    
    // Clear the hash
    history.replaceState(null, null, ' ');
    
    // Show import dialog
    showImportDialog(importedShow);
  } catch (e) {
    console.error('Error importing show:', e);
    app.dialog.alert('Invalid share link. The data could not be imported.');
  }
}

// Show import dialog for a shared show
function showImportDialog(importedShow) {
  // Generate a unique name if needed
  let proposedName = importedShow.name;
  let counter = 2;
  
  while (shows.some(show => show.name === proposedName)) {
    proposedName = `${importedShow.name} (${counter})`;
    counter++;
  }
  
  // Create custom dialog with input
  const dialog = app.dialog.create({
    title: 'Import Show',
    text: `Do you want to add "${importedShow.name}" to your library?<br><br>${importedShow.songs.length} song${importedShow.songs.length !== 1 ? 's' : ''} included.`,
    content: `
      <div class="dialog-input-field item-input-wrap">
        <input type="text" id="importShowNameInput" class="dialog-input" value="${proposedName}" placeholder="Show name">
      </div>
    `,
    buttons: [
      {
        text: 'Cancel',
        color: 'gray'
      },
      {
        text: 'Import',
        bold: true,
        onClick: () => {
          const inputField = document.getElementById('importShowNameInput');
          let finalName = inputField.value.trim();
          
          if (!finalName) {
            app.dialog.alert('Please enter a show name');
            return;
          }
          
          // Check for duplicates again and adjust if needed
          let uniqueName = finalName;
          let dupeCounter = 2;
          
          while (shows.some(show => show.name === uniqueName)) {
            uniqueName = `${finalName} (${dupeCounter})`;
            dupeCounter++;
          }
          
          // Add the show
          shows.push({
            name: uniqueName,
            songs: importedShow.songs
          });
          
          saveData();
          renderShowsList();
          
          app.toast.create({
            text: `Show "${uniqueName}" imported successfully!`,
            position: 'center',
            closeTimeout: 3000,
          }).open();
        }
      }
    ],
    on: {
      opened: () => {
        // Focus and select the input text
        const input = document.getElementById('importShowNameInput');
        if (input) {
          setTimeout(() => {
            input.focus();
            input.select();
          }, 100);
        }
      }
    }
  });
  
  dialog.open();
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Framework7 Popup and Sheet
  songEditPopup = app.popup.create({
    el: '#songEditPopup',
    on: {
      opened: () => {
        // Auto-focus on song name input
        songNameInput.focus();
      }
    }
  });
  
  showEditPopup = app.popup.create({
    el: '#showEditPopup',
  });
  
  sharePopup = app.popup.create({
    el: '#sharePopup',
  });
  
  playbackSheet = app.sheet.create({
    el: '#playbackSheet',
    backdrop: true,
    closeByBackdropClick: false,
    closeByOutsideClick: false,
    on: {
      closed: () => {
        stopMetronome();
      }
    }
  });
  
  // Handle sortable list reordering
  const songsList = document.getElementById('songsList');
  songsList.addEventListener('sortable:sort', (e) => {
    if (currentShowIndex === null) return;
    
    const oldIndex = e.detail.from;
    const newIndex = e.detail.to;
    
    // Reorder the songs array
    const show = shows[currentShowIndex];
    const [movedSong] = show.songs.splice(oldIndex, 1);
    show.songs.splice(newIndex, 0, movedSong);
    
    // Save and re-render
    saveData();
    renderSongsList();
  });
  
  // Event Listeners - Add button (context-aware)
  addItemBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentShowIndex === null) {
      openAddShowPopup();
    } else {
      openAddSongPopup();
    }
  });
  
  // Back to shows button
  backToShowsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showShowsList();
  });
  
  // Edit show button (shows in songs view)
  editShowBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (currentShowIndex !== null) {
      editShow(currentShowIndex);
    }
  });
  
  // Show popup buttons
  document.getElementById('saveShowBtn').addEventListener('click', (e) => {
    e.preventDefault();
    saveShow();
  });
  
  document.getElementById('shareShowBtn').addEventListener('click', (e) => {
    e.preventDefault();
    shareShow();
  });
  
  document.getElementById('deleteShowBtn').addEventListener('click', deleteShow);
  
  // Share popup copy button
  document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const linkInput = document.getElementById('shareLinkInput');
    const shareUrl = linkInput.value;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      app.toast.create({
        text: 'Link copied to clipboard!',
        position: 'center',
        closeTimeout: 2000,
      }).open();
    }).catch(err => {
      // Fallback: select the text for manual copying
      linkInput.select();
      app.toast.create({
        text: 'Please copy the selected link',
        position: 'center',
        closeTimeout: 2000,
      }).open();
    });
  });
  
  // Song popup buttons
  document.getElementById('saveSongBtn').addEventListener('click', (e) => {
    e.preventDefault();
    saveSong();
  });
  
  document.getElementById('deleteSongBtn').addEventListener('click', deleteSong);
  
  // BPM input - save on Enter key
  bpmInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveSong();
    }
  });
  
  // Start playback button
  startPlaybackBtn.addEventListener('click', () => {
    currentPlaybackSongIndex = 0;
    enterPlaybackMode();
  });
  
  // Playback controls
  document.getElementById('backToEditBtn').addEventListener('click', (e) => {
    e.preventDefault();
    exitPlaybackMode();
  });
  
  playPauseBtn.addEventListener('click', togglePlayPause);
  prevTrackBtn.addEventListener('click', previousTrack);
  nextTrackBtn.addEventListener('click', nextTrack);
  tempoUpBtn.addEventListener('click', increaseTempo);
  tempoDownBtn.addEventListener('click', decreaseTempo);
  saveTempoBtn.addEventListener('click', saveTempo);
  
  // Load data and restore previous view state
  loadData();
  
  // Check for imported show data in URL
  checkForImportedShow();
  
  restoreViewState();
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registered');
        
        // Check for service worker updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every 60 seconds
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available, notify user
              const notification = app.toast.create({
                text: 'New version available! Tap to update.',
                position: 'center',
                closeButton: true,
                closeButtonText: 'Update',
                closeButtonColor: 'blue',
                closeTimeout: 10000,
                on: {
                  close: () => {
                    // Tell the new service worker to take over
                    newWorker.postMessage({ action: 'skipWaiting' });
                    // Reload to get the new version
                    window.location.reload();
                  }
                }
              });
              notification.open();
            }
          });
        });
      })
      .catch(err => console.log('ServiceWorker registration failed:', err));
    
    // Handle service worker controller change
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
