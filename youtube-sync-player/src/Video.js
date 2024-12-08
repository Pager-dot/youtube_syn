import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');
// const SYNC_THRESHOLD = 2;

const getVideoId = (url) => {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|embed)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url && url.match(regex);
  return match ? match[1] : null;
};

function VideoPlayer({ roomId, url }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [player, setPlayer] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false); 
  const [users, setUsers] = useState([]);
  const [isBuffering, setIsBuffering] = useState(false); // Buffering state
  const playerContainerRef = useRef(null);
  const videoId = useRef(getVideoId(url));
  const hasInitialized = useRef(false);
  const ignoreStateChange = useRef(false);

  const createPlayer = () => {
    if (hasInitialized.current) return;

    const newPlayer = new window.YT.Player(playerContainerRef.current, {
      height: '390',
      width: '640',
      videoId: videoId.current,
      playerVars: {
        playsinline: 1,
        controls: 0,
      },
      events: {
        onReady: (event) => {
          setPlayer(event.target);
          setVideoDuration(event.target.getDuration());
        },
        onStateChange: handlePlayerStateChange,
      },
    });

    hasInitialized.current = true;
  };

  const initializeYouTubePlayer = useCallback(() => {
    if (!videoId.current || hasInitialized.current) return;
  
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = createPlayer;
    } else {
      createPlayer();
    }
  }, []);  // Add createPlayer as a dependency
  
  const handlePlayerStateChange = (event) => {
    if (!player || ignoreStateChange.current) return;

    const time = player.getCurrentTime();
    setCurrentTime(time);

    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        setIsBuffering(false); // Stop buffering when video starts
        socket.emit('play', { roomId, time, playbackSpeed });
        startTimeUpdate();
        break;
      case window.YT.PlayerState.PAUSED:
        socket.emit('pause', { roomId, time });
        stopTimeUpdate();
        break;
      case window.YT.PlayerState.BUFFERING:
        setIsBuffering(true); // Show buffering when video is loading
        break;
    }
  };

  const handleMute = () => {
    if (player) {
      player.mute();
      setIsMuted(true);
      socket.emit('mute', { roomId });
    }
  };

  const handleUnmute = () => {
    if (player) {
      player.unMute();
      setIsMuted(false);
      socket.emit('unmute', { roomId });
    }
  };

  

  const startTimeUpdate = () => {
    window.timeUpdateInterval = setInterval(() => {
      if (player) {
        const time = player.getCurrentTime();
        setCurrentTime(time);
      }
    }, 1000);
  };

  const stopTimeUpdate = () => {
    if (window.timeUpdateInterval) {
      clearInterval(window.timeUpdateInterval);
    }
  };

  useEffect(() => {
    if (!roomId || !url) return;

    socket.emit('joinRoom', { roomId, url });
    initializeYouTubePlayer();

    socket.on('roomUsers', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on('play', ({ time, playbackSpeed: newSpeed }) => {
      if (!player) return;
      ignoreStateChange.current = true;
      player.seekTo(time, true);
      player.setPlaybackRate(newSpeed);
      player.playVideo();
      setTimeout(() => {
        ignoreStateChange.current = false;
      }, 500);
    });

    socket.on('pause', ({ time }) => {
      if (!player) return;
      ignoreStateChange.current = true;
      player.seekTo(time, true);
      player.pauseVideo();
      setTimeout(() => {
        ignoreStateChange.current = false;
      }, 500);
    });

    socket.on('seek', ({ time }) => {
      if (!player) return;
      ignoreStateChange.current = true;
      player.seekTo(time, true);
      setCurrentTime(time); 
      setTimeout(() => {
        ignoreStateChange.current = false;
      }, 500);
    });

    socket.on('mute', () => {
      if (!player) return;
      player.mute();
      setIsMuted(true);
    });

    socket.on('unmute', () => {
      if (!player) return;
      player.unMute();
      setIsMuted(false);
    });

    return () => {
      if (player) {
        player.destroy();
      }
      socket.off('roomUsers');
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      stopTimeUpdate();
    };
  }, [roomId, url, player]);

  const handlePlay = () => {
    if (!player) return;
    const time = player.getCurrentTime();
    player.playVideo();
    socket.emit('play', { roomId, time, playbackSpeed });
  };

  const handlePause = () => {
    if (!player) return;
    const time = player.getCurrentTime();
    player.pauseVideo();
    socket.emit('pause', { roomId, time });
  };

  const handleSeek = (time) => {
    if (!player) return;
    player.seekTo(time, true);
    setCurrentTime(time);
    socket.emit('seek', { roomId, time });
  };

  const handleSpeedChange = (speed) => {
    speed = parseFloat(speed);
    if (!player) return;
    setPlaybackSpeed(speed);
    player.setPlaybackRate(speed);
    const time = player.getCurrentTime();
    socket.emit('play', { roomId, time, playbackSpeed: speed });
  };


    return (
      <div className="video-player">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>Room ID: <strong>{roomId}</strong></div>
          <div>Users in Room: <strong>{users.length}</strong></div>
        </div>
    
        <div ref={playerContainerRef} id="player-container">
          <div id="player" />
        </div>
    
        {isBuffering && <div className="buffering">Loading...</div>}
    
        <div className="controls">
          <button onClick={handlePlay}>Play</button>
          <button onClick={handlePause}>Pause</button>
          <button onClick={isMuted ? handleUnmute : handleMute}>
            {isMuted ? "Unmute" : "Mute"}
          </button>
    
          <input
            type="range"
            min="0"
            max={videoDuration}
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
          />
    
          <select value={playbackSpeed} onChange={(e) => handleSpeedChange(e.target.value)}>
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>
    );
    
  
}

export default VideoPlayer;
