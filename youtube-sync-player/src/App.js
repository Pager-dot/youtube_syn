import React, { useState } from 'react';
import VideoPlayer from './Video';
import LandingPage from './LandingPage';

function App() {
  const [roomId, setRoomId] = useState('');
  const [url, setUrl] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);

  const navigateToRoom = () => {
    setIsInRoom(true);
  };

  const exitRoom = () => {
    setIsInRoom(false);
    setRoomId('');
    setUrl('');
  };

  return (
    <div>
      {!isInRoom ? (
        <LandingPage
          setRoomId={setRoomId}
          setUrl={setUrl}
          roomId={roomId}
          url={url}
          navigateToRoom={navigateToRoom}
        />
      ) : (
        <div>
          <button onClick={exitRoom} style={{ margin: '10px' }}>Exit Room</button>
          <VideoPlayer roomId={roomId} url={url} />
        </div>
      )}
    </div>
  );
}

export default App;
