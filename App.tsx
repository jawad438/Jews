import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameObject, GameState } from './types';

const PLAYER_SIZE = 48;
const OBJECT_SIZE = 36;
const PLAYER_SPEED = 7;
const INITIAL_OBJECT_SPEED = 1.5;
const INITIAL_SPAWN_INTERVAL = 1000;
const SPEED_INCREASE_FACTOR = 1.0000389;
const SPAWN_RATE_INCREASE_FACTOR = 0.99;
const HIGH_SCORE_KEY = 'fallingSquaresHighScore';

const PLAYER_IMAGE_URL = 'https://i.ibb.co/pjj7f7wy/pol-4chan-jewish-people-internet-meme-others-42b4531bcdc9809da1ad675226dfd06d.png';
const COIN_IMAGE_URL = 'https://i.ibb.co/KxVvBMBR/download-removebg-preview.png';
const ENEMY_IMAGE_URL = 'https://i.ibb.co/xKGw12wp/download-1.png';
const GAME_OVER_IMAGE_URL = 'https://i.ibb.co/0jNqdkcQ/cartoonist-4chan-reality-caricature-truth-others-a69579a51c4daadacd8156f808c6bccb.png';

const AUDIO_TRACKS = {
  playing: 'https://pouch.jumpshare.com/preview/MSlQ3FH3mpvEguiH3RTCzTAdhhC78AbIHvgz_Ybout_h8fOwU24LVQzCOh12jERjnxyvVHUCFfnHqGeDenjQG7wwdYL61RqiKvukKS2GaCQ0ob0pLRmRAQAi4mS_e8zc5Ht6E5SXpcaPT486KiEHJ26yjbN-I2pg_cnoHs_AmgI.mp',
  gameOver: 'https://pouch.jumpshare.com/preview/QVt72GBh7Dc-arzcoC5BglYu41B1N-UQAVhQTKl78fX2OV1Cy1VKmxUZ0mOXjIT3vTGwQ1OMtnobYDxe2tmj2_hDRAcARWPM7or7HTO4gIDjWmJdB7aXrC3SjW8wSajWTkzOtukFKrhFIxQMXhV3qm6yjbN-I2pg_cnoHs_AmgI.mp3',
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const keysPressedRef = useRef<Record<string, boolean>>({});
  const animationFrameIdRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const gameTimeRef = useRef<number>(0);
  const lastMinuteCheckRef = useRef<number>(0);
  const playingAudioRef = useRef<HTMLAudioElement>(null);
  const gameOverAudioRef = useRef<HTMLAudioElement>(null);

  const objectSpeedRef = useRef(INITIAL_OBJECT_SPEED);
  const spawnIntervalRef = useRef(INITIAL_SPAWN_INTERVAL);

  useEffect(() => {
    const savedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
    if (savedHighScore) setHighScore(parseInt(savedHighScore, 10));
  }, []);

  const resetGame = useCallback(() => {
    if (!gameAreaRef.current) return;
    const bounds = gameAreaRef.current.getBoundingClientRect();

    setScore(0);
    setGameObjects([]);
    setPlayerPosition({
      x: (bounds.width - PLAYER_SIZE) / 2,
      y: bounds.height - PLAYER_SIZE - 10,
    });

    objectSpeedRef.current = INITIAL_OBJECT_SPEED;
    spawnIntervalRef.current = INITIAL_SPAWN_INTERVAL;
    lastUpdateTimeRef.current = performance.now();
    lastSpawnTimeRef.current = performance.now();
    gameTimeRef.current = 0;
    lastMinuteCheckRef.current = 0;

    setGameState(GameState.Playing);
  }, []);

  const handleGameOver = useCallback(() => {
    setGameState(GameState.GameOver);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem(HIGH_SCORE_KEY, score.toString());
    }
  }, [score, highScore]);

  const gameLoop = useCallback((currentTime: number) => {
    if (lastUpdateTimeRef.current === 0) lastUpdateTimeRef.current = currentTime;
    const deltaTime = currentTime - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = currentTime;
    gameTimeRef.current += deltaTime;

    if (!gameAreaRef.current) return;
    const bounds = gameAreaRef.current.getBoundingClientRect();

    objectSpeedRef.current *= SPEED_INCREASE_FACTOR;
    if (gameTimeRef.current - lastMinuteCheckRef.current >= 60000) {
      spawnIntervalRef.current *= SPAWN_RATE_INCREASE_FACTOR;
      lastMinuteCheckRef.current = gameTimeRef.current;
    }

    setPlayerPosition(prev => {
      let newX = prev.x;
      if (keysPressedRef.current['ArrowLeft'] || keysPressedRef.current['a']) newX -= PLAYER_SPEED;
      if (keysPressedRef.current['ArrowRight'] || keysPressedRef.current['d']) newX += PLAYER_SPEED;
      return { x: Math.max(0, Math.min(bounds.width - PLAYER_SIZE, newX)), y: prev.y };
    });

    if (currentTime - lastSpawnTimeRef.current > spawnIntervalRef.current) {
      lastSpawnTimeRef.current = currentTime;
      const newObject: GameObject = {
        id: currentTime,
        x: Math.random() * (bounds.width - OBJECT_SIZE),
        y: -OBJECT_SIZE,
        type: Math.random() < 0.7 ? 'coin' : 'enemy',
      };
      setGameObjects(prev => [...prev, newObject]);
    }

    const playerRect = { ...playerPosition, width: PLAYER_SIZE, height: PLAYER_SIZE };

    setGameObjects(prevObjects => {
      const updatedObjects: GameObject[] = [];
      let scoreToAdd = 0;

      for (const obj of prevObjects) {
        const newY = obj.y + objectSpeedRef.current;
        const objRect = { x: obj.x, y: newY, width: OBJECT_SIZE, height: OBJECT_SIZE };

        if (
          playerRect.x < objRect.x + objRect.width &&
          playerRect.x + playerRect.width > objRect.x &&
          playerRect.y < objRect.y + objRect.height &&
          playerRect.y + playerRect.height > objRect.y
        ) {
          if (obj.type === 'enemy') {
            handleGameOver();
            return [];
          } else {
            scoreToAdd++;
            continue;
          }
        }

        if (newY < bounds.height) updatedObjects.push({ ...obj, y: newY });
      }

      if (scoreToAdd > 0) setScore(s => s + scoreToAdd);

      return updatedObjects;
    });

    animationFrameIdRef.current = requestAnimationFrame(gameLoop);
  }, [playerPosition, handleGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressedRef.current[e.key] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressedRef.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState === GameState.Playing) animationFrameIdRef.current = requestAnimationFrame(gameLoop);
    else if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    return () => { if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current); };
  }, [gameState, gameLoop]);

  useEffect(() => {
    const playingAudio = playingAudioRef.current;
    const gameOverAudio = gameOverAudioRef.current;

    if (!playingAudio || !gameOverAudio) return;

    if (gameState === GameState.Playing) {
      gameOverAudio.pause();
      gameOverAudio.currentTime = 0;
      playingAudio.play().catch(error => console.error("Audio play failed. User interaction might be needed.", error));
    } else if (gameState === GameState.GameOver) {
      playingAudio.pause();
      playingAudio.currentTime = 0;
      gameOverAudio.play().catch(error => console.error("Audio play failed.", error));
    } else {
      playingAudio.pause();
      playingAudio.currentTime = 0;
      gameOverAudio.pause();
      gameOverAudio.currentTime = 0;
    }
  }, [gameState]);


  const startGame = () => {
    resetGame();
  };

  const getModal = () => {
    if (gameState === GameState.Playing) return null;

    const title = gameState === GameState.Start ? 'Avoid him!' : "You're dead";
    const buttonText = gameState === GameState.Start ? 'Start Game' : 'Restart';

    return (
      <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-10 p-4">
        <div className="bg-white p-8 rounded-lg text-black text-center shadow-2xl border-2 border-blue-900 max-w-sm w-full">
          <h1 className="text-4xl font-bold mb-4">{title}</h1>
          {gameState === GameState.GameOver && (
            <>
              <img src={GAME_OVER_IMAGE_URL} alt="Game Over" className="mx-auto mb-4 w-32 h-auto object-contain" />
              <p className="text-xl mb-2">Your Score: {score}</p>
            </>
          )}
          <p className="text-lg mb-6 text-gray-700">High Score: {highScore}</p>
          <button
            onClick={startGame}
            className="bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 px-6 rounded-lg text-xl transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-opacity-50"
          >
            {buttonText}
          </button>
          {gameState === GameState.Start && <p className="text-sm mt-6 text-gray-500">Use Arrow Keys or A/D to move.</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-white flex font-sans">
      <audio ref={playingAudioRef} src={AUDIO_TRACKS.playing} loop />
      <audio ref={gameOverAudioRef} src={AUDIO_TRACKS.gameOver} />
      <div className="w-16 md:w-24 bg-[#1635B9] flex-shrink-0" />
      <div className="flex-grow flex flex-col items-center justify-center p-2 sm:p-4">
        <div className="w-full max-w-4xl">
          <header className="flex justify-between items-center mb-4 text-gray-800">
            <h1 className="text-3xl font-bold text-blue-900">Avoid him!</h1>
            <div className="text-right">
              <p className="text-xl">Score: <span className="font-bold text-yellow-600">{score}</span></p>
              <p className="text-md text-gray-600">High Score: <span className="font-bold">{highScore}</span></p>
            </div>
          </header>
          <main ref={gameAreaRef} className="w-full aspect-[4/3] bg-white/50 backdrop-blur-sm border-2 border-blue-900 rounded-lg overflow-hidden relative shadow-2xl">
            {getModal()}
            {gameState === GameState.Playing && (
              <>
                <img src={PLAYER_IMAGE_URL} alt="Player" className="absolute" style={{ width: PLAYER_SIZE, height: PLAYER_SIZE, left: playerPosition.x, top: playerPosition.y }} />
                {gameObjects.map(obj => (
                  <img key={obj.id} src={obj.type === 'coin' ? COIN_IMAGE_URL : ENEMY_IMAGE_URL} alt={obj.type} className="absolute" style={{ width: OBJECT_SIZE, height: OBJECT_SIZE, left: obj.x, top: obj.y }} />
                ))}
              </>
            )}
          </main>
        </div>
      </div>
      <div className="w-16 md:w-24 bg-[#1635B9] flex-shrink-0" />
    </div>
  );
};

export default App;