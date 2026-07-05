import { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const ROAD_WIDTH = width * 0.8;
const LANE_WIDTH = ROAD_WIDTH / 3;
const CAR_WIDTH = 40;
const CAR_HEIGHT = 70;
const ROAD_HEIGHT = height * 0.45;
const CAR_BOTTOM_OFFSET = 20;

const LANE_POSITIONS = [
  (LANE_WIDTH - CAR_WIDTH) / 2,
  LANE_WIDTH + (LANE_WIDTH - CAR_WIDTH) / 2,
  LANE_WIDTH * 2 + (LANE_WIDTH - CAR_WIDTH) / 2,
];

const VEHICLE_WIDTH = 40;
const VEHICLE_HEIGHT = 70;
const VEHICLE_SPEED = 6;
const TICK_RATE = 30;
const CAR_TOP = ROAD_HEIGHT - CAR_BOTTOM_OFFSET - CAR_HEIGHT;
const HIGH_SCORE_KEY = '@traffic_dodger_high_score';

// Vehicle "types" - each with its own color and slightly different size,
// so oncoming traffic feels varied instead of always looking identical.
const VEHICLE_TYPES = [
  { name: 'car', color: '#a855f7', height: VEHICLE_HEIGHT },
  { name: 'truck', color: '#f97316', height: VEHICLE_HEIGHT * 1.2 },
  { name: 'van', color: '#22c55e', height: VEHICLE_HEIGHT * 0.9 },
];

function getRandomLane() {
  return Math.floor(Math.random() * 3);
}

function getRandomVehicleType() {
  return VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
}

function createNewVehicle() {
  return {
    lane: getRandomLane(),
    y: -VEHICLE_HEIGHT,
    vehicleType: getRandomVehicleType(),
  };
}

export default function App() {
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentLane, setCurrentLane] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [vehicle, setVehicle] = useState(createNewVehicle());

  const gameOverRef = useRef(false);
  const currentLaneRef = useRef(1);

  // Animated value that smoothly slides the car between lanes
  const carLeftAnim = useRef(new Animated.Value(LANE_POSITIONS[1])).current;

  // ---- LOAD HIGH SCORE WHEN APP STARTS ----
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const savedValue = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (savedValue !== null) {
          setHighScore(parseInt(savedValue, 10));
        }
      } catch (error) {
        console.log('Error loading high score:', error);
      }
    };
    loadHighScore();
  }, []);

  // ---- SAVE HIGH SCORE WHENEVER THE GAME ENDS WITH A NEW RECORD ----
  useEffect(() => {
    if (gameOver && score > highScore) {
      setHighScore(score);
      AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString()).catch((error) =>
        console.log('Error saving high score:', error)
      );
    }
  }, [gameOver]);

  // ---- ANIMATE THE CAR SLIDING TO ITS NEW LANE ----
  useEffect(() => {
    Animated.timing(carLeftAnim, {
      toValue: LANE_POSITIONS[currentLane],
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [currentLane]);

  const handleStartGame = () => {
    setScore(0);
    setCurrentLane(1);
    currentLaneRef.current = 1;
    setGameOver(false);
    gameOverRef.current = false;
    setVehicle(createNewVehicle());
    carLeftAnim.setValue(LANE_POSITIONS[1]);
  };

  const moveLeft = () => {
    if (gameOverRef.current) return;
    setCurrentLane((prevLane) => {
      const newLane = prevLane === 0 ? prevLane : prevLane - 1;
      currentLaneRef.current = newLane;
      return newLane;
    });
  };

  const moveRight = () => {
    if (gameOverRef.current) return;
    setCurrentLane((prevLane) => {
      const newLane = prevLane === 2 ? prevLane : prevLane + 1;
      currentLaneRef.current = newLane;
      return newLane;
    });
  };

  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (gameOverRef.current) return;

      setVehicle((prevVehicle) => {
        const newY = prevVehicle.y + VEHICLE_SPEED;
        const vehicleHeight = prevVehicle.vehicleType.height;

        const sameLane = prevVehicle.lane === currentLaneRef.current;
        const verticalOverlap =
          newY + vehicleHeight > CAR_TOP && newY < CAR_TOP + CAR_HEIGHT;

        if (sameLane && verticalOverlap) {
          setGameOver(true);
          gameOverRef.current = true;
          return prevVehicle;
        }

        if (newY > ROAD_HEIGHT) {
          setScore((prevScore) => prevScore + 1);
          return createNewVehicle();
        }

        return { ...prevVehicle, y: newY };
      });
    }, TICK_RATE);

    return () => clearInterval(gameLoop);
  }, []);

  return (
    <LinearGradient colors={['#1e1b4b', '#0f172a']} style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.title}>Traffic Dodger</Text>

      <View style={styles.scoreRow}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>Best</Text>
          <Text style={styles.scoreValue}>{highScore}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleStartGame}>
        <Text style={styles.buttonText}>
          {gameOver ? 'Restart Game' : 'Start Game'}
        </Text>
      </TouchableOpacity>

      <LinearGradient
        colors={['#52525b', '#27272a']}
        style={styles.road}
      >
        <View style={[styles.laneDivider, { left: LANE_WIDTH }]} />
        <View style={[styles.laneDivider, { left: LANE_WIDTH * 2 }]} />

        {/* Oncoming vehicle */}
        <View
          style={[
            styles.vehicle,
            {
              left: LANE_POSITIONS[vehicle.lane],
              top: vehicle.y,
              height: vehicle.vehicleType.height,
              backgroundColor: vehicle.vehicleType.color,
            },
          ]}
        >
          <View style={styles.vehicleHeadlightRow}>
            <View style={styles.headlight} />
            <View style={styles.headlight} />
          </View>
        </View>

        {/* Player's car - now an Animated.View for smooth sliding */}
        <Animated.View style={[styles.car, { left: carLeftAnim }]}>
          <View style={styles.windshield} />
          <View style={styles.headlightRowPlayer}>
            <View style={styles.playerHeadlight} />
            <View style={styles.playerHeadlight} />
          </View>
        </Animated.View>

        {gameOver && (
          <View style={styles.gameOverOverlay}>
            <Text style={styles.gameOverText}>GAME OVER</Text>
            <Text style={styles.finalScoreText}>Final Score: {score}</Text>
            {score >= highScore && score > 0 && (
              <Text style={styles.newRecordText}>New High Score! 🎉</Text>
            )}
          </View>
        )}
      </LinearGradient>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={moveLeft}>
          <Text style={styles.controlButtonText}>◀ Move Left</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={moveRight}>
          <Text style={styles.controlButtonText}>Move Right ▶</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  scoreBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  button: {
    backgroundColor: '#38bdf8',
    paddingVertical: 14,
    paddingHorizontal: 44,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },

  road: {
    width: ROAD_WIDTH,
    height: ROAD_HEIGHT,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  laneDivider: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: '100%',
    backgroundColor: '#fbbf24',
    opacity: 0.7,
  },

  car: {
    position: 'absolute',
    bottom: CAR_BOTTOM_OFFSET,
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  windshield: {
    width: CAR_WIDTH * 0.6,
    height: 18,
    backgroundColor: '#93c5fd',
    borderRadius: 3,
  },
  headlightRowPlayer: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    width: CAR_WIDTH,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  playerHeadlight: {
    width: 8,
    height: 5,
    backgroundColor: '#fef08a',
    borderRadius: 2,
  },

  vehicle: {
    position: 'absolute',
    width: VEHICLE_WIDTH,
    borderRadius: 8,
    justifyContent: 'flex-end',
  },
  vehicleHeadlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  headlight: {
    width: 8,
    height: 5,
    backgroundColor: '#fef9c3',
    borderRadius: 2,
  },

  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 12,
  },
  finalScoreText: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 8,
  },
  newRecordText: {
    fontSize: 16,
    color: '#fbbf24',
    fontWeight: '600',
  },

  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: ROAD_WIDTH,
    marginTop: 20,
  },
  controlButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});