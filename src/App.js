import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Route, Link, Routes } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Timer, List, Camera } from 'lucide-react';

// Teachable Machine model URL
const URL = "https://teachablemachine.withgoogle.com/models/DpUtnaiyW/";

const FocusButton = ({ onToggle, isActive }) => (
  <button
    onClick={onToggle}
    className={`font-bold py-4 px-8 rounded-full text-xl shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
      isActive
        ? "bg-gray-500 hover:bg-gray-600 text-white"
        : "bg-amber-700 hover:bg-amber-800 text-white"
    }`}
  >
    {isActive ? "Stop Focus" : "Start Focus"}
  </button>
);

const FocusTimer = ({ time }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className="text-4xl font-bold text-amber-800 mb-8"
  >
    {new Date(time * 1000).toISOString().substr(11, 8)}
  </motion.div>
);

const ErrorMessage = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: -50 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -50 }}
    className="text-red-600 font-bold mt-4"
  >
    {message}
  </motion.div>
);

const Scoreboard = ({ scores }) => (
  <div className="bg-amber-50 p-6 rounded-lg shadow-md">
    <h2 className="text-2xl font-bold mb-4 text-amber-800">Scoreboard</h2>
    <ul>
      {scores.map((score, index) => (
        <li key={index} className="mb-2 text-amber-700">
          {new Date(score * 1000).toISOString().substr(11, 8)}
        </li>
      ))}
    </ul>
  </div>
);

const Home = ({ onToggle, time, isActive, webcamError }) => {
  const canvasRef = useRef(null);
  const labelContainerRef = useRef(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-100">
      <div className="mb-8 text-2xl font-bold text-amber-800">Teachable Machine Pose Model</div>
      <AnimatePresence>
        {isActive && <FocusTimer time={time} />}
      </AnimatePresence>
      <FocusButton onToggle={onToggle} isActive={isActive} />
      <div className="mt-8 relative">
        <canvas ref={canvasRef} width="200" height="200" className="bg-gray-300"></canvas>
        {webcamError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera size={48} color="#4B5563" />
          </div>
        )}
      </div>
      <div ref={labelContainerRef} className="mt-4 text-amber-800"></div>
      <AnimatePresence>
        {webcamError && <ErrorMessage message="Camera not working" />}
      </AnimatePresence>
    </div>
  );
};

const App = () => {
  const [time, setTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [scores, setScores] = useState([]);
  const [focusValue, setFocusValue] = useState(1);
  const [model, setModel] = useState(null);
  const [webcam, setWebcam] = useState(null);
  const [maxPredictions, setMaxPredictions] = useState(0);
  const [webcamError, setWebcamError] = useState(false);

  const canvasRef = useRef(null);
  const labelContainerRef = useRef(null);

  useEffect(() => {
    // Load TensorFlow.js and Teachable Machine Pose libraries
    const loadScripts = async () => {
      await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js');
      await loadScript('https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8/dist/teachablemachine-pose.min.js');
    };
    loadScripts();
  }, []);

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  };

  const init = async () => {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    try {
      // Load the model and metadata
      const loadedModel = await window.tmPose.load(modelURL, metadataURL);
      setModel(loadedModel);
      setMaxPredictions(loadedModel.getTotalClasses());

      // Setup webcam
      const size = 200;
      const flip = true;
      const loadedWebcam = new window.tmPose.Webcam(size, size, flip);
      await loadedWebcam.setup();
      await loadedWebcam.play();
      setWebcam(loadedWebcam);

      // Start prediction loop
      window.requestAnimationFrame(loop);

      // Setup label container
      const labelContainer = labelContainerRef.current;
      for (let i = 0; i < loadedModel.getTotalClasses(); i++) {
        labelContainer.appendChild(document.createElement("div"));
      }

      setWebcamError(false);
    } catch (error) {
      console.error("Error initializing webcam:", error);
      setWebcamError(true);
      drawFallbackCanvas();
    }
  };

  const drawFallbackCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#D1D5DB";  // A light gray color
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const loop = async (timestamp) => {
    if (webcam) {
      webcam.update();
      await predict();
      window.requestAnimationFrame(loop);
    }
  };

  const predict = async () => {
    if (model && webcam) {
      const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
      const prediction = await model.predict(posenetOutput);

      const labelContainer = labelContainerRef.current;
      for (let i = 0; i < maxPredictions; i++) {
        const classPrediction = prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        labelContainer.childNodes[i].innerHTML = classPrediction;
      }

      drawPose(pose);
    }
  };

  const drawPose = (pose) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (webcam && webcam.canvas) {
      ctx.drawImage(webcam.canvas, 0, 0);
      if (pose) {
        const minPartConfidence = 0.5;
        window.tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
        window.tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
      }
    }
  };

  useEffect(() => {
    let interval = null;
    if (isActive && focusValue > 0) {
      interval = setInterval(() => {
        setTime((time) => time + 1);
      }, 1000);
    } else if (!isActive && time !== 0) {
      clearInterval(interval);
      if (scores.length === 0 || time > Math.max(...scores)) {
        setScores([...scores, time].sort((a, b) => b - a));
      }
    }
    return () => clearInterval(interval);
  }, [isActive, time, scores, focusValue]);

  const toggleFocus = () => {
    if (isActive) {
      setIsActive(false);
      setTime(0);  // Reset the timer when stopping
      if (webcam) {
        webcam.stop();
      }
    } else {
      setIsActive(true);
      setFocusValue(1);
      init();
    }
  };

  useEffect(() => {
    if (focusValue === 0) {
      setIsActive(false);
    }
  }, [focusValue]);

  return (
    <Router>
      <div className="font-sans">
        <nav className="bg-amber-200 p-4">
          <ul className="flex justify-center space-x-4">
            <li>
              <Link to="/" className="text-amber-800 hover:text-amber-900 flex items-center">
                <Timer className="mr-1" /> Home
              </Link>
            </li>
            <li>
              <Link to="/scoreboard" className="text-amber-800 hover:text-amber-900 flex items-center">
                <List className="mr-1" /> Scoreboard
              </Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/" element={<Home onToggle={toggleFocus} time={time} isActive={isActive} webcamError={webcamError} />} />
          <Route path="/scoreboard" element={<Scoreboard scores={scores} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;