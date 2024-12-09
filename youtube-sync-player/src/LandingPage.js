import React, { useState } from 'react';
import { API_URL } from './config';

import axios from 'axios';

function LandingPage({ setRoomId, setUrl, navigateToRoom }) {
  const [inputRoomId, setInputRoomId] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState('');

  const createRoom = async () => {
    try {
      setError('');
      if (!youtubeUrl) {
        setError('Please enter a YouTube URL');
        return;
      }

      console.log("API_URL:",API_URL);
      console.log(`${API_URL}/create-room`,);

      const response = await axios.post(`${API_URL}/create-room`, {
        url: youtubeUrl
      });

      setRoomId(response.data.roomId);
      setUrl(youtubeUrl);
      console.log("Response from backend for roomId and url: ", response.data.roomId, youtubeUrl);
      navigateToRoom();
    } catch (error) {
      setError('Failed to create room. Please try again.');
    }
  };

  const joinRoom = async () => {
    try {
      setError('');
      if (!inputRoomId) {
        setError('Please enter a Room ID');
        return;
      }

      const response = await axios.post(`${API_URL}/join-room`, {
        roomId: inputRoomId
      });

      setRoomId(response.data.roomId);
      setUrl(response.data.url);
      console.log("Response from backend for joining room: ", response.data.roomId, response.data.url);
      navigateToRoom();
    } catch (error) {
      setError('Invalid room ID or room not found.');
    }
  };

  return (
    <div className="landing-page">
      <h1>YouTube Sync</h1>
      {error && <div className="error">{error}</div>}

      <div className="create-room">
        <h2>Create a Room</h2>
        <input
          type="text"
          placeholder="Enter YouTube URL"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
        />
        <button onClick={createRoom}>Create Room</button>
      </div>

      <div className="join-room">
        <h2>Join a Room</h2>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={inputRoomId}
          onChange={(e) => setInputRoomId(e.target.value)}
        />
        <button onClick={joinRoom}>Join Room</button>
      </div>
    </div>
  );
}

export default LandingPage;
